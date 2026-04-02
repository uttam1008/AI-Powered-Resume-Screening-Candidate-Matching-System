import asyncio
from httpx import AsyncClient

async def test():
    async with AsyncClient(base_url="http://127.0.0.1:8000") as client:
        with open("dummy.pdf", "wb") as f:
            f.write(b"dummy text")
        
        with open("dummy.pdf", "rb") as f:
            response = await client.post(
                "/api/v1/resumes/upload",
                data={"job_role_id": "64972d3f-561b-41ca-abfa-3d0d8293c6f2"},
                files={"file": ("dummy.pdf", f, "application/pdf")}
            )
            print("Status:", response.status_code)
            print("Text:", response.text)

if __name__ == "__main__":
    asyncio.run(test())
