import urllib.request
import urllib.error
import json

url = "http://127.0.0.1:8000/api/v1/auth/register"
data = {"name": "Test Agent", "email": "agent2@test.com", "password": "password123"}
req = urllib.request.Request(
    url, 
    data=json.dumps(data).encode("utf-8"), 
    headers={"Content-Type": "application/json"}
)

try:
    response = urllib.request.urlopen(req, timeout=5)
    print("SUCCESS:", response.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code, e.reason)
    print("Response payload:", e.read().decode())
except Exception as e:
    print("OTHER ERROR:", type(e).__name__, str(e))
