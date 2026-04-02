import urllib.request
import urllib.error
import json

base_url = "http://127.0.0.1:8000/api/v1"

# 1. Login
data = b"username=agent2%40test.com&password=password123"
req = urllib.request.Request(f"{base_url}/auth/login", data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
try:
    resp = urllib.request.urlopen(req)
    token = json.loads(resp.read())["access_token"]
except Exception as e:
    print("Login Failed:", getattr(e, "read", lambda: b"")().decode() or str(e))
    exit(1)

# 2. Create Job
job_data = {
    "title": "Machine learning internship",
    "department": "Engineering",
    "location": "Remote",
    "description": "Doing ML things",
    "requirements": "Python, SQL"
}
req = urllib.request.Request(
    f"{base_url}/jobs", 
    data=json.dumps(job_data).encode(), 
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
)

try:
    resp = urllib.request.urlopen(req)
    print("Job Created:", resp.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP Error on Jobs:", e.code, e.read().decode())
except Exception as e:
    print("Other Error:", str(e))
