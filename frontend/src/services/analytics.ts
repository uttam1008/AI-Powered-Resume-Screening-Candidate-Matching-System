import apiClient from './api'

export interface OverviewStats {
  total_jobs: number
  open_jobs: number
  total_resumes: number
  screened_resumes: number
  hired_count: number
  rejected_count: number
  pending_count: number
  avg_match_score: number | null
}

export interface FunnelStep {
  label: string
  value: number
}

export interface OverviewResponse {
  stats: OverviewStats
  funnel: FunnelStep[]
}

export interface SkillGapItem {
  skill: string
  missing_count: number
  matched_count: number
}

export const analyticsService = {
  async getOverview(): Promise<OverviewResponse> {
    const { data } = await apiClient.get<OverviewResponse>('/analytics/overview')
    return data
  },

  async getSkillGap(jobRoleId: string): Promise<SkillGapItem[]> {
    const { data } = await apiClient.get<SkillGapItem[]>(`/analytics/skill-gap/${jobRoleId}`)
    return data
  },

  async getUserStats(): Promise<{ total_evaluated: number; top_skill: string; accuracy: number }> {
    const { data } = await apiClient.get('/analytics/me/stats')
    return data
  }
}
