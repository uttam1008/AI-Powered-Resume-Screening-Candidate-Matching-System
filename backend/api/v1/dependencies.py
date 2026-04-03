"""
api/v1/dependencies.py — FastAPI dependency injection factories.
"""
import uuid

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exceptions import UnauthorizedException
from db.session import get_db
from models.user import User
from services.auth_service import AuthService
from services.job_service import JobService
from services.resume_service import ResumeService
from services.screening_service import ScreeningService
from llm.rag import RagService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_job_service(db: AsyncSession = Depends(get_db)) -> JobService:
    return JobService(db)


def get_resume_service(db: AsyncSession = Depends(get_db)) -> ResumeService:
    return ResumeService(db)


def get_rag_service(db: AsyncSession = Depends(get_db)) -> RagService:
    return RagService(db)


def get_screening_service(db: AsyncSession = Depends(get_db)) -> ScreeningService:
    return ScreeningService(db)


def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)



async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise UnauthorizedException("Could not validate credentials")
    except JWTError:
        raise UnauthorizedException("Could not validate credentials")

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise UnauthorizedException("Could not validate credentials")

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    if user is None:
        raise UnauthorizedException("User not found")
    return user

