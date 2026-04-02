import asyncio
from fastapi.testclient import TestClient
from main import app
import uuid

client = TestClient(app)

def test_upload():
    with open("dummy.pdf", "wb") as f:
        f.write(b"dummy pdf content")
        
    with open("dummy.pdf", "rb") as f:
        response = client.post(
            "/api/v1/resumes/upload",
            data={"job_role_id": str(uuid.uuid4())},
            files={"file": ("dummy.pdf", f, "application/pdf")}
        )
    print("Status:", response.status_code)
    try:
        print("JSON:", response.json())
    except:
        print("Text:", response.text)

if __name__ == "__main__":
    test_upload()
