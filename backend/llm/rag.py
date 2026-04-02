"""
llm/rag.py — RAG Retrieval Service.

Pipeline:
  1. Embed the job description query via Gemini text-embedding-004
  2. Run pgvector cosine-distance ANN search on resume_chunks (HNSW index)
  3. Group matching chunks by their parent Resume (deduplicate)
  4. Return ranked, unique Resume records with their best-matching chunks
"""
import uuid
from dataclasses import dataclass
from typing import List, Optional

import structlog
from pgvector.sqlalchemy import Vector
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.config import settings
from llm.gemini_client import gemini_client
from models.resume import Resume
from models.resume_chunk import ResumeChunk

logger = structlog.get_logger(__name__)


@dataclass
class ChunkHit:
    """Represents a single chunk match from pgvector similarity search."""
    chunk_id: uuid.UUID
    resume_id: uuid.UUID
    chunk_index: int
    text: str
    cosine_distance: float

    @property
    def similarity_score(self) -> float:
        """Convert cosine distance [0, 2] → similarity [0, 1]"""
        return round(1.0 - self.cosine_distance, 4)


@dataclass
class ResumeMatch:
    """A ranked Resume and its top matching chunks for a job description query."""
    resume: Resume
    top_chunks: List[ChunkHit]
    best_score: float           # highest chunk similarity score
    avg_score: float            # average across matched chunks


class RagService:
    """Stateless RAG retrieval service — embed, search, deduplicate, return."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def retrieve_for_job(
        self,
        job_role_id: Optional[uuid.UUID] = None,
        query_text: Optional[str] = None,
        query_embedding: Optional[List[float]] = None,
        top_k_chunks: int = 50,
        top_k_resumes: int = 10,
    ) -> List[ResumeMatch]:
        """
        Retrieve the most relevant Resumes for a job description.

        Args:
            job_role_id:       If provided, use the stored embedding from the JobRole row.
            query_text:        If provided (no job_role_id), generate an ad-hoc embedding.
            query_embedding:   Supply a pre-computed embedding directly.
            top_k_chunks:      How many raw chunk hits to retrieve via ANN search.
            top_k_resumes:     Max unique resumes to return after deduplication.

        Returns:
            List[ResumeMatch] sorted by best_score descending.
        """
        # ── 1. Resolve embedding ─────────────────────────────────────────────
        embedding = await self._resolve_embedding(
            job_role_id, query_text, query_embedding
        )
        if embedding is None:
            raise ValueError("Provide one of: job_role_id, query_text, or query_embedding")

        # ── 2. ANN search on resume_chunks using pgvector cosine distance ────
        chunk_hits = await self._search_chunks(embedding, top_k_chunks)
        if not chunk_hits:
            logger.info("rag.no_chunks_found")
            return []

        # ── 3. Deduplicate: group by resume_id, keep closest distance ────────
        resume_matches = self._group_by_resume(chunk_hits, top_k_resumes)

        # ── 4. Eagerly load Resume objects for the matched IDs ────────────────
        resume_ids = [rm["resume_id"] for rm in resume_matches]
        result = await self.db.execute(
            select(Resume).where(Resume.id.in_(resume_ids))
        )
        resume_map: dict[uuid.UUID, Resume] = {r.id: r for r in result.scalars().all()}

        # ── 5. Build final sorted output ─────────────────────────────────────
        output: List[ResumeMatch] = []
        for rm in resume_matches:
            resume = resume_map.get(rm["resume_id"])
            if resume is None:
                continue
            output.append(
                ResumeMatch(
                    resume=resume,
                    top_chunks=rm["chunks"],
                    best_score=rm["best_score"],
                    avg_score=rm["avg_score"],
                )
            )

        logger.info("rag.retrieved", resumes=len(output), chunks=len(chunk_hits))
        return output

    # ── Private helpers ───────────────────────────────────────────────────────

    async def _resolve_embedding(
        self,
        job_role_id: Optional[uuid.UUID],
        query_text: Optional[str],
        precomputed: Optional[List[float]],
    ) -> Optional[List[float]]:
        if precomputed:
            return precomputed

        if job_role_id:
            from models.job_role import JobRole
            result = await self.db.execute(
                select(JobRole.embedding).where(JobRole.id == job_role_id)
            )
            row = result.scalar_one_or_none()
            if row is not None:
                logger.info("rag.using_job_role_embedding", job_role_id=str(job_role_id))
                return list(row)   # pgvector returns a numpy array / list

        if query_text:
            logger.info("rag.embedding_query_text")
            return await gemini_client.embed(query_text)

        return None

    async def _search_chunks(
        self, embedding: List[float], top_k: int
    ) -> List[ChunkHit]:
        """
        Use pgvector's <=> (cosine distance) operator with SQLAlchemy .
        Requires: resume_chunks.embedding column is vector(768) with HNSW index.
        """
        # Build a Vector literal for the distance expression
        from sqlalchemy import func, cast, literal
        from pgvector.sqlalchemy import Vector as PgVector

        embedding_literal = cast(embedding, PgVector(settings.EMBEDDING_DIMENSIONS))

        # cosine_distance = embedding <=> query_vector
        distance_col = ResumeChunk.embedding.cosine_distance(embedding_literal).label("distance")

        stmt = (
            select(
                ResumeChunk.id,
                ResumeChunk.resume_id,
                ResumeChunk.chunk_index,
                ResumeChunk.text,
                distance_col,
            )
            .where(ResumeChunk.embedding.isnot(None))
            .order_by(distance_col)
            .limit(top_k)
        )

        result = await self.db.execute(stmt)
        rows = result.all()

        return [
            ChunkHit(
                chunk_id=row.id,
                resume_id=row.resume_id,
                chunk_index=row.chunk_index,
                text=row.text,
                cosine_distance=float(row.distance),
            )
            for row in rows
        ]

    def _group_by_resume(
        self, hits: List[ChunkHit], top_k_resumes: int
    ) -> List[dict]:
        """
        Group ChunkHits by resume_id and compute best + avg similarity scores.
        Returns list sorted by best_score desc, limited to top_k_resumes.
        """
        grouped: dict[uuid.UUID, list[ChunkHit]] = {}
        for hit in hits:
            grouped.setdefault(hit.resume_id, []).append(hit)

        result = []
        for resume_id, chunks in grouped.items():
            scores = [c.similarity_score for c in chunks]
            result.append({
                "resume_id": resume_id,
                "chunks": sorted(chunks, key=lambda c: c.cosine_distance),
                "best_score": max(scores),
                "avg_score": round(sum(scores) / len(scores), 4),
            })

        # Sort by best_score descending
        result.sort(key=lambda r: r["best_score"], reverse=True)
        return result[:top_k_resumes]
