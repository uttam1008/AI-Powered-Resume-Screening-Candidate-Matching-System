"""
models/resume_chunk.py — SQLAlchemy ORM model for chunked resume text.
Each chunk stores a 768-dim Gemini embedding for fine-grained RAG retrieval.
"""
import uuid
from datetime import datetime
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, SmallInteger, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.config import settings
from db.session import Base


class ResumeChunk(Base):
    __tablename__ = "resume_chunks"
    __table_args__ = (
        UniqueConstraint("resume_id", "chunk_index", name="uq_resume_chunk"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    chunk_index: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    # Gemini embedding for this chunk (768-dim text-embedding-004)
    embedding: Mapped[Optional[list]] = mapped_column(
        Vector(settings.EMBEDDING_DIMENSIONS)
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    resume: Mapped["Resume"] = relationship("Resume", back_populates="chunks")  # noqa: F821
