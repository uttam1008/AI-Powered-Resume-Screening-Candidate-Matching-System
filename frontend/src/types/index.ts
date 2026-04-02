/**
 * src/types/index.ts
 * Central TypeScript type definitions aligned with backend Pydantic schemas.
 */

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export interface Job {
  id: string
  title: string
  description: string
  requirements: string
  status: 'open' | 'closed' | 'draft'
  created_at: string
  updated_at: string
}

export interface JobCreate {
  title: string
  description: string
  requirements: string
}

// ─── Candidates ───────────────────────────────────────────────────────────────
export interface Candidate {
  id: string
  name: string
  email: string
  phone?: string
  skills: string[]
  experience_years: number
  education: string
  resume_url: string
  created_at: string
}

// ─── Screening / Evaluation ───────────────────────────────────────────────────
export interface ResumeBrief {
  id: string
  candidate_name: string
  candidate_email: string
  file_url: string
}

export interface ScreeningResult {
  id: string
  job_role_id: string
  resume_id: string
  match_score: number           // 0–100
  explanation: string        // LLM-generated evaluation
  matched_skills: string[]
  missing_skills: string[]
  status: 'pending' | 'hire' | 'reject'
  created_at: string
  resume: ResumeBrief
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

// ─── API Error ────────────────────────────────────────────────────────────────
export interface ApiError {
  detail: string
  status_code: number
}
