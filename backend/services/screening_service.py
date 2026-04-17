"""
services/screening_service.py — Full Job↔Resume Matching Pipeline.

Pipeline steps:
  1. Fetch JobRole by ID
  2. RAG: retrieve top-k matching resume chunks from pgvector (cosine ANN)
  3. For each Resume, assemble chunk context and call Gemini LLM
  4. Parse JSON response: match_score, matched_skills, missing_skills, explanation
  5. Upsert MatchResult (unique per job_role + resume)
  6. Return sorted MatchResult list
"""
import asyncio
import json
import uuid
import os
import shutil
import re
from pathlib import Path
from typing import Optional

import structlog
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundException
from core.config import settings
from llm.gemini_client import gemini_client
from llm.prompts import SCREENING_PROMPT
from llm.rag import RagService
from models.job_role import JobRole
from models.match_result import MatchResult
from models.resume import Resume

logger = structlog.get_logger(__name__)

# Maximum number of top chunks to include per resume in the prompt context
MAX_CONTEXT_CHUNKS = 5


class ScreeningService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.rag = RagService(db)

    # ── Main Pipeline ─────────────────────────────────────────────────────────

    async def run_screening(
        self, job_role_id: uuid.UUID, top_k: int = 10
    ) -> list[MatchResult]:
        """
        End-to-end Job↔Resume matching pipeline.
        Returns a list of MatchResult objects sorted by match_score DESC.
        """

        # ── Step 1: Fetch Job Role ─────────────────────────────────────────────
        job = await self._get_job_role(job_role_id)
        logger.info("screening.start", job_id=str(job.id), top_k=top_k)

        # ── Step 2: RAG Retrieval ──────────────────────────────────────────────
        # Reuses the pre-computed embedding stored on the job_roles row.
        # RagService searches resume_chunks via pgvector cosine distance (HNSW index).
        resume_matches = await self.rag.retrieve_for_job(
            job_role_id=job_role_id,
            top_k_chunks=top_k * 5,    # wider net at chunk level → dedup to resume level
            top_k_resumes=top_k,
        )
        logger.info("screening.resumes_retrieved", count=len(resume_matches))

        job_description_text = (
            f"Title: {job.title}\n"
            f"Department: {job.department or 'N/A'}\n"
            f"Description: {job.description}\n"
            f"Requirements: {job.requirements}"
        )

        async def _evaluate_resume(rm):
            resume = rm.resume
            context_text = "\n\n---\n\n".join(
                c.text for c in rm.top_chunks[:MAX_CONTEXT_CHUNKS]
            )
            resume_context = context_text or resume.raw_text or ""
            prompt = SCREENING_PROMPT.format(
                job_description=job_description_text,
                resume_chunks=resume_context,
            )
            raw_response = await gemini_client.generate(prompt)
            parsed = self._parse_llm_response(raw_response, resume.id)
            return resume, parsed, raw_response

        # ── Step 3 & 4: Evaluate all candidates concurrently ──────────────
        eval_tasks = [_evaluate_resume(rm) for rm in resume_matches]
        eval_results = await asyncio.gather(*eval_tasks, return_exceptions=True)

        results: list[tuple[MatchResult, Resume]] = []
        last_error = None
        for eval_res in eval_results:
            if isinstance(eval_res, Exception):
                logger.error("screening.evaluation_error", error=str(eval_res))
                last_error = eval_res
                continue
            
            resume, parsed, raw_response = eval_res
            if parsed is None:
                continue
            
            # ── Step 5: Upsert MatchResult ────────────────────────────────────
            mr = await self._upsert_match_result(job, resume.id, parsed, raw_response)
            results.append((mr, resume))
            
        if last_error and not results:
            raise last_error

        await self.db.flush()
        
        # Prevent MissingGreenlet during FastAPI serialization by refreshing and restoring relationships
        final_results = []
        for mr, resume in results:
            await self.db.refresh(mr)
            mr.resume = resume
            final_results.append(mr)
            
            # Organize file
            self._organize_resume_file(mr, resume, job)

        logger.info("screening.complete", results_count=len(final_results))

        # Return sorted by match_score DESC
        return sorted(final_results, key=lambda r: r.match_score, reverse=True)

    # ── Read Queries ──────────────────────────────────────────────────────────

    async def get_by_job_role(self, job_role_id: uuid.UUID) -> list[MatchResult]:
        """Return all MatchResults for a job role, sorted by match_score DESC."""
        result = await self.db.execute(
            select(MatchResult)
            .options(joinedload(MatchResult.resume))
            .where(MatchResult.job_role_id == job_role_id)
            .order_by(MatchResult.match_score.desc())
        )
        return result.scalars().all()

    async def get_by_id(self, result_id: uuid.UUID) -> MatchResult:
        result = await self.db.execute(
            select(MatchResult)
            .options(joinedload(MatchResult.resume), joinedload(MatchResult.job_role))
            .where(MatchResult.id == result_id)
        )
        mr = result.scalar_one_or_none()
        if not mr:
            raise NotFoundException("MatchResult")
        return mr

    async def update_status(self, result_id: uuid.UUID, new_status: str) -> MatchResult:
        """Allow HR to manually override the decision status."""
        mr = await self.get_by_id(result_id)
        mr.status = new_status
        await self.db.flush()
        logger.info("screening.status_updated", result_id=str(result_id), new_status=new_status)
        
        # Trigger file reorganization with new status
        if mr.resume and mr.job_role:
            self._organize_resume_file(mr, mr.resume, mr.job_role)
            
        return mr

    # ── Private Helpers ───────────────────────────────────────────────────────

    def _organize_resume_file(self, mr: MatchResult, resume: Resume, job: JobRole):
        """Copies and renames resumes into job_role specific folders."""
        try:
            source_path = os.path.join(settings.UPLOAD_DIR, resume.file_name)
            if not os.path.exists(source_path):
                logger.warning("screening.organize.missing_source", path=source_path)
                return

            safe_job_title = re.sub(r'[^a-zA-Z0-9_\- ]', '', job.title).strip()
            # Ensure ROOT/organized_resumes exists explicitly because it relies on base settings
            os.makedirs(settings.ORGANIZED_RESUMES_DIR, exist_ok=True)
            job_dir = os.path.join(settings.ORGANIZED_RESUMES_DIR, safe_job_title)
            os.makedirs(job_dir, exist_ok=True)

            safe_name = re.sub(r'[^a-zA-Z0-9_\- ]', '', resume.candidate_name).strip()
            safe_name = safe_name.replace(" ", "_").lower()
            safe_job_folder = safe_job_title.replace(" ", "_").lower()
            ext = Path(resume.file_name).suffix.lower()

            dest_filename = f"{safe_name}_{safe_job_folder}_{mr.status}{ext}"
            dest_path = os.path.join(job_dir, dest_filename)

            # Cleanup older status files for this exact candidate & role
            prefix = f"{safe_name}_{safe_job_folder}_"
            for existing_file in os.listdir(job_dir):
                if existing_file.startswith(prefix) and existing_file != dest_filename:
                    old_path = os.path.join(job_dir, existing_file)
                    try:
                        os.remove(old_path)
                    except Exception:
                        pass

            shutil.copy2(source_path, dest_path)
            logger.info("screening.organize.success", dest=dest_path)
        except Exception as e:
            logger.error("screening.organize.failed", error=str(e))

    async def _get_job_role(self, job_role_id: uuid.UUID) -> JobRole:
        result = await self.db.execute(
            select(JobRole).where(JobRole.id == job_role_id)
        )
        job = result.scalar_one_or_none()
        if not job:
            raise NotFoundException("JobRole")
        return job

    def _parse_llm_response(
        self, raw_response: str, resume_id: uuid.UUID
    ) -> Optional[dict]:
        """Strip Markdown fences and parse Gemini JSON response."""
        try:
            clean = raw_response.replace("```json", "").replace("```", "").strip()
            return json.loads(clean)
        except json.JSONDecodeError:
            logger.warning("screening.parse_error", resume_id=str(resume_id))
            return None

    async def _upsert_match_result(
        self,
        job_role: JobRole,
        resume_id: uuid.UUID,
        parsed: dict,
        raw_response: str,
    ) -> MatchResult:
        """Insert or update a MatchResult row."""
        score = min(max(float(parsed.get("match_score", 0)), 0), 100)
        explanation = parsed.get("explanation") or parsed.get("gemini_summary")
        matched_skills = parsed.get("matched_skills") or parsed.get("strengths", [])
        missing_skills = parsed.get("missing_skills") or parsed.get("weaknesses", [])
        
        # Auto-decision engine
        decision_status = "hire" if score >= job_role.hiring_threshold else "reject"

        existing_q = await self.db.execute(
            select(MatchResult).where(
                MatchResult.job_role_id == job_role.id,
                MatchResult.resume_id == resume_id,
            )
        )
        existing = existing_q.scalar_one_or_none()

        if existing:
            existing.match_score = score
            existing.gemini_summary = explanation
            existing.strengths = matched_skills
            existing.weaknesses = missing_skills
            existing.status = decision_status
            existing.raw_llm_response = raw_response
            return existing

        mr = MatchResult(
            job_role_id=job_role.id,
            resume_id=resume_id,
            match_score=score,
            gemini_summary=explanation,
            strengths=matched_skills,
            weaknesses=missing_skills,
            status=decision_status,
            raw_llm_response=raw_response,
        )
        self.db.add(mr)
        return mr
