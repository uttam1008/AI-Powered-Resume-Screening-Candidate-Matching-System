# AI Resume Screening System

> **Stack**: React + Vite + Tailwind · FastAPI · PostgreSQL + pgvector · Gemini API

---

## Project Structure

```
Fresh_start/
├── frontend/                  # React 18 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   └── layout/        # App shell (Layout, Sidebar, Header)
│   │   ├── pages/             # Route-level page components
│   │   ├── hooks/             # React Query data-fetching hooks
│   │   ├── services/          # Axios API client + resource services
│   │   ├── store/             # Zustand global UI state
│   │   ├── types/             # TypeScript interfaces
│   │   └── utils/             # Helper utilities (cn, formatters)
│   ├── vite.config.ts         # Vite + path aliases + API proxy
│   ├── tailwind.config.js     # Design tokens & custom theme
│   └── package.json
│
├── backend/                   # FastAPI Python backend
│   ├── main.py                # App factory, middleware, lifespan
│   ├── core/
│   │   ├── config.py          # Pydantic Settings (all env vars)
│   │   ├── exceptions.py      # Typed HTTP exceptions
│   │   └── logging.py         # structlog configuration
│   ├── api/
│   │   └── v1/
│   │       ├── router.py      # Master v1 router
│   │       ├── dependencies.py# DI factories (DB session, services)
│   │       └── routes/
│   │           ├── jobs.py        # CRUD for job postings
│   │           ├── candidates.py  # Resume upload + retrieval
│   │           └── screening.py   # Trigger & fetch AI screening
│   ├── models/                # SQLAlchemy ORM models
│   │   ├── job.py             # Job model
│   │   ├── candidate.py       # Candidate model + pgvector embedding
│   │   └── screening_result.py# Gemini evaluation result model
│   ├── schemas/               # Pydantic request/response schemas
│   │   ├── job.py
│   │   ├── candidate.py
│   │   └── screening.py
│   ├── services/              # Business logic layer
│   │   ├── job_service.py
│   │   └── screening_service.py  # RAG + Gemini orchestrator
│   ├── db/
│   │   └── session.py         # Async engine, session factory, init_db
│   ├── llm/
│   │   ├── gemini_client.py   # Async Gemini generate + embed client
│   │   ├── prompts.py         # Prompt templates (screening, parsing)
│   │   └── rag.py             # pgvector cosine similarity retrieval
│   ├── utils/
│   │   └── file_parser.py     # PDF/DOCX text extraction
│   ├── tests/                 # pytest test suite
│   ├── requirements.txt
│   └── Dockerfile
│
├── database/
│   └── init.sql               # DDL: tables + pgvector HNSW index
│
├── docker-compose.yml         # Full-stack local dev environment
├── .env.example               # Environment variable template
└── README.md
```

---

## Quick Start (Docker)

```bash
# 1. Clone and configure
cp .env.example .env          # Fill GEMINI_API_KEY, POSTGRES_PASSWORD

# 2. Start all services
docker compose up --build

# Services:
#   Frontend  → http://localhost:5173
#   Backend   → http://localhost:8000
#   API Docs  → http://localhost:8000/api/docs
#   PostgreSQL→ localhost:5432
```

## Quick Start (Local Dev)

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp ../.env.example .env         # Fill values
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local      # Set VITE_API_BASE_URL
npm run dev
```

---

## AI Screening Pipeline

```
Upload Resume (PDF/DOCX)
       │
       ▼
 Text Extraction (PyPDF2 / python-docx)
       │
       ▼
 Gemini Parsing  ──► Structured candidate data
       │
       ▼
 Gemini Embedding ──► 768-dim vector stored in pgvector
       │
  [When screening a job]
       │
       ▼
 Embed Job Requirements
       │
       ▼
 pgvector HNSW Search  ──► Top-K similar candidates (RAG)
       │
       ▼
 Gemini Evaluation  ──► match_score, summary, strengths, weaknesses
       │
       ▼
 ScreeningResult persisted & returned ranked
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key |
| `POSTGRES_*` | PostgreSQL connection details |
| `SECRET_KEY` | App secret (JWT, future auth) |
| `ENVIRONMENT` | `development` / `production` |
| `VITE_API_BASE_URL` | Frontend → backend base URL |
