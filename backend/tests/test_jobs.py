"""
tests/test_jobs.py — Integration tests for /api/v1/jobs endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_create_job(client: AsyncClient):
    payload = {
        "title": "Software Engineer",
        "description": "Build scalable systems.",
        "requirements": "3+ years Python, FastAPI.",
    }
    response = await client.post("/api/v1/jobs", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == payload["title"]
    assert "id" in data


@pytest.mark.anyio
async def test_list_jobs(client: AsyncClient):
    response = await client.get("/api/v1/jobs")
    assert response.status_code == 200
    assert "items" in response.json()


@pytest.mark.anyio
async def test_get_job_not_found(client: AsyncClient):
    response = await client.get("/api/v1/jobs/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
