import asyncio
import traceback
from fastapi import UploadFile
from db.session import get_db, init_db
from services.resume_service import ResumeService

async def test_traceback():
    await init_db()
    async for db_session in get_db():
        service = ResumeService(db_session)
        with open("dummy.pdf", "wb") as f:
            f.write(b"dummy pdf content")
        
        with open("dummy.pdf", "rb") as f:
            upload_file = UploadFile(file=f, filename="dummy.pdf")
            try:
                await service.upload_and_parse(upload_file)
                print("Success")
            except Exception as e:
                print("Exception caught:")
                traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_traceback())
