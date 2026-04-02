"""
models/match_result.py — SQLAlchemy ORM model for Gemini evaluation results.
Unique per (job_role_id, resume_id); re-running screening replaces the row.
"""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    DateTime, Enum, ForeignKey, Numeric, String, Text, UniqueConstraint, func
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.session import Base


class MatchResult(Base):
    __tablename__ = "match_results"
    __table_args__ = (
        UniqueConstraint("job_role_id", "resume_id", name="uq_match_result"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    job_role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("job_roles.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    match_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False
    )
    gemini_summary: Mapped[Optional[str]] = mapped_column(Text)
    strengths: Mapped[Optional[list]] = mapped_column(ARRAY(String))
    weaknesses: Mapped[Optional[list]] = mapped_column(ARRAY(String))
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        nullable=False,
    )
    raw_llm_response: Mapped[Optional[str]] = mapped_column(Text)  # raw JSON for auditing

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    job_role: Mapped["JobRole"] = relationship("JobRole", back_populates="match_results")  # noqa: F821
    resume: Mapped["Resume"] = relationship("Resume", back_populates="match_results")  # noqa: F821
