import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, Play, ArrowLeft, Loader2, Sparkles, FileText, GitCompare, BrainCircuit } from 'lucide-react'
import { clsx } from 'clsx'
import { toast } from 'react-hot-toast'
import { screeningService, type MatchResultResponse } from '../services/screening'
import { apiClient } from '../services/api'
import CompareModal from '../components/screening/CompareModal'

export default function ScreeningPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showCompare, setShowCompare] = useState(false)
  const [sortOrder, setSortOrder] = useState<'score_desc' | 'score_asc' | 'date_desc' | 'date_asc'>('score_desc')

  // Fetch Screening Results
  const { data: results, isLoading, isError } = useQuery({
    queryKey: ['screening', jobId],
    queryFn: () => screeningService.getResults(jobId!),
    enabled: !!jobId,
  })

  // Run initial AI screening
  const runScreeningMutation = useMutation({
    mutationFn: () => screeningService.runScreening(jobId!),
    onSuccess: () => {
      toast.success('AI Screening completed successfully!')
      queryClient.invalidateQueries({ queryKey: ['screening', jobId] })
      setSelectedIds(new Set())
    },
    onError: (err: any) => {
      toast.error(err.message || 'Screening pipeline failed.')
    }
  })

  // Update Status
  const statusMutation = useMutation({
    mutationFn: ({ resultId, status }: { resultId: string, status: 'hire' | 'reject' | 'pending' }) =>
      screeningService.updateStatus(resultId, status),
    onSuccess: () => {
      toast.success('Candidate decision updated.')
      queryClient.invalidateQueries({ queryKey: ['screening', jobId] })
    }
  })

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= 3) {
          toast.error('You can compare up to 3 candidates at a time.')
          return prev
        }
        next.add(id)
      }
      return next
    })
  }

  const sortedResults = [...(results || [])].sort((a, b) => {
    switch (sortOrder) {
      case 'score_desc': return b.match_score - a.match_score
      case 'score_asc':  return a.match_score - b.match_score
      case 'date_desc':  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'date_asc':   return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      default: return 0
    }
  })

  const selectedCandidates = sortedResults.filter(r => selectedIds.has(r.id))

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-fade-in text-surface-300">
        <Loader2 className="animate-spin text-primary-400 mb-4" size={40} />
        <h2 className="text-xl font-medium text-white mb-2">Loading Match Results...</h2>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-red-400">Failed to load screening results. Is the backend running?</div>
    )
  }

  const hasResults = results && results.length > 0
  const isRunning = runScreeningMutation.isPending

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-slide-up pb-10">

      {/* ── Header Area ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/dashboard" className="text-surface-300 hover:text-white flex items-center gap-1 text-sm mb-2 transition-colors">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <Sparkles className="text-primary-400" size={24} /> Screen Candidates
          </h1>
          <p className="text-surface-300 text-sm mt-1">AI-powered Match Scores and Skills Breakdown.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {hasResults && (
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
          )}
          {selectedIds.size >= 2 && (
            <button
              id="open-compare-btn"
              onClick={() => setShowCompare(true)}
              className="btn bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30 animate-pulse"
            >
              <GitCompare size={18} />
              Compare ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => runScreeningMutation.mutate()}
            disabled={isRunning}
            className="btn-primary"
          >
            {isRunning ? (
              <><Loader2 className="animate-spin" size={18} /> Processing RAG Pipeline...</>
            ) : (
              <><Play size={18} /> Run Screening Batch</>
            )}
          </button>
        </div>
      </div>

      {/* ── Selection hint ─────────────────────────────────────────────────── */}
      {hasResults && (
        <p className="text-xs text-surface-400 flex items-center gap-1.5">
          <GitCompare size={13} className="text-violet-400" />
          Select 2–3 candidates using the checkboxes to compare them side-by-side.
        </p>
      )}

      {/* ── Empty State ────────────────────────────────────────────────────── */}
      {!hasResults && !isRunning && (
        <div className="card p-12 mt-6 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-primary-900/20 rounded-full flex items-center justify-center text-primary-400 mb-6 border border-primary-900/50">
            <BrainCircuit size={40} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No Candidates Screened Yet</h2>
          <p className="text-surface-300 max-w-md mx-auto mb-8">
            Click 'Run Screening Batch' to execute the RAG pipeline. The AI will retrieve candidate chunks and evaluate them against this Job Role.
          </p>
          <button
            onClick={() => runScreeningMutation.mutate()}
            className="btn-primary shadow-lg shadow-primary-900/20 px-6 py-3 text-base"
          >
            <Play size={20} className="mr-2" /> Start AI Evaluation
          </button>
        </div>
      )}

      {/* ── Results Grid ───────────────────────────────────────────────────── */}
      {hasResults && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
          {sortedResults.map((mr) => (
            <CandidateCard
              key={mr.id}
              mr={mr}
              isSelected={selectedIds.has(mr.id)}
              onToggleSelect={() => toggleSelect(mr.id)}
              isUpdating={statusMutation.isPending && statusMutation.variables?.resultId === mr.id}
              isHireProcessing={statusMutation.isPending && statusMutation.variables?.resultId === mr.id && statusMutation.variables?.status === 'hire'}
              onDecision={(status) => statusMutation.mutate({ resultId: mr.id, status })}
            />
          ))}
        </div>
      )}

      {/* ── Compare Modal ────────────────────────────────────────────────── */}
      {showCompare && selectedCandidates.length >= 2 && (
        <CompareModal
          candidates={selectedCandidates}
          onClose={() => setShowCompare(false)}
          onDecision={(resultId, status) => {
            statusMutation.mutate({ resultId, status })
          }}
          isUpdating={statusMutation.isPending}
        />
      )}
    </div>
  )
}

