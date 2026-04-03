"""
api/v1/routes/rag.py — RAG retrieval endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status

from api.v1.dependencies import get_rag_service
from llm.rag import RagService, ResumeMatch
from schemas.rag import (
    ChunkHitSchema,
    RagQueryRequest,
    RagQueryResponse,
    ResumeMatchSchema,
)
from schemas.resume import ResumeResponse

router = APIRouter()


def _map_result(match: ResumeMatch) -> ResumeMatchSchema:
    return ResumeMatchSchema(
        resume=ResumeResponse.model_validate(match.resume),
        top_chunks=[
            ChunkHitSchema(
                chunk_id=c.chunk_id,
                chunk_index=c.chunk_index,
                text=c.text,
                similarity_score=c.similarity_score,
            )
            for c in match.top_chunks
        ],
        best_score=match.best_score,
        avg_score=match.avg_score,
    )


@router.post(
    "/search",
    response_model=RagQueryResponse,
    summary="Retrieve top matching resumes for a job description",
)
async def rag_search(
    payload: RagQueryRequest,
    service: RagService = Depends(get_rag_service),
):
    """
    Embed a job description and return the most semantically relevant
    resumes by searching `resume_chunks` with pgvector cosine distance.

    Provide ONE of:
    - **job_role_id**: reuses the stored `job_roles.embedding` (fastest)
    - **query_text**: generates an embedding on-the-fly via Gemini API
    """
    if not payload.job_role_id and not payload.query_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide either 'job_role_id' or 'query_text'.",
        )

    matches = await service.retrieve_for_job(
        job_role_id=payload.job_role_id,
        query_text=payload.query_text,
        top_k_chunks=payload.top_k_chunks,
        top_k_resumes=payload.top_k_resumes,
    )

    return RagQueryResponse(
        query_used="job_role" if payload.job_role_id else "query_text",
        total_matches=len(matches),
        results=[_map_result(m) for m in matches],
    )
