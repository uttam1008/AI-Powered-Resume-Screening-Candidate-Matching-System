import apiClient from './api'

export interface JobRole {
  id: string
  title: string
  department?: string
  location?: string
  description: string
  requirements: string
  experience_min: number
  experience_max?: number
  status: 'draft' | 'open' | 'closed' | 'archived'
  created_at: string
  resume_count: number
}

export interface JobRoleCreate {
  title: string
  department?: string
  location?: string
  description: string
  requirements: string
  experience_min?: number
  experience_max?: number
}

import { PaginatedResponse } from '../types'

export const jobService = {
  async getJobs(page: number = 1, size: number = 20): Promise<JobRole[]> {
    const { data } = await apiClient.get<PaginatedResponse<JobRole>>('/jobs', {
      params: { page, size }
    })
    return data.items
  },

  async createJob(payload: JobRoleCreate): Promise<JobRole> {
    const { data } = await apiClient.post<JobRole>('/jobs', payload)
    return data
  },

  async getById(id: string): Promise<JobRole> {
    const { data } = await apiClient.get<JobRole>(`/jobs/${id}`)
    return data
  },

  async updateJobStatus(id: string, status: 'open' | 'closed'): Promise<JobRole> {
    const { data } = await apiClient.put<JobRole>(`/jobs/${id}`, { status })
    return data
  },

  async deleteJob(id: string): Promise<void> {
    await apiClient.delete(`/jobs/${id}`)
  },
}
