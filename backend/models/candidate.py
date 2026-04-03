"""
models/candidate.py — SQLAlchemy ORM model for Candidates + resume embeddings.
"""
import uuid
from datetime import datetime
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.config import settings
from db.session import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    resume_url: Mapped[str] = mapped_column(Text, nullable=False)
    resume_text: Mapped[Optional[str]] = mapped_column(Text)   # Parsed plain text
    skills: Mapped[Optional[list]] = mapped_column(ARRAY(String))
    experience_years: Mapped[int] = mapped_column(Integer, default=0)
    education: Mapped[Optional[str]] = mapped_column(Text)

    # pgvector embedding of resume text (for RAG similarity search)
    embedding: Mapped[Optional[list]] = mapped_column(
        Vector(settings.EMBEDDING_DIMENSIONS)
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    screening_results: Mapped[list["ScreeningResult"]] = relationship(  # noqa: F821
        "ScreeningResult", back_populates="candidate", cascade="all, delete-orphan"
    )
