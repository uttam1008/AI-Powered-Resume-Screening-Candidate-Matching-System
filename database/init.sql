-- ================================================================
-- database/init.sql  |  AI Resume Screening — Full Schema
-- ================================================================
-- Tables:
--   users          → authenticated HR users / admins
--   job_roles      → job postings with requirement embedding
--   resumes        → uploaded candidate resumes (full document)
--   resume_chunks  → chunked resume text with per-chunk embedding (RAG)
--   match_results  → Gemini evaluation result for resume↔job pair
-- ================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;       -- pgvector
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- uuid_generate_v4() fallback

-- ── ENUM types ───────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE job_status    AS ENUM ('draft', 'open', 'closed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TYPE job_status    AS ENUM ('draft', 'open', 'closed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================================================
-- TABLE: users
-- Authenticated HR users / admins who create job roles.
-- ================================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ================================================================
-- TABLE: job_roles
-- Job postings. Stores a 768-dim embedding of the combined
-- title + requirements text for fast ANN retrieval (RAG).
-- ================================================================
CREATE TABLE IF NOT EXISTS job_roles (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by       UUID         REFERENCES users(id) ON DELETE SET NULL,
    title            VARCHAR(255) NOT NULL,
    department       VARCHAR(100),
    location         VARCHAR(100),
    description      TEXT         NOT NULL,
    requirements     TEXT         NOT NULL,
    experience_min   SMALLINT     NOT NULL DEFAULT 0,   -- years
    experience_max   SMALLINT,                          -- NULL = no upper limit
    status           job_status   NOT NULL DEFAULT 'open',
    -- Gemini embedding of "title + requirements" (768-dim text-embedding-004)
    embedding        vector(768),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_roles_status     ON job_roles(status);
CREATE INDEX IF NOT EXISTS idx_job_roles_created_by ON job_roles(created_by);
-- HNSW index for job-embedding similarity queries
CREATE INDEX IF NOT EXISTS job_roles_embedding_hnsw
    ON job_roles USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ================================================================
-- TABLE: resumes
-- Full candidate resume document.  One candidate may have
-- multiple resumes (one per application or re-upload).
-- ================================================================
CREATE TABLE IF NOT EXISTS resumes (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    job_role_id      UUID         REFERENCES job_roles(id) ON DELETE SET NULL,
    candidate_name   VARCHAR(255) NOT NULL,
    candidate_email  VARCHAR(255) NOT NULL,
    candidate_phone  VARCHAR(50),
    file_url         TEXT         NOT NULL,   -- S3 / local storage path
    file_name        VARCHAR(255) NOT NULL,
    file_type        VARCHAR(10)  NOT NULL    -- 'pdf' | 'docx'
                     CHECK (file_type IN ('pdf', 'docx')),
    raw_text         TEXT,                    -- full extracted plain text
    skills           TEXT[],                  -- parsed skill tags
    experience_years SMALLINT     NOT NULL DEFAULT 0,
    education        TEXT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resumes_job_role_id     ON resumes(job_role_id);
CREATE INDEX IF NOT EXISTS idx_resumes_candidate_email ON resumes(candidate_email);

-- ================================================================
-- TABLE: resume_chunks
-- Resume text split into ~500-token chunks.
-- Each chunk has an independent 768-dim embedding for fine-grained
-- RAG retrieval, allowing section-level matching.
-- ================================================================
CREATE TABLE IF NOT EXISTS resume_chunks (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id   UUID    NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    chunk_index SMALLINT NOT NULL,   -- 0-based position within the resume
    text        TEXT     NOT NULL,
    -- Gemini embedding of this chunk (768-dim text-embedding-004)
    embedding   vector(768),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_resume_chunk UNIQUE (resume_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_resume_chunks_resume_id ON resume_chunks(resume_id);
-- HNSW index for per-chunk ANN similarity search
CREATE INDEX IF NOT EXISTS resume_chunks_embedding_hnsw
    ON resume_chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ================================================================
-- TABLE: match_results
-- Gemini evaluation output for a resume ↔ job_role pair.
-- Unique per (job_role_id, resume_id) — re-run replaces previous.
-- ================================================================
CREATE TABLE IF NOT EXISTS match_results (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    job_role_id      UUID           NOT NULL REFERENCES job_roles(id) ON DELETE CASCADE,
    resume_id        UUID           NOT NULL REFERENCES resumes(id)   ON DELETE CASCADE,
    match_score      NUMERIC(5, 2)  NOT NULL CHECK (match_score BETWEEN 0 AND 100),
    gemini_summary   TEXT,
    strengths        TEXT[],
    weaknesses       TEXT[],
    status           VARCHAR(20)    NOT NULL DEFAULT 'pending',
    raw_llm_response TEXT,          -- store raw JSON for audit / re-parsing
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),

    CONSTRAINT uq_match_result UNIQUE (job_role_id, resume_id)
);

CREATE INDEX IF NOT EXISTS idx_match_results_job_role_id ON match_results(job_role_id);
CREATE INDEX IF NOT EXISTS idx_match_results_resume_id   ON match_results(resume_id);
CREATE INDEX IF NOT EXISTS idx_match_results_score       ON match_results(match_score DESC);

-- ================================================================
-- Helper: auto-update updated_at on any table that has it
-- ================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DO $$ BEGIN
    CREATE TRIGGER trg_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_job_roles_updated_at
        BEFORE UPDATE ON job_roles
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
