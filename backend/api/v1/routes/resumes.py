"""
api/v1/routes/resumes.py — Resume upload and retrieval endpoints.
Replaces the old candidates.py endpoints.
"""
import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.dependencies import get_resume_service
from db.session import get_db
from models.match_result import MatchResult
from models.job_role import JobRole
from schemas.resume import ResumeResponse, ResumeUploadResponse
from schemas.screening import PaginatedResponse, MatchResultResponse
from services.resume_service import ResumeService

router = APIRouter()


@router.get("", response_model=PaginatedResponse[ResumeResponse], summary="List all resumes")
async def list_resumes(
    page: int = 1,
    size: int = 20,
    job_role_id: uuid.UUID = None,
    service: ResumeService = Depends(get_resume_service),
):
    return await service.get_all(page, size, job_role_id)


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


@router.get("/{resume_id}/file", summary="View or download the resume file")
async def get_resume_file(
    resume_id: uuid.UUID,
    service: ResumeService = Depends(get_resume_service),
):
    import os
    from core.exceptions import NotFoundException
    resume = await service.get_by_id(resume_id)
    if not resume.file_url or not os.path.exists(resume.file_url):
        raise NotFoundException("Resume file not found on server.")
    
    media_type = "application/pdf" if resume.file_type.lower() == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return FileResponse(resume.file_url, media_type=media_type, headers={"Content-Disposition": f'inline; filename="{resume.file_name}"'})


@router.get("/{resume_id}/match-results", summary="Get all ATS match results for a candidate")
async def get_resume_match_results(
    resume_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Returns all match results (ATS scores) for a given resume across all job roles."""
    result = await db.execute(
        select(MatchResult, JobRole.title.label("job_title"))
        .join(JobRole, MatchResult.job_role_id == JobRole.id)
        .where(MatchResult.resume_id == resume_id)
        .order_by(MatchResult.match_score.desc())
    )
    rows = result.all()
    return [
        {
            "id": str(row.MatchResult.id),
            "job_role_id": str(row.MatchResult.job_role_id),
            "job_title": row.job_title,
            "match_score": float(row.MatchResult.match_score),
            "status": row.MatchResult.status,
            "explanation": row.MatchResult.gemini_summary,
            "matched_skills": row.MatchResult.strengths or [],
            "missing_skills": row.MatchResult.weaknesses or [],
            "created_at": row.MatchResult.created_at.isoformat(),
        }
        for row in rows
    ]


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a resume")
async def delete_resume(
    resume_id: uuid.UUID,
    service: ResumeService = Depends(get_resume_service),
):
    """Deletes the resume record from DB and removes the file from disk."""
    import os
    resume = await service.get_by_id(resume_id)
    # Delete physical file if it exists
    if resume.file_url and os.path.exists(resume.file_url):
        os.remove(resume.file_url)
    await service.delete(resume_id)

