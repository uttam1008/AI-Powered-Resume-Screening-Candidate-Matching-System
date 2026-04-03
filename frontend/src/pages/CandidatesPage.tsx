import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { Users, Loader2, Mail, Briefcase, GraduationCap, Search } from 'lucide-react'
import { resumeService, type Resume } from '../services/resumes'
import { useJobs } from '../hooks/useJobs'
import type { JobRole } from '../services/jobs'

export default function CandidatesPage() {
  const [filterJobId, setFilterJobId] = useState('')

  const { data: jobs } = useJobs()

  const { data: candidates, isLoading, isError } = useQuery({
    queryKey: ['candidates', filterJobId],
    queryFn: () => resumeService.getResumes(1, 50, filterJobId || undefined),
  })

  return (
    <div className="space-y-6 animate-slide-up pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Candidates</h1>
          <p className="text-surface-300 text-sm mt-1">Browse all uploaded resumes and extracted profiles.</p>
        </div>

        {/* Filter by Job Role */}
        <select
          className="input max-w-xs"
          value={filterJobId}
          onChange={(e) => setFilterJobId(e.target.value)}
        >
          <option value="">All Job Roles</option>
          {jobs?.map((job: JobRole) => (
            <option key={job.id} value={job.id}>{job.title}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-20 text-surface-300">
          <Loader2 className="animate-spin text-primary-400 mb-4" size={36} />
          <p className="text-sm">Loading candidates...</p>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="card p-8 text-center text-red-400 bg-red-900/10 border-red-500/20">
          Failed to load candidates. Ensure the backend is running.
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && candidates?.length === 0 && (
        <div className="card p-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-surface-200 rounded-full flex items-center justify-center text-surface-300 mb-4">
            <Search size={28} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Candidates Found</h3>
          <p className="text-surface-300 text-sm max-w-sm">
            {filterJobId
              ? 'No resumes uploaded for this job role yet.'
              : 'No resumes uploaded yet. Go to Upload to add candidates.'}
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && candidates && candidates.length > 0 && (
        <div className="card !p-0 overflow-hidden">
          <div className="p-5 border-b border-surface-200 bg-surface-100 flex items-center gap-2">
            <Users size={18} className="text-primary-400" />
            <h2 className="text-base font-semibold text-white">
              {candidates.length} Candidate{candidates.length !== 1 ? 's' : ''}
            </h2>
          </div>

          <div className="divide-y divide-surface-200">
            {candidates.map((c: Resume) => (
              <div
                key={c.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-surface-200/30 transition-colors"
              >
                {/* Left: Name + Email */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary-900/40 border border-primary-700/30 flex items-center justify-center text-sm font-bold text-primary-300 shrink-0">
                    {c.candidate_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{c.candidate_name}</p>
                    <p className="text-xs text-surface-300 flex items-center gap-1 mt-0.5">
                      <Mail size={11} />{c.candidate_email}
                    </p>
                  </div>
                </div>

                {/* Middle: Meta */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-surface-300 sm:text-right">
                  {c.experience_years > 0 && (
                    <span className="flex items-center gap-1">
                      <Briefcase size={11} />{c.experience_years} yr{c.experience_years !== 1 ? 's' : ''}
                    </span>
                  )}
                  {c.education && (
                    <span className="flex items-center gap-1 max-w-[160px] truncate">
                      <GraduationCap size={11} />{c.education}
                    </span>
                  )}
                </div>

                {/* Right: Skills + Date */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {c.skills?.slice(0, 4).map((skill) => (
                      <span key={skill} className="px-2 py-0.5 bg-primary-900/30 text-primary-300 border border-primary-800/30 rounded-md text-xs">
                        {skill}
                      </span>
                    ))}
                    {(c.skills?.length ?? 0) > 4 && (
                      <span className="px-2 py-0.5 bg-surface-200 text-surface-300 rounded-md text-xs">
                        +{c.skills.length - 4}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-surface-400">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
