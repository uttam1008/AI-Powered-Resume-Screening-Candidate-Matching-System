"""
schemas/job.py — Pydantic schemas for Job Role request/response.
"""
import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class JobCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255, examples=["Senior Backend Engineer"])
    department: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=100)
    description: str = Field(..., min_length=10, examples=["We are looking for..."])
    requirements: str = Field(..., min_length=10, examples=["5+ years Python..."])
    experience_min: int = Field(0, ge=0)
    experience_max: Optional[int] = Field(None, ge=0)


class JobUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    department: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    requirements: Optional[str] = None
    experience_min: Optional[int] = Field(None, ge=0)
    experience_max: Optional[int] = Field(None, ge=0)
    status: Optional[Literal["open", "closed", "draft", "archived"]] = None


class JobResponse(BaseModel):
    id: uuid.UUID
    created_by: Optional[uuid.UUID]
    title: str
    department: Optional[str]
    location: Optional[str]
    description: str
    requirements: str
    experience_min: int
    experience_max: Optional[int]
    status: str
    created_at: datetime
    updated_at: datetime
    resume_count: int = 0

    model_config = {"from_attributes": True}
