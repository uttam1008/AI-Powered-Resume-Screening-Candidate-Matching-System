import asyncio
import sys
import os
import platform

# Add the parent directory to the system path to allow imports from core and db
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from db.session import engine

async def clear_database():
    """Truncates all specified tables in the database, restarting identity sequences."""
    tables = ["match_results", "resume_chunks", "resumes", "job_roles", "users"]
    
    print(f"Connecting to database to clear tables: {', '.join(tables)}")
    
    async with engine.begin() as conn:
        try:
            # We use CASCADE to handle foreign key dependencies automatically
            # Note: The order matters, but CASCADE handles it. 
            # We truncate all tables in one command for efficiency and safety.
            truncate_stmt = f"TRUNCATE TABLE {', '.join(tables)} RESTART IDENTITY CASCADE;"
            await conn.execute(text(truncate_stmt))
            print("Successfully cleared all data from the database.")
        except Exception as e:
            print(f"Error clearing database: {e}")
        finally:
            await engine.dispose()

if __name__ == "__main__":
    if platform.system() == "Windows":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(clear_database())
