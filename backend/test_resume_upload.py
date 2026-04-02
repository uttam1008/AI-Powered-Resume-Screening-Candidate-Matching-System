import asyncio
import os
import requests
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000/api/v1"
RESUME_DIR = Path(r"d:\Uttam\sem-8\Fresh_start\Example_Resume")

def main():
    print("Starting E2E API Test...")

    # 1. Register/Login
    session = requests.Session()
    register_data = {"name": "API Tester", "email": "tester_resume@example.com", "password": "password123"}
    resp = session.post(f"{BASE_URL}/auth/register", json=register_data)
    
    if resp.status_code == 201:
        token = resp.json()["access_token"]
        print("Registered successful")
    elif resp.status_code == 409:
        print("User already exists, logging in instead...")
        resp = session.post(f"{BASE_URL}/auth/login", data={"username": "tester_resume@example.com", "password": "password123"})
        token = resp.json()["access_token"]
        print("Login successful")
    else:
        print(f"Auth Failed: {resp.text}")
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create a Job Role
    job_payload = {
        "title": "Machine Learning Engineer",
        "department": "Engineering",
        "description": "Looking for an ML engineer with Python, Postgres, and vector DB experience.",
        "requirements": "3+ years of experience, Python, PyTorch, SQL, FastAPI",
        "experience_min": 2
    }
    
    resp = session.post(f"{BASE_URL}/jobs", json=job_payload, headers=headers)
    if resp.status_code != 201:
        print(f"Job Creation Failed: {resp.text}")
        return
        
    job_role_id = resp.json()["id"]
    print(f"Created Job Role: {job_role_id}")

    # 3. Upload Resumes
    print(f"\nUploading resumes from {RESUME_DIR}")
    files_to_upload = [f for f in RESUME_DIR.iterdir() if f.is_file() and f.suffix.lower() in [".pdf", ".docx"]]
    
    for file_path in files_to_upload:
        print(f"   => Uploading {file_path.name}...")
        with open(file_path, "rb") as f:
            files = {"file": (file_path.name, f, "application/pdf" if file_path.suffix.lower() == ".pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
            data = {"job_role_id": job_role_id, "candidate_name": file_path.stem}
            
            resp = session.post(f"{BASE_URL}/resumes/upload", files=files, data=data, headers=headers)
            
            if resp.status_code == 201:
                print(f"      Upload & parsed successful: ID={resp.json()['resume']['id']}")
            else:
                print(f"      Upload failed: {resp.text}")

    # 4. Trigger Screening
    print("\nTriggering AI Screening for Job Role...")
    resp = session.post(f"{BASE_URL}/screening/run/{job_role_id}", json={"top_k": 5}, headers=headers)
    if resp.status_code == 200:
        results = resp.json()
        print(f"Screening completed. Found {len(results)} matches.")
        for idx, res in enumerate(results):
            score = res['match_score']   
            print(f"  [{idx+1}] Candidate: {res['resume']['candidate_name']} | Score: {score}")
            print(f"      Recommended: {res.get('status')}")
    else:
        print(f"Screening Failed: {resp.text}")

if __name__ == "__main__":
    main()
