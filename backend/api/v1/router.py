"""
api/v1/router.py — Master API router mounting all resource sub-routers.
"""
from fastapi import APIRouter

from api.v1.routes import auth, jobs, resumes, rag, screening

api_router = APIRouter()

api_router.include_router(auth.router,       prefix="/auth",       tags=["Authentication"])
api_router.include_router(jobs.router,       prefix="/jobs",       tags=["Jobs"])
api_router.include_router(resumes.router,    prefix="/resumes",    tags=["Resumes"])
api_router.include_router(rag.router,        prefix="/rag",        tags=["RAG Search"])
api_router.include_router(screening.router,  prefix="/screening",  tags=["Screening"])
