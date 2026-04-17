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
    pool_pre_ping=False,   # Disabled: Supabase pgBouncer (transaction mode) handles liveness
    pool_size=10,
    max_overflow=20,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    },
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
    """
    Create pgvector extension and all tables if they don't exist.
    Gracefully tolerates Supabase/pgBouncer transaction-mode pooling.
    """
    import models  # noqa: F401 — populate Base.metadata

    async with engine.begin() as conn:
        try:
            from sqlalchemy import text
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        except Exception:
            # Extension may already exist or require superuser; safe to ignore
            pass

        try:
            await conn.run_sync(Base.metadata.create_all)
        except Exception as e:
            err_str = str(e)
            if "DuplicatePreparedStatement" in err_str or "already exists" in err_str:
                # Tables already exist in Supabase — nothing to do
                pass
            else:
                raise


# ── Dependency ─────────────────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
