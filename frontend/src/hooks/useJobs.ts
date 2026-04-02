/**
 * src/hooks/useJobs.ts
 * React Query hooks for Job resource.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobService } from '../services/jobs'
import type { JobCreate } from '../types/index'

export const JOB_KEYS = {
  all: ['jobs'] as const,
  list: (page: number, size: number) => ['jobs', 'list', page, size] as const,
  detail: (id: string) => ['jobs', id] as const,
}

export function useJobs(page = 1, size = 20) {
  return useQuery({
    queryKey: JOB_KEYS.list(page, size),
    queryFn: () => jobService.getJobs(page, size),
  })
}

export function useJob(id: string) {
  return useQuery({
    queryKey: JOB_KEYS.detail(id),
    queryFn: () => jobService.getById(id),
    enabled: !!id,
  })
}

export function useCreateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: JobCreate) => jobService.createJob(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: JOB_KEYS.all }),
  })
}

export function useDeleteJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jobService.deleteJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: JOB_KEYS.all }),
  })
}
