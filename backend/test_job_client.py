import traceback
from fastapi.testclient import TestClient
from main import app
from schemas.user import UserCreate
import json

client = TestClient(app, raise_server_exceptions=True)

def run_test():
    # 1. Register user
    res = client.post("/api/v1/auth/register", json={
        "name": "Test Tester", "email": "test99@test.com", "password": "password123"
    })
    if res.status_code != 201:
        if "already registered" in res.text:
            res = client.post("/api/v1/auth/login", data={"username": "test99@test.com", "password": "password123"})
        else:
            print("Auth Fail:", res.text)
            return

    token = res.json()["access_token"]

    # 2. Create Job
    job = {
        "title": "Machine learning internship",
        "department": "Engineering",
        "location": "Remote",
        "description": "Doing ML things",
        "requirements": "Python, SQL"
    }
    
    print("\n--- Sending request ---")
    res = client.post("/api/v1/jobs", json=job, headers={"Authorization": f"Bearer {token}"})
    print(f"Status: {res.status_code}")
    print(f"Body: {res.text}")

if __name__ == "__main__":
    try:
        run_test()
    except Exception as e:
        traceback.print_exc()
