"""
schemas/rag.py — Pydantic schemas for RAG retrieval results.
"""
import uuid
from typing import List, Optional

from pydantic import BaseModel, Field

from schemas.resume import ResumeResponse


class ChunkHitSchema(BaseModel):
    chunk_id: uuid.UUID
    chunk_index: int
    text: str
    similarity_score: float = Field(..., ge=0.0, le=1.0)


class ResumeMatchSchema(BaseModel):
    resume: ResumeResponse
    top_chunks: List[ChunkHitSchema]
    best_score: float = Field(..., ge=0.0, le=1.0)
    avg_score: float = Field(..., ge=0.0, le=1.0)


class RagQueryRequest(BaseModel):
    """
    Request body for an ad-hoc RAG search. Provide exactly one of:
    - job_role_id: uses the pre-computed job embedding from DB
    - query_text: embeds on-the-fly using Gemini
    """
    job_role_id: Optional[uuid.UUID] = None
    query_text: Optional[str] = Field(None, min_length=10)
    top_k_chunks: int = Field(50, ge=5, le=200)
    top_k_resumes: int = Field(10, ge=1, le=50)


class RagQueryResponse(BaseModel):
    query_used: str    # 'job_role' | 'query_text'
    total_matches: int
    results: List[ResumeMatchSchema]
