"""
api/v1/routes/auth.py — Authentication endpoints (Register / Login).
"""
from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from api.v1.dependencies import get_auth_service
from schemas.user import UserCreate, TokenResponse
from services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(
    payload: UserCreate,
    auth_service: AuthService = Depends(get_auth_service),
):
    return await auth_service.register(payload)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and get JWT token",
)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    OAuth2 compatible token login, getting an access token for future requests.
    Expects form-data: username (email) and password.
    """
    return await auth_service.login(form_data)
