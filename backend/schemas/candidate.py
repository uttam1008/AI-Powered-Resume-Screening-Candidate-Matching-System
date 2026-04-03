"""
schemas/candidate.py — Pydantic schemas for Candidate request/response.
"""
import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr


class CandidateResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    phone: Optional[str]
    skills: Optional[List[str]]
    experience_years: int
    education: Optional[str]
    resume_url: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CandidateUploadResponse(BaseModel):
    """Returned after resume upload + parsing."""
    candidate: CandidateResponse
    parsed_successfully: bool
    message: str
