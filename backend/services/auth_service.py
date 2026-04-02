"""
services/auth_service.py — Business logic for Authetication (Register & Login).
"""
import structlog
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import ConflictException, UnauthorizedException
from core.security import verify_password, get_password_hash, create_access_token
from models.user import User
from schemas.user import UserCreate, TokenResponse, UserResponse

logger = structlog.get_logger(__name__)


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def register(self, payload: UserCreate) -> TokenResponse:
        # Check if user exists
        result = await self.db.execute(select(User).where(User.email == payload.email))
        if result.scalar_one_or_none():
            logger.warning("auth.register.conflict", email=payload.email)
            raise ConflictException("Email already registered")

        # Create user
        hashed_password = get_password_hash(payload.password)
        user = User(
            name=payload.name,
            email=payload.email,
            hashed_password=hashed_password
        )
        self.db.add(user)
        await self.db.flush()

        logger.info("auth.register.success", user_id=str(user.id))

        # Generate token
        access_token = create_access_token(subject=user.id)
        
        return TokenResponse(
            access_token=access_token,
            user=UserResponse.model_validate(user)
        )

    async def login(self, form_data: OAuth2PasswordRequestForm) -> TokenResponse:
        # Get user
        result = await self.db.execute(select(User).where(User.email == form_data.username))
        user = result.scalar_one_or_none()
        
        if not user or not verify_password(form_data.password, user.hashed_password):
            logger.warning("auth.login.failed", email=form_data.username)
            raise UnauthorizedException("Incorrect email or password")

        logger.info("auth.login.success", user_id=str(user.id))

        # Generate token
        access_token = create_access_token(subject=user.id)
        
        return TokenResponse(
            access_token=access_token,
            user=UserResponse.model_validate(user)
        )
