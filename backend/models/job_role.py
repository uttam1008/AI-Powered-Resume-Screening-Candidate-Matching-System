"""
models/job_role.py — SQLAlchemy ORM model for Job Roles.
Replaces the old Job model. Includes pgvector embedding for RAG retrieval.
"""
import uuid
from datetime import datetime
from typing import List, Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Enum, ForeignKey, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.config import settings
from db.session import Base


class JobRole(Base):
    __tablename__ = "job_roles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    department: Mapped[Optional[str]] = mapped_column(String(100))
    location: Mapped[Optional[str]] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requirements: Mapped[str] = mapped_column(Text, nullable=False)
    experience_min: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    experience_max: Mapped[Optional[int]] = mapped_column(SmallInteger)
    status: Mapped[str] = mapped_column(
        Enum("draft", "open", "closed", "archived", name="job_status"),
        default="open",
        nullable=False,
        index=True,
    )
    # Gemini embedding of "title + requirements"
    embedding: Mapped[Optional[list]] = mapped_column(
        Vector(settings.EMBEDDING_DIMENSIONS)
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    creator: Mapped[Optional["User"]] = relationship("User", back_populates="job_roles")  # noqa: F821
    resumes: Mapped[List["Resume"]] = relationship(  # noqa: F821
        "Resume", back_populates="job_role"
    )
    match_results: Mapped[List["MatchResult"]] = relationship(  # noqa: F821
        "MatchResult", back_populates="job_role", cascade="all, delete-orphan"
    )