function CandidateCard({
  mr, isSelected, onToggleSelect, isUpdating, isHireProcessing, onDecision
}: {
  mr: MatchResultResponse
  isSelected: boolean
  onToggleSelect: () => void
  isUpdating: boolean
  isHireProcessing: boolean
  onDecision: (status: 'hire' | 'reject') => void
}) {
  const score = mr.match_score

  // Decide colors based on AI Score
  const scoreColor = score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'
  const badgeColor = score >= 80 ? 'bg-green-500/10 border-green-500/20' : score >= 50 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20'

  return (
    <div className={clsx(
      "bg-surface rounded-2xl border flex flex-col overflow-hidden transition-all duration-300 shadow-sm hover:shadow-xl",
      isSelected ? 'border-violet-500/70 shadow-violet-900/20 shadow-md ring-1 ring-violet-500/30' :
      mr.status === 'hire' ? 'border-green-500/50 shadow-green-900/10' :
      mr.status === 'reject' ? 'border-red-500/30' :
      'border-surface-200'
    )}>

      {/* ── Card Header ─────────────────────────────────────────────────── */}
      <div className="p-5 border-b border-surface-200 flex items-start justify-between bg-surface-100/50">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            id={`select-candidate-${mr.id}`}
            onClick={onToggleSelect}
            title={isSelected ? 'Deselect for comparison' : 'Select for comparison'}
            className={clsx(
              'mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
              isSelected
                ? 'bg-violet-600 border-violet-500 text-white'
                : 'border-surface-300 hover:border-violet-400'
            )}
          >
            {isSelected && <CheckCircle2 size={12} />}
          </button>

          <div>
            <h3 className="text-lg font-bold text-white">{mr.resume.candidate_name}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <p className="text-sm text-surface-300 bg-surface px-2 py-0.5 rounded-md inline-block border border-surface-200">
                {mr.resume.candidate_email}
              </p>
              <a
                href={`${apiClient.defaults.baseURL}/resumes/${mr.resume.id}/file`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-primary-900/40 hover:bg-primary-900/80 text-primary-300 px-2 py-1 rounded flex items-center gap-1 border border-primary-800/50 transition-colors"
                title="View Resume File"
              >
                <FileText size={12} /> Resume
              </a>
            </div>
          </div>
        </div>

        <div className={clsx("flex flex-col items-center justify-center p-3 rounded-xl border border-dashed min-w-[80px]", badgeColor)}>
          <span className="text-xs font-bold uppercase tracking-wider text-surface-300 mb-1">Match</span>
          <span className={clsx("text-3xl font-black leading-none", scoreColor)}>
            {score}<span className="text-base text-surface-400 font-medium ml-0.5">%</span>
          </span>
        </div>
      </div>

      {/* ── AI Explanation ──────────────────────────────────────────────── */}
      <div className="p-5 grow flex flex-col gap-5">

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-surface-300 mb-2 flex items-center gap-1.5">
            <Sparkles size={14} className="text-primary-400" /> AI Explains
          </h4>
          <p className="text-sm text-surface-50 leading-relaxed italic bg-surface-100 p-4 rounded-xl border border-surface-200">
            "{mr.explanation}"
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {/* Matched Skills */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-surface-300 mb-2 flex items-center gap-1">
              <CheckCircle2 size={14} className="text-green-400" /> Strengths
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {mr.matched_skills?.length ? mr.matched_skills.map(skill => (
                <span key={skill} className="px-2 py-1 bg-green-500/10 text-green-300 text-xs font-medium rounded-lg border border-green-500/20">
                  {skill}
                </span>
              )) : <span className="text-sm text-surface-400">None detected</span>}
            </div>
          </div>

          {/* Missing Skills */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-surface-300 mb-2 flex items-center gap-1">
              <XCircle size={14} className="text-red-400" /> Weaknesses
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {mr.missing_skills?.length ? mr.missing_skills.map(skill => (
                <span key={skill} className="px-2 py-1 bg-red-500/10 text-red-300 text-xs font-medium rounded-lg border border-red-500/20">
                  {skill}
                </span>
              )) : <span className="text-sm text-surface-400">None detected</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer Actions ──────────────────────────────────────────────── */}
      <div className="p-5 bg-surface-100 border-t border-surface-200 flex items-center justify-between shrink-0">
        <div className="text-sm">
          <span className="text-surface-400">Status: </span>
          <strong className={clsx(
            "uppercase tracking-wide",
            mr.status === 'hire' ? "text-green-400" : mr.status === 'reject' ? "text-red-400" : "text-primary-400"
          )}>{mr.status}</strong>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onDecision('reject')}
            disabled={mr.status === 'reject' || isUpdating}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
              mr.status === 'reject'
                ? "bg-red-500/20 text-red-400 border-red-500/30 cursor-not-allowed opacity-50"
                : "bg-surface text-surface-50 border-surface-200 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
            )}
          >
            Reject Candidate
          </button>

          <button
            onClick={() => onDecision('hire')}
            disabled={mr.status === 'hire' || isUpdating}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all",
              mr.status === 'hire'
                ? "bg-green-500/20 text-green-400 border border-green-500/30 cursor-not-allowed opacity-50 shadow-none"
                : "bg-green-600 text-white hover:bg-green-500 hover:shadow-green-500/20"
            )}
          >
            {isUpdating && isHireProcessing ? 'Processing...' : 'Hire Candidate'}
          </button>
        </div>
      </div>
    </div>
  )
}
