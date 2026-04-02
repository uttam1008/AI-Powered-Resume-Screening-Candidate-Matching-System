"""
db/session.py — Async SQLAlchemy engine, session factory, and DB init.
"""
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from core.config import settings

# ── Engine ─────────────────────────────────────────────────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# ── Session factory ────────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


# ── Base model ─────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── DB init (called on startup) ────────────────────────────────────────────────
async def init_db() -> None:
    """Create pgvector extension and all tables."""
    async with engine.begin() as conn:
        from sqlalchemy import text
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        # Import all models so Base.metadata is populated
        import models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)


# ── Dependency ─────────────────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
