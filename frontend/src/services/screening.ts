import apiClient from './api'

export interface ResumeBrief {
  id: string
  candidate_name: string
  candidate_email: string
  file_url: string
}

export interface MatchResultResponse {
  id: string
  job_role_id: string
  resume_id: string
  match_score: number
  matched_skills: string[]
  missing_skills: string[]
  explanation: string
  status: 'pending' | 'hire' | 'reject'
  created_at: string
  resume: ResumeBrief
}

export const screeningService = {
  // Fetch existing screening results for a job
  async getResults(jobId: string): Promise<MatchResultResponse[]> {
    const { data } = await apiClient.get<MatchResultResponse[]>(`/screening/${jobId}`)
    return data
  },

  // Trigger the RAG + LLM pipeline
  async runScreening(jobId: string, topK: number = 10): Promise<MatchResultResponse[]> {
    const { data } = await apiClient.post<MatchResultResponse[]>(
      `/screening/run/${jobId}`, 
      { top_k: topK },
      { timeout: 120_000 }
    )
    return data
  },

  // Override HR Decision
  async updateStatus(resultId: string, status: 'hire' | 'reject' | 'pending'): Promise<MatchResultResponse> {
    const { data } = await apiClient.put<MatchResultResponse>(`/screening/result/${resultId}/status`, { status })
    return data
  }
}
