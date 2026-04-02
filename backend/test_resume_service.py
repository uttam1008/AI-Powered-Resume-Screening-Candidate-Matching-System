import asyncio
from pathlib import Path
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import AsyncSessionLocal
from services.resume_service import ResumeService
import uuid
import sys

RESUME_DIR = Path(r"d:\Uttam\sem-8\Fresh_start\Example_Resume")

class DummyUploadFile(UploadFile):
    def __init__(self, filename: str, content: bytes):
        super().__init__(file=None, filename=filename)
        self._content = content
        
    async def read(self, size: int = -1) -> bytes:
        return self._content

async def main():
    resume_path = RESUME_DIR / "Himanshu Pansuriya Resume.pdf"
    if not resume_path.exists():
        print(f"File not found: {resume_path}")
        return
        
    with open(resume_path, "rb") as f:
        file_bytes = f.read()
        
    dummy_file = DummyUploadFile(filename=resume_path.name, content=file_bytes)
    
    try:
        async with AsyncSessionLocal() as db_session:
            service = ResumeService(db_session)
            print("Processing upload...")
            resume = await service.upload_and_parse(
                file=dummy_file,
                job_role_id=uuid.uuid4()
            )
            print(f"Success! Resume ID: {resume.id}")
            
    except Exception as e:
        print("\n" + "="*50)
        print(f"THE EXCEPTION MESSAGE IS: {str(e)}")
        print("="*50 + "\n")

if __name__ == "__main__":
    asyncio.run(main())
