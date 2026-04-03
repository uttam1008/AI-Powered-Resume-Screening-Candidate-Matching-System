"""
api/v1/routes/screening.py — Full matching pipeline endpoints.

POST /screening/run/{job_role_id}  — Run Job↔Resume matching pipeline
GET  /screening/{job_role_id}      — Fetch stored results for a job role
GET  /screening/result/{result_id} — Get a single match result
"""
import uuid

from fastapi import APIRouter, Depends, status, HTTPException

from api.v1.dependencies import get_screening_service, get_current_user
from models.user import User
from schemas.screening import MatchResultResponse, ScreeningRunRequest, StatusOverrideRequest
from services.screening_service import ScreeningService

router = APIRouter()

@router.post(
    "/run/{job_role_id}",
    response_model=list[MatchResultResponse],
    status_code=status.HTTP_200_OK,
    summary="Run the full Job↔Resume matching pipeline (Requires Auth)",
)
async def run_screening(
    job_role_id: uuid.UUID,
    request: ScreeningRunRequest = ScreeningRunRequest(),
    service: ScreeningService = Depends(get_screening_service),
    current_user: User = Depends(get_current_user),
):
    try:
        results = await service.run_screening(job_role_id, top_k=request.top_k)
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        if "quota" in str(e).lower() or "429" in str(e):
            raise HTTPException(
                status_code=429, 
                detail="AI Rate Limit Exceeded. Please wait a few minutes and try again."
            )
        raise HTTPException(
            status_code=500, 
            detail=f"An error occurred during AI evaluation: {str(e)}"
        )


@router.get(
    "/{job_role_id}",
    response_model=list[MatchResultResponse],
    summary="Get all match results for a job role",
)
async def get_results_by_job(
    job_role_id: uuid.UUID,
    service: ScreeningService = Depends(get_screening_service),
):
    return await service.get_by_job_role(job_role_id)


@router.get(
    "/result/{result_id}",
    response_model=MatchResultResponse,
    summary="Get a single match result by ID",
)
async def get_result(
    result_id: uuid.UUID,
    service: ScreeningService = Depends(get_screening_service),
):
    return await service.get_by_id(result_id)


@router.put(
    "/result/{result_id}/status",
    response_model=MatchResultResponse,
    summary="Manually override HR decision status (Requires Auth)",
)
async def update_result_status(
    result_id: uuid.UUID,
    payload: StatusOverrideRequest,
    service: ScreeningService = Depends(get_screening_service),
    current_user: User = Depends(get_current_user),
):
    return await service.update_status(result_id, payload.status)
