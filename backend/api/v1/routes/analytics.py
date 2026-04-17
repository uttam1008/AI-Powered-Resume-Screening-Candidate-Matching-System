"""
api/v1/routes/analytics.py — Analytics & KPI endpoints.

GET /analytics/overview            — Global recruiter KPIs
GET /analytics/skill-gap/{job_id}  — Skill gap heatmap for a specific job
"""
import uuid
from collections import Counter
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from models.job_role import JobRole
from models.match_result import MatchResult
from models.resume import Resume

router = APIRouter()


# ── Response Models ─────────────────────────────────────────────────────────────

class OverviewStats(BaseModel):
    total_jobs: int
    open_jobs: int
    total_resumes: int
    screened_resumes: int
    hired_count: int
    rejected_count: int
    pending_count: int
    avg_match_score: Optional[float]


class SkillGapItem(BaseModel):
    skill: str
    missing_count: int
    matched_count: int


class FunnelStep(BaseModel):
    label: str
    value: int

class UserStatsResponse(BaseModel):
    total_evaluated: int
    top_skill: str
    accuracy: int


class OverviewResponse(BaseModel):
    stats: OverviewStats
    funnel: list[FunnelStep]


# ── Routes ──────────────────────────────────────────────────────────────────────

@router.get("/overview", response_model=OverviewResponse, summary="Recruiter dashboard KPIs")
async def get_overview(db: AsyncSession = Depends(get_db)):
    # Jobs
    total_jobs_r = await db.execute(select(func.count(JobRole.id)))
    total_jobs = total_jobs_r.scalar_one() or 0

    open_jobs_r = await db.execute(select(func.count(JobRole.id)).where(JobRole.status == "open"))
    open_jobs = open_jobs_r.scalar_one() or 0

    # Resumes
    total_resumes_r = await db.execute(select(func.count(Resume.id)))
    total_resumes = total_resumes_r.scalar_one() or 0

    # Match results
    screened_r = await db.execute(select(func.count(MatchResult.id)))
    screened_resumes = screened_r.scalar_one() or 0

    hired_r = await db.execute(select(func.count(MatchResult.id)).where(MatchResult.status == "hire"))
    hired_count = hired_r.scalar_one() or 0

    rejected_r = await db.execute(select(func.count(MatchResult.id)).where(MatchResult.status == "reject"))
    rejected_count = rejected_r.scalar_one() or 0

    pending_r = await db.execute(select(func.count(MatchResult.id)).where(MatchResult.status == "pending"))
    pending_count = pending_r.scalar_one() or 0

    avg_score_r = await db.execute(select(func.avg(MatchResult.match_score)))
    avg_score_raw = avg_score_r.scalar_one()
    avg_match_score = round(float(avg_score_raw), 1) if avg_score_raw is not None else None

    stats = OverviewStats(
        total_jobs=total_jobs,
        open_jobs=open_jobs,
        total_resumes=total_resumes,
        screened_resumes=screened_resumes,
        hired_count=hired_count,
        rejected_count=rejected_count,
        pending_count=pending_count,
        avg_match_score=avg_match_score,
    )

    funnel = [
        FunnelStep(label="Resumes Uploaded", value=total_resumes),
        FunnelStep(label="AI Screened", value=screened_resumes),
        FunnelStep(label="Shortlisted (≥75%)", value=hired_count + pending_count),
        FunnelStep(label="Hired", value=hired_count),
    ]

    return OverviewResponse(stats=stats, funnel=funnel)


@router.get(
    "/skill-gap/{job_role_id}",
    response_model=list[SkillGapItem],
    summary="Skill gap heatmap across all candidates for a job role",
)
async def get_skill_gap(job_role_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    results_r = await db.execute(
        select(MatchResult).where(MatchResult.job_role_id == job_role_id)
    )
    results = results_r.scalars().all()

    missing_counter: Counter = Counter()
    matched_counter: Counter = Counter()

    for mr in results:
        for skill in (mr.weaknesses or []):
            missing_counter[skill.strip()] += 1
        for skill in (mr.strengths or []):
            matched_counter[skill.strip()] += 1

    # Union of all skills
    all_skills = set(missing_counter.keys()) | set(matched_counter.keys())

    items = [
        SkillGapItem(
            skill=skill,
            missing_count=missing_counter.get(skill, 0),
            matched_count=matched_counter.get(skill, 0),
        )
        for skill in all_skills
    ]

    # Sort by missing_count DESC so most critical gaps appear first
    items.sort(key=lambda x: x.missing_count, reverse=True)
    return items[:20]  # top-20 skills


@router.get("/me/stats", response_model=UserStatsResponse, summary="Get HR Quick Insights for current user")
async def get_user_stats(db: AsyncSession = Depends(get_db)):
    # 1. Total evaluated (total match results)
    eval_r = await db.execute(select(func.count(MatchResult.id)))
    total_evaluated = eval_r.scalar_one() or 0

    # 2. Accuracy: Average match score of hired candidates
    hires_r = await db.execute(
        select(MatchResult.match_score).where(MatchResult.status == "hire")
    )
    hires_scores = hires_r.scalars().all()
    if hires_scores:
        accuracy = int(sum(float(s) for s in hires_scores) / len(hires_scores))
    else:
        accuracy = 0

    # 3. Top skill in hired candidates
    hired_mr_r = await db.execute(
        select(MatchResult).where(MatchResult.status == "hire")
    )
    hired_mrs = hired_mr_r.scalars().all()
    
    skill_counter = Counter()
    for mr in hired_mrs:
        for skill in (mr.strengths or []):
            skill_counter[skill.strip()] += 1
            
    top_skill = "N/A"
    if skill_counter:
        top_skill = skill_counter.most_common(1)[0][0]

    return UserStatsResponse(
        total_evaluated=total_evaluated,
        top_skill=top_skill,
        accuracy=accuracy
    )
