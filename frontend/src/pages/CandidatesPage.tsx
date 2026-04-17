import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { Users, Loader2, Mail, Briefcase, GraduationCap, Search, FileText, User, X, Zap, Phone, Trash2, Star, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { clsx } from 'clsx'
import { apiClient } from '../services/api'
import { resumeService, type Resume } from '../services/resumes'
import { useJobs } from '../hooks/useJobs'
import type { JobRole } from '../services/jobs'

// ── Types ────────────────────────────────────────────────────────────────────
interface MatchResult {
  id: string
  job_role_id: string
  job_title: string
  match_score: number
  status: string
  explanation: string | null
  matched_skills: string[]
  missing_skills: string[]
  created_at: string
}

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, score))
  const dash = (pct / 100) * circ
  const color = pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
      <svg width="80" height="80" className="-rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#1e2535" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <span className="absolute text-sm font-bold text-white">{Math.round(pct)}%</span>
    </div>
  )
}

// ── Candidate Info Modal ──────────────────────────────────────────────────────
function CandidateInfoModal({ candidate, onClose }: { candidate: Resume; onClose: () => void }) {
  const { data: matchResults, isLoading: loadingATS } = useQuery<MatchResult[]>({
    queryKey: ['candidate-match-results', candidate.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/resumes/${candidate.id}/match-results`)
      return data
    },
  })

  const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>({})
  const toggleExpand = (key: string) =>
    setExpandedSkills(prev => ({ ...prev, [key]: !prev[key] }))

  const bestScore = matchResults && matchResults.length > 0
    ? matchResults[0].match_score
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-surface-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* ── Header ── */}
        <div className="p-5 sm:p-6 border-b border-surface-200 flex items-start justify-between gap-4 bg-surface-100/60">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg ring-4 ring-surface-100 shrink-0">
              {candidate.candidate_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white truncate">{candidate.candidate_name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-xs text-surface-300 flex items-center gap-1 bg-surface px-2 py-1 rounded-md border border-surface-200 truncate max-w-[200px]">
                  <Mail size={12} className="text-surface-400 shrink-0" /> {candidate.candidate_email}
                </span>
                {candidate.candidate_phone && (
                  <span className="text-xs text-surface-300 flex items-center gap-1 bg-surface px-2 py-1 rounded-md border border-surface-200">
                    <Phone size={12} className="text-surface-400 shrink-0" /> {candidate.candidate_phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-surface-400 hover:text-white hover:bg-surface-200 rounded-full transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-surface-100 border border-surface-200 rounded-xl p-3.5 flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-surface-400 flex items-center gap-1"><Briefcase size={11} /> Experience</span>
              <span className="text-white font-bold text-xl">{candidate.experience_years} <span className="text-sm font-normal text-surface-300">yr{candidate.experience_years !== 1 ? 's' : ''}</span></span>
            </div>
            <div className="bg-surface-100 border border-surface-200 rounded-xl p-3.5 flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-surface-400 flex items-center gap-1"><Star size={11} /> Best ATS Score</span>
              {loadingATS
                ? <span className="text-surface-400 text-sm italic">Loading…</span>
                : bestScore !== null
                  ? <span className={clsx("font-bold text-xl", bestScore >= 75 ? 'text-green-400' : bestScore >= 50 ? 'text-yellow-400' : 'text-red-400')}>
                      {Math.round(bestScore)}%
                    </span>
                  : <span className="text-surface-400 text-sm italic">Not screened</span>
              }
            </div>
            <div className="col-span-2 sm:col-span-1 bg-surface-100 border border-surface-200 rounded-xl p-3.5 flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-surface-400 flex items-center gap-1"><GraduationCap size={11} /> Education</span>
              <span className="text-white text-sm font-medium leading-snug line-clamp-2">{candidate.education || '—'}</span>
            </div>
          </div>

          {/* Skills */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-surface-400 mb-3 flex items-center gap-1.5">
              <Zap size={13} className="text-primary-400" /> Extracted Skills
            </h4>
            <div className="flex flex-wrap gap-2">
              {candidate.skills?.map(skill => (
                <span key={skill} className="px-2.5 py-1 bg-primary-900/40 text-primary-300 border border-primary-800/50 rounded-lg text-xs font-medium">
                  {skill}
                </span>
              ))}
              {(!candidate.skills || candidate.skills.length === 0) && (
                <span className="text-surface-400 text-sm italic">No skills detected.</span>
              )}
            </div>
          </div>

          {/* ATS Scores per Job */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-surface-400 mb-3 flex items-center gap-1.5">
              <TrendingUp size={13} className="text-primary-400" /> ATS Screening Results
            </h4>

            {loadingATS && (
              <div className="flex items-center gap-2 text-surface-400 text-sm py-4 justify-center">
                <Loader2 size={16} className="animate-spin" /> Fetching screening results…
              </div>
            )}

            {!loadingATS && (!matchResults || matchResults.length === 0) && (
              <div className="bg-surface-100 border border-surface-200 rounded-xl p-4 text-center text-surface-400 text-sm">
                This candidate hasn't been screened for any job yet.
              </div>
            )}

            {!loadingATS && matchResults && matchResults.length > 0 && (
              <div className="space-y-3">
                {matchResults.map((r) => (
                  <div key={r.id} className="bg-surface-100 border border-surface-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Score Ring */}
                    <ScoreRing score={r.match_score} />

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h5 className="text-sm font-bold text-white">{r.job_title}</h5>
                        <span className={clsx(
                          'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                          r.status === 'hire' ? 'bg-green-900/30 text-green-400 border-green-800/40' :
                          r.status === 'reject' ? 'bg-red-900/30 text-red-400 border-red-800/40' :
                          'bg-surface-200 text-surface-300 border-surface-200'
                        )}>
                          {r.status}
                        </span>
                      </div>

                      {r.explanation && (
                        <p className="text-xs text-surface-300 leading-relaxed mb-3 line-clamp-3">{r.explanation}</p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {r.matched_skills.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold uppercase text-green-400 mb-1 flex items-center gap-1"><CheckCircle2 size={10} /> Matched</p>
                            <div className="flex flex-wrap gap-1">
                              {(expandedSkills[r.id + '_matched'] ? r.matched_skills : r.matched_skills.slice(0, 4)).map(s => (
                                <span key={s} className="text-[11px] px-2 py-0.5 bg-green-900/20 text-green-400 border border-green-800/30 rounded">{s}</span>
                              ))}
                              {r.matched_skills.length > 4 && (
                                <button
                                  onClick={() => toggleExpand(r.id + '_matched')}
                                  className="text-[11px] px-2 py-0.5 bg-surface-200 hover:bg-surface-300 text-primary-300 border border-surface-200 rounded transition-colors font-semibold"
                                >
                                  {expandedSkills[r.id + '_matched'] ? 'Show less' : `+${r.matched_skills.length - 4} more`}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        {r.missing_skills.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold uppercase text-red-400 mb-1 flex items-center gap-1"><AlertCircle size={10} /> Missing</p>
                            <div className="flex flex-wrap gap-1">
                              {(expandedSkills[r.id + '_missing'] ? r.missing_skills : r.missing_skills.slice(0, 4)).map(s => (
                                <span key={s} className="text-[11px] px-2 py-0.5 bg-red-900/20 text-red-400 border border-red-800/30 rounded">{s}</span>
                              ))}
                              {r.missing_skills.length > 4 && (
                                <button
                                  onClick={() => toggleExpand(r.id + '_missing')}
                                  className="text-[11px] px-2 py-0.5 bg-surface-200 hover:bg-surface-300 text-primary-300 border border-surface-200 rounded transition-colors font-semibold"
                                >
                                  {expandedSkills[r.id + '_missing'] ? 'Show less' : `+${r.missing_skills.length - 4} more`}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="p-4 border-t border-surface-200 bg-surface-100/60 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">Close</button>
          <a
            href={`${apiClient.defaults.baseURL}/resumes/${candidate.id}/file`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-sm shadow-lg shadow-primary-900/20"
          >
            <FileText size={15} /> Open Resume
          </a>
        </div>
      </div>
    </div>
  )
}

export default function CandidatesPage() {
  const [filterJobId, setFilterJobId] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState<Resume | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'score_desc' | 'score_asc' | 'date_desc' | 'date_asc'>('date_desc')
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: string) => resumeService.deleteResume(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      toast.success('Candidate deleted successfully.')
      setConfirmDeleteId(null)
    },
    onError: () => {
      toast.error('Failed to delete candidate. Try again.')
      setConfirmDeleteId(null)
    },
  })

  const { data: jobs } = useJobs()

  const { data: candidates, isLoading, isError } = useQuery({
    queryKey: ['candidates', filterJobId],
    queryFn: () => resumeService.getResumes(1, 50, filterJobId || undefined),
  })

  const sortedCandidates = [...(candidates || [])].sort((a, b) => {
    switch (sortOrder) {
      case 'score_desc': return (b.ats_score || 0) - (a.ats_score || 0)
      case 'score_asc':  return (a.ats_score || 0) - (b.ats_score || 0)
      case 'date_desc':  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'date_asc':   return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      default: return 0
    }
  })

  return (
    <div className="space-y-6 animate-slide-up pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Global Talent Vault</h1>
          <p className="text-surface-300 text-sm mt-1">Centralized hub for all uploaded resumes across every job role.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sort Dropdown */}
          <select
            className="input !w-auto text-sm py-2 bg-surface-100 border-surface-200 text-surface-50 font-medium"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
          >
            <option value="score_desc">Best Match</option>
            <option value="score_asc">Lowest Score</option>
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
          </select>

          {/* Filter by Job Role */}
          <select
            className="input !w-auto text-sm py-2 bg-surface-100 border-surface-200 text-surface-50"
            value={filterJobId}
            onChange={(e) => setFilterJobId(e.target.value)}
          >
            <option value="">All Job Roles</option>
            {jobs?.map((job: JobRole) => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
        </div>
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
            {sortedCandidates.map((c: Resume) => (
              <div
                key={c.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 p-5 sm:p-6 hover:bg-surface-200/40 transition-all group"
              >
                {/* Left: Identity & Details */}
                <div className="flex items-start gap-4 min-w-0 w-full sm:w-auto flex-1">
                  <div className="w-12 h-12 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-lg font-bold text-primary-400 shrink-0 mt-1 sm:mt-0 shadow-sm">
                    {c.candidate_name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-white truncate group-hover:text-primary-300 transition-colors">{c.candidate_name}</h3>
                      {c.ats_score !== undefined && c.ats_score !== null && (
                        <span className={clsx(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider",
                          c.ats_score >= 75 ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          c.ats_score >= 50 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                          "bg-red-500/10 text-red-400 border-red-500/20"
                        )}>
                          {Math.round(c.ats_score)}% Score
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-surface-300">
                      <span className="flex items-center gap-1.5 truncate">
                        <Mail size={13} className="text-surface-400" /> {c.candidate_email}
                      </span>
                      <span className="text-[11px] text-surface-400 sm:hidden mt-0.5">
                        • {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 mt-2 sm:mt-0 gap-3">
                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button 
                      onClick={() => setSelectedCandidate(c)}
                      className="flex-1 sm:flex-none text-xs bg-surface-200 hover:bg-surface-300 text-white px-4 py-2 flex justify-center items-center gap-1.5 rounded-xl transition-all border border-surface-200 shadow-sm font-medium"
                      title="Show Candidate Info"
                    >
                      <User size={14} /> Full Info
                    </button>
                    <a 
                      href={`${apiClient.defaults.baseURL}/resumes/${c.id}/file`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none text-xs bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 flex justify-center items-center gap-1.5 rounded-xl transition-all shadow-md shadow-primary-900/30 font-medium"
                      title="View Resume"
                    >
                      <FileText size={14} /> Resume
                    </a>
                    <button
                      onClick={() => setConfirmDeleteId(c.id)}
                      title="Delete Candidate"
                      className="text-xs bg-red-900/20 hover:bg-red-900/50 text-red-400 p-2 flex items-center justify-center rounded-xl transition-all border border-red-800/30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <span className="text-[11px] text-surface-400 hidden sm:block">
                    Uploaded {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidate Info Modal */}
      {selectedCandidate && (
        <CandidateInfoModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-surface-200 rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-red-900/30 border border-red-800/40 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Candidate?</h3>
                <p className="text-sm text-surface-300 mt-0.5">This will permanently remove the candidate and their resume file. This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="btn-secondary px-4 py-2 text-sm"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDeleteId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all flex items-center gap-2 shadow-md shadow-red-900/30"
              >
                <Trash2 size={14} />
                {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
