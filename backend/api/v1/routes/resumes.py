"""
api/v1/routes/resumes.py — Resume upload and retrieval endpoints.
Replaces the old candidates.py endpoints.
"""
import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from api.v1.dependencies import get_resume_service
from schemas.resume import ResumeResponse, ResumeUploadResponse
from schemas.screening import PaginatedResponse
from services.resume_service import ResumeService

router = APIRouter()


@router.get("", response_model=PaginatedResponse[ResumeResponse], summary="List all resumes")
async def list_resumes(
    page: int = 1,
    size: int = 20,
    service: ResumeService = Depends(get_resume_service),
):
    return await service.get_all(page, size)


@router.post(
    "/upload",
    response_model=ResumeUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a resume (PDF or DOCX)",
)
async def upload_resume(
    file: UploadFile = File(..., description="PDF or DOCX resume"),
    candidate_name: str = Form(None, description="Full Name (auto-extracted if null)"),
    candidate_email: str = Form(None, description="Email (auto-extracted if null)"),
    candidate_phone: str = Form(None, description="Phone (auto-extracted if null)"),
    job_role_id: uuid.UUID = Form(None, description="Current Job Role ID"),
    service: ResumeService = Depends(get_resume_service),
):
    """
    1. Validates PDF/DOCX
    2. Saves file to disk
    3. Extracts raw text locally (PyPDF2 / python-docx)
    4. Calls Gemini to extract skills, experience matching Schema
    5. Saves full Resume record to database
    """
    resume = await service.upload_and_parse(
        file=file,
        candidate_name=candidate_name,
        candidate_email=candidate_email,
        candidate_phone=candidate_phone,
        job_role_id=job_role_id,
    )

    return {
        "resume": resume,
        "parsed_successfully": bool(resume.raw_text),
        "message": "Resume uploaded and parsed successfully."
    }


@router.get("/{resume_id}", response_model=ResumeResponse, summary="Get resume by ID")
async def get_resume(
    resume_id: uuid.UUID,
    service: ResumeService = Depends(get_resume_service),
):
    return await service.get_by_id(resume_id)
