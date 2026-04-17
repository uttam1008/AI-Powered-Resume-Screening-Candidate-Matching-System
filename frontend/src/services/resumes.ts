import apiClient from './api'

export interface Resume {
  id: string
  candidate_name: string
  candidate_email: string
  candidate_phone?: string
  job_role_id?: string
  skills: string[]
  experience_years: number
  education?: string
  file_type: string
  raw_text?: string

  file_name: string
  file_url: string
  created_at: string
  ats_score?: number
  match_status?: string
}

export interface UploadResponse {
  resume: {
    id: string
    candidate_name: string
    candidate_email: string
  }
  parsed_successfully: boolean
  message: string
}

export const resumeService = {
  async getResumes(page: number = 1, size: number = 50, jobRoleId?: string): Promise<Resume[]> {
    const params: Record<string, unknown> = { page, size }
    if (jobRoleId) params.job_role_id = jobRoleId
    const { data } = await apiClient.get<{ items: Resume[] }>('/resumes', { params })
    return data.items
  },

  async uploadResume(file: File, jobRoleId?: string): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    
    // Send jobRoleId if selecting a target job
    if (jobRoleId) {
      formData.append('job_role_id', jobRoleId)
    }

    // Backend endpoint now safely extracts missing fields using Gemini RAG Parsing
    const { data } = await apiClient.post<UploadResponse>('/resumes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Note: Setting a longer timeout for LLM parsing layer
      timeout: 120_000, 
    })
    return data
  },

  async deleteResume(id: string): Promise<void> {
    await apiClient.delete(`/resumes/${id}`)
  },
}
