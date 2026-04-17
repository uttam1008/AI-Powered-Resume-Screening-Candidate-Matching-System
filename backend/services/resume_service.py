"""
services/resume_service.py — Business logic for Resume uploading, text extraction, and parsing.
"""
import json
import os
import uuid
from pathlib import Path

import structlog
from fastapi import UploadFile
from sqlalchemy import select, func, String
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exceptions import BadRequestException, NotFoundException
from llm.gemini_client import gemini_client
from llm.prompts import RESUME_PARSE_PROMPT
from models.resume import Resume
from models.resume_chunk import ResumeChunk
from utils.file_parser import extract_resume_text
from utils.text_chunker import chunk_text

logger = structlog.get_logger(__name__)


class ResumeService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        # Ensure upload dir exists
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    async def get_all(self, page: int = 1, size: int = 20, job_role_id: uuid.UUID | None = None) -> dict:
        from models.match_result import MatchResult
        from sqlalchemy import select, func, desc

        offset = (page - 1) * size
        
        # Base count statement
        count_stmt = select(func.count(Resume.id))
        
        # Query for Resumes
        # We perform a Left Outer Join with MatchResult to get scores if they exist
        if job_role_id:
            # If job_role_id is filtered, we want the score for THAT specific job
            stmt = (
                select(Resume, MatchResult.match_score, MatchResult.status)
                .outerjoin(MatchResult, (MatchResult.resume_id == Resume.id) & (MatchResult.job_role_id == job_role_id))
                .where(Resume.job_role_id == job_role_id)
                .order_by(Resume.created_at.desc())
                .offset(offset)
                .limit(size)
            )
            count_stmt = count_stmt.where(Resume.job_role_id == job_role_id)
        else:
            # Global view: We want the BEST (Max) ATS score achieved across any job
            # Subquery to get max score per resume
            subq = (
                select(MatchResult.resume_id, func.max(MatchResult.match_score).label("max_score"))
                .group_by(MatchResult.resume_id)
                .subquery()
            )
            stmt = (
                select(Resume, subq.c.max_score, func.cast(None, String).label("status"))
                .outerjoin(subq, subq.c.resume_id == Resume.id)
                .order_by(Resume.created_at.desc())
                .offset(offset)
                .limit(size)
            )

        total_q = await self.db.execute(count_stmt)
        total = total_q.scalar_one()

        result = await self.db.execute(stmt)
        rows = result.all()
        
        items = []
        for row in rows:
            res = row.Resume
            # Map join results to the resume object for schema serialization
            res.ats_score = float(row[1]) if row[1] is not None else None
            res.match_status = row[2] if len(row) > 2 else None
            items.append(res)

        return {
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "pages": max(1, (total + size - 1) // size),
        }

    async def get_by_id(self, resume_id: uuid.UUID) -> Resume:
        result = await self.db.execute(select(Resume).where(Resume.id == resume_id))
        resume = result.scalar_one_or_none()
        if not resume:
            raise NotFoundException("Resume")
        return resume

    async def upload_and_parse(
        self,
        file: UploadFile,
        candidate_name: str | None = None,
        candidate_email: str | None = None,
        candidate_phone: str | None = None,
        job_role_id: uuid.UUID | None = None,
    ) -> Resume:
        """Handle physical file saving, text extraction, LLM parsing, and DB storage."""
        
        # 1. Validate extension
        ext = Path(file.filename).suffix.lower().lstrip(".")
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise BadRequestException(f"Invalid file type. Allowed: {settings.ALLOWED_EXTENSIONS}")

        file_bytes = await file.read()
        
        # Validate size (10MB)
        if len(file_bytes) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
            raise BadRequestException(f"File too large. Max {settings.MAX_FILE_SIZE_MB}MB.")

        # 2. Save physical file
        unique_filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        with open(file_path, "wb") as f:
            f.write(file_bytes)

        # 3. Extract text
        raw_text = extract_resume_text(file_bytes, file.filename)
        
        skills = []
        exp_years = 0
        education = ""
        
        # 4. Use LLM to extract structured fields if we have text
        if raw_text:
            try:
                prompt = RESUME_PARSE_PROMPT.format(resume_text=raw_text)
                llm_response = await gemini_client.generate(prompt)
                # Cleanup JSON block if markdown fences are present
                clean_json = llm_response.replace("```json", "").replace("```", "").strip()
                parsed = json.loads(clean_json)
                skills = parsed.get("skills", [])
                exp_years = int(parsed.get("experience_years", 0))
                education = parsed.get("education", "")
                
                # Use extracted ones if not provided manually
                candidate_name = candidate_name or parsed.get("name")
                candidate_email = candidate_email or parsed.get("email")
                candidate_phone = candidate_phone or parsed.get("phone")
                
            except Exception as e:
                logger.warning("resume.llm_parse_error", error=str(e), file_name=file.filename)

        # Fallbacks to prevent NotNullViolationError on database insertion
        candidate_name = candidate_name or "Unknown Candidate"
        candidate_email = candidate_email or "unknown@example.com"

        # 5. Save Resume to database
        resume = Resume(
            job_role_id=job_role_id,
            candidate_name=candidate_name,
            candidate_email=candidate_email,
            candidate_phone=candidate_phone,
            file_url=file_path,
            file_name=file.filename,
            file_type=ext,
            raw_text=raw_text,
            skills=skills,
            experience_years=exp_years,
            education=education
        )
        self.db.add(resume)
        await self.db.flush()  # DB assigns resume.id
        
        # 6. Chunking and Embedding (pgvector RAG)
        if raw_text:
            chunks = chunk_text(raw_text, chunk_size=1500, overlap=300)
            
            for idx, chunk_content in enumerate(chunks):
                try:
                    # Generate pgvector 768-dim embedding using Gemini API
                    embedding_vector = await gemini_client.embed(chunk_content)
                    
                    db_chunk = ResumeChunk(
                        resume_id=resume.id,
                        chunk_index=idx,
                        text=chunk_content,
                        embedding=embedding_vector
                    )
                    self.db.add(db_chunk)
                except Exception as e:
                    logger.warning("resume.llm_embed_error", error=str(e), file_name=file.filename, chunk_index=idx)
            
            if chunks:
                logger.info("resume.chunked", resume_id=str(resume.id), chunks=len(chunks))

        await self.db.commit()
        await self.db.refresh(resume)
        
        logger.info("resume.uploaded_and_processed", resume_id=str(resume.id))
        return resume

    async def delete(self, resume_id: uuid.UUID) -> None:
        """Delete a resume record (cascade deletes chunks via FK)."""
        resume = await self.get_by_id(resume_id)
        await self.db.delete(resume)
        await self.db.commit()
        logger.info("resume.deleted", resume_id=str(resume_id))
