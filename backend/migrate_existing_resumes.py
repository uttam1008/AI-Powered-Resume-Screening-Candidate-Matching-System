import asyncio
import os
import shutil
import re
from pathlib import Path
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from db.session import AsyncSessionLocal
from models.match_result import MatchResult
from models.resume import Resume
from models.job_role import JobRole
from core.config import settings
import structlog

logger = structlog.get_logger()

async def backfill():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(MatchResult).options(selectinload(MatchResult.resume), selectinload(MatchResult.job_role))
        )
        match_results = result.scalars().all()
        
        logger.info(f"Found {len(match_results)} match results to process.")
        
        for mr in match_results:
            resume = mr.resume
            job = mr.job_role
            if not resume or not job:
                continue
                
            source_path = os.path.join(settings.UPLOAD_DIR, resume.file_name)
            if not os.path.exists(source_path):
                logger.warning(f"Missing source file: {source_path}")
                continue

            safe_job_title = re.sub(r'[^a-zA-Z0-9_\- ]', '', job.title).strip()
            os.makedirs(settings.ORGANIZED_RESUMES_DIR, exist_ok=True)
            job_dir = os.path.join(settings.ORGANIZED_RESUMES_DIR, safe_job_title)
            os.makedirs(job_dir, exist_ok=True)

            safe_name = re.sub(r'[^a-zA-Z0-9_\- ]', '', resume.candidate_name).strip().replace(" ", "_").lower()
            safe_job_folder = safe_job_title.replace(" ", "_").lower()
            ext = Path(resume.file_name).suffix.lower()

            dest_filename = f"{safe_name}_{safe_job_folder}_{mr.status}{ext}"
            dest_path = os.path.join(job_dir, dest_filename)

            try:
                shutil.copy2(source_path, dest_path)
                logger.info(f"Copied to: {dest_path}")
            except Exception as e:
                logger.error(f"Failed to copy {source_path} to {dest_path}: {e}")

if __name__ == "__main__":
    asyncio.run(backfill())
