"""models/__init__.py — import all models so Alembic/SQLAlchemy sees them."""
from models.user import User
from models.job_role import JobRole
from models.resume import Resume
from models.resume_chunk import ResumeChunk
from models.match_result import MatchResult

__all__ = ["User", "JobRole", "Resume", "ResumeChunk", "MatchResult"]
