"""
models/resume.py — SQLAlchemy ORM model for Resumes (full document).
Each resume belongs to a JobRole. One candidate can upload to multiple jobs.
"""
import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, ForeignKey, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.session import Base


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    job_role_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("job_roles.id", ondelete="SET NULL"), index=True, nullable=True
    )
    candidate_name: Mapped[str] = mapped_column(String(255), nullable=False)
    candidate_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    candidate_phone: Mapped[Optional[str]] = mapped_column(String(50))

    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(10), nullable=False)  # 'pdf' | 'docx'

    raw_text: Mapped[Optional[str]] = mapped_column(Text)
    skills: Mapped[Optional[list]] = mapped_column(ARRAY(String))
    experience_years: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    education: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    job_role: Mapped[Optional["JobRole"]] = relationship("JobRole", back_populates="resumes")  # noqa: F821
    chunks: Mapped[List["ResumeChunk"]] = relationship(  # noqa: F821
        "ResumeChunk", back_populates="resume", cascade="all, delete-orphan",
        order_by="ResumeChunk.chunk_index"
    )
    match_results: Mapped[List["MatchResult"]] = relationship(  # noqa: F821
        "MatchResult", back_populates="resume", cascade="all, delete-orphan"
    )
