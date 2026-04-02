import apiClient from './api'

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
  }
}
