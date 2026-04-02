"""
models/screening_result.py — ORM model linking Job ↔ Candidate with Gemini evaluation.
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.session import Base


class ScreeningResult(Base):
    __tablename__ = "screening_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Gemini evaluation output
    match_score: Mapped[float] = mapped_column(Float, nullable=False)          # 0.0–100.0
    gemini_summary: Mapped[Optional[str]] = mapped_column(Text)
    strengths: Mapped[Optional[list]] = mapped_column(ARRAY(String))
    weaknesses: Mapped[Optional[list]] = mapped_column(ARRAY(String))
    recommendation: Mapped[str] = mapped_column(
        Enum("strong_yes", "yes", "maybe", "no", name="recommendation_enum"),
        default="maybe",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    job: Mapped["Job"] = relationship("Job", back_populates="screening_results")  # noqa: F821
    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="screening_results")  # noqa: F821
