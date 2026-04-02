"""
core/config.py — Centralised application settings via pydantic-settings.
All values are read from environment variables / .env file.
"""
from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

# Always resolves to the project root .env regardless of shell CWD
_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # ── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "AI Resume Screening System"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DEBUG: bool = False

    # ── CORS ─────────────────────────────────────────────────────────────────
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173", 
        "http://127.0.0.1:5173", 
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    # ── PostgreSQL ────────────────────────────────────────────────────────────
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "resume_ai"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # ── Gemini ────────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-flash-latest"
    GEMINI_EMBEDDING_MODEL: str = "models/gemini-embedding-001"

    # ── File Upload ───────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: List[str] = ["pdf", "docx"]

    # ── pgvector ─────────────────────────────────────────────────────────────
    EMBEDDING_DIMENSIONS: int = 768


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
