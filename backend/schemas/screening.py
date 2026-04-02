"""schemas/screening.py — Pydantic schemas for the full Matching Pipeline."""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, TypeVar, Generic

T = TypeVar("T")

from pydantic import BaseModel, Field


class ResumeBrief(BaseModel):
    id: uuid.UUID
    candidate_name: str
    candidate_email: str
    file_url: str

    model_config = {"from_attributes": True}

class MatchResultResponse(BaseModel):
    """The complete match result returned from the pipeline."""
    id: uuid.UUID
    job_role_id: uuid.UUID
    resume_id: uuid.UUID

    # Scores
    match_score: Decimal = Field(..., ge=0, le=100, description="LLM match score 0-100")

    # Skills breakdown — mapped from MatchResult columns via aliases
    matched_skills: Optional[List[str]] = Field(None, alias="strengths")
    missing_skills: Optional[List[str]] = Field(None, alias="weaknesses")
    explanation: Optional[str] = Field(None, alias="gemini_summary")

    status: str
    created_at: datetime
    
    # Eagerly loaded relations
    resume: ResumeBrief

    model_config = {"from_attributes": True, "populate_by_name": True}


# Backwards-compat alias used in older routes
ScreeningResultResponse = MatchResultResponse


class StatusOverrideRequest(BaseModel):
    status: str = Field(..., description="E.g., hire, reject, pending")


class ScreeningRunRequest(BaseModel):
    """Optional body for POST /screening/run/{job_id}."""
    top_k: int = Field(10, ge=1, le=50)
    force_rerun: bool = False


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int
