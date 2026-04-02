"""
schemas/resume.py — Pydantic schemas for Resumes.
"""
import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class ResumeResponse(BaseModel):
    id: uuid.UUID
    job_role_id: Optional[uuid.UUID]
    candidate_name: str
    candidate_email: EmailStr
    candidate_phone: Optional[str]
    file_url: str
    file_name: str
    file_type: str
    raw_text: Optional[str]
    skills: Optional[List[str]]
    experience_years: int
    education: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ResumeUploadResponse(BaseModel):
    """Returned after resume upload + parsing."""
    resume: ResumeResponse
    parsed_successfully: bool
    message: str
