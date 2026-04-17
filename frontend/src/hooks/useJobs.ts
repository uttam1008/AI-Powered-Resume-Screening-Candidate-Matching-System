/**
 * src/hooks/useJobs.ts
 * React Query hooks for Job resource.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobService } from '../services/jobs'
import type { JobCreate } from '../types/index'

const JOB_KEYS = {
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
