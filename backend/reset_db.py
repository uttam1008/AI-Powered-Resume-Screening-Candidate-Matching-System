import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from core.config import settings
from db.session import Base

async def reset_db():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        print("Dropping tables...")
        await conn.run_sync(Base.metadata.drop_all)
        print("Creating tables...")
        await conn.run_sync(Base.metadata.create_all)
    print("Database reset complete.")
    
if __name__ == "__main__":
    asyncio.run(reset_db())
