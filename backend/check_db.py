import asyncio
import os
import sys

# Add current directory to path so we can import internal modules
sys.path.append(os.getcwd())

async def check():
    from db.session import AsyncSessionLocal
    from models.job_role import JobRole
    from sqlalchemy import select, func
    
    async with AsyncSessionLocal() as session:
        count = (await session.execute(select(func.count(JobRole.id)))).scalar()
        print(f"TOTAL_JOBS: {count}")

if __name__ == "__main__":
    asyncio.run(check())
