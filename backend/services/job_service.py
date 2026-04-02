"""
services/job_service.py — Business logic for JobRole CRUD operations.
"""
import uuid
from typing import Optional

import structlog
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundException
from llm.gemini_client import gemini_client
from models.job_role import JobRole
from models.resume import Resume
from schemas.job import JobCreate, JobUpdate

logger = structlog.get_logger(__name__)


class JobService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_all(self, page: int = 1, size: int = 20) -> dict:
        offset = (page - 1) * size
        total_q = await self.db.execute(select(func.count(JobRole.id)))
        total = total_q.scalar_one()

        query = (
            select(JobRole, func.count(Resume.id).label("resume_count"))
            .outerjoin(Resume, Resume.job_role_id == JobRole.id)
            .group_by(JobRole.id)
            .order_by(JobRole.created_at.desc())
            .offset(offset)
            .limit(size)
        )
        result = await self.db.execute(query)
        rows = result.all()
        
        items = []
        for row in rows:
            job = row[0]
            job.resume_count = row[1]
            items.append(job)

        return {
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "pages": max(1, (total + size - 1) // size),
        }

    async def get_by_id(self, job_id: uuid.UUID) -> JobRole:
        query = (
            select(JobRole, func.count(Resume.id).label("resume_count"))
            .outerjoin(Resume, Resume.job_role_id == JobRole.id)
            .where(JobRole.id == job_id)
            .group_by(JobRole.id)
        )
        result = await self.db.execute(query)
        row = result.first()
        if not row:
            raise NotFoundException("JobRole")
        job = row[0]
        job.resume_count = row[1]
        return job

    async def create(self, payload: JobCreate, user_id: uuid.UUID) -> JobRole:
        # Generate embedding for RAG (Title + Requirements)
        embedding_text = f"Title: {payload.title}\nRequirements: {payload.requirements}"
        embedding_vector = await gemini_client.embed(embedding_text)

        job = JobRole(
            **payload.model_dump(),
            created_by=user_id,
            embedding=embedding_vector
        )
        self.db.add(job)
        await self.db.flush()
        logger.info("job.created", job_id=str(job.id), created_by=str(user_id))
        return job

    async def update(self, job_id: uuid.UUID, payload: JobUpdate) -> JobRole:
        job = await self.get_by_id(job_id)
        
        need_new_embedding = False
        payload_dict = payload.model_dump(exclude_none=True)
        
        if "title" in payload_dict or "requirements" in payload_dict:
            need_new_embedding = True

        for field, value in payload_dict.items():
            setattr(job, field, value)
            
        if need_new_embedding:
            embedding_text = f"Title: {job.title}\nRequirements: {job.requirements}"
            job.embedding = await gemini_client.embed(embedding_text)

        await self.db.flush()
        return job

    async def delete(self, job_id: uuid.UUID) -> None:
        job = await self.get_by_id(job_id)
        await self.db.delete(job)
        logger.info("job.deleted", job_id=str(job_id))
