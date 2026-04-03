"""
api/v1/routes/jobs.py — CRUD endpoints for Job Roles.
"""
import uuid

from fastapi import APIRouter, Depends, status

from api.v1.dependencies import get_job_service, get_current_user
from models.user import User
from schemas.job import JobCreate, JobResponse, JobUpdate
from schemas.screening import PaginatedResponse
from services.job_service import JobService

router = APIRouter()


@router.get("", response_model=PaginatedResponse[JobResponse], summary="List all jobs")
async def list_jobs(
    page: int = 1,
    size: int = 20,
    service: JobService = Depends(get_job_service),
):
    return await service.get_all(page, size)


@router.post(
    "", 
    response_model=JobResponse, 
    status_code=status.HTTP_201_CREATED, 
    summary="Create a job role (Requires Auth)",
)
async def create_job(
    payload: JobCreate,
    service: JobService = Depends(get_job_service),
    current_user: User = Depends(get_current_user),
):
    return await service.create(payload, user_id=current_user.id)


@router.get("/{job_id}", response_model=JobResponse, summary="Get job by ID")
async def get_job(
    job_id: uuid.UUID,
    service: JobService = Depends(get_job_service),
):
    return await service.get_by_id(job_id)


@router.put("/{job_id}", response_model=JobResponse, summary="Update a job (Requires Auth)")
async def update_job(
    job_id: uuid.UUID,
    payload: JobUpdate,
    service: JobService = Depends(get_job_service),
    current_user: User = Depends(get_current_user),
):
    try:
        return await service.update(job_id, payload)
    except Exception:
        import traceback
        traceback.print_exc()
        raise


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a job (Requires Auth)")
async def delete_job(
    job_id: uuid.UUID,
    service: JobService = Depends(get_job_service),
    current_user: User = Depends(get_current_user),
):
    await service.delete(job_id)
