import { X, CheckCircle2, XCircle, Sparkles, Trophy } from 'lucide-react'
import { clsx } from 'clsx'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { type MatchResultResponse } from '../../services/screening'

interface CompareModalProps {
  candidates: MatchResultResponse[]
  onClose: () => void
  onDecision: (resultId: string, status: 'hire' | 'reject') => void
  isUpdating: boolean
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171'
  const circumference = 2 * Math.PI * 38
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative w-24 h-24 mx-auto mb-2">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="38" fill="none" stroke="#2a2a3a" strokeWidth="8" />
        <circle
          cx="44" cy="44" r="38" fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black" style={{ color }}>{score}</span>
        <span className="text-xs text-surface-400 -mt-0.5">%</span>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1e2535] border border-[#2a2a3a] p-3 rounded-xl shadow-xl">
        <p className="text-white font-bold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => {
          const isMatch = entry.value >= 80;
          const isMissing = entry.value >= 10 && entry.value < 80;
          return (
            <div key={index} className="flex items-center gap-2 mb-1 last:mb-0 text-[12px] font-bold">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className={isMatch ? "text-green-400" : isMissing ? "text-red-400" : "text-surface-400"}>
                {isMatch ? 'Matched in Resume' : isMissing ? 'Missing in Resume' : 'Not Evaluated'}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
}

export default function CompareModal({ candidates, onClose, onDecision, isUpdating }: CompareModalProps) {
  const best = candidates.reduce((prev, curr) =>
    curr.match_score > prev.match_score ? curr : prev
  , candidates[0])

  const candidateColors = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#eab308']

  // 1. Gather all unique skills from strengths and weaknesses across all candidates
  const allSkills = new Set<string>()
  candidates.forEach(c => {
    c.matched_skills?.forEach(s => allSkills.add(s))
    c.missing_skills?.forEach(s => allSkills.add(s))
  })
  
  // 2. We want max 6-8 skills so the radar chart is readable
  const commonSkills = Array.from(allSkills).slice(0, 8)

  // 3. Build data format for Recharts
  const radarData = commonSkills.map(skill => {
    const row: any = { skill }
    candidates.forEach(c => {
      if (c.matched_skills?.includes(skill)) {
        row[c.resume.candidate_name] = 100
      } else if (c.missing_skills?.includes(skill)) {
        row[c.resume.candidate_name] = 10 
      } else {
        row[c.resume.candidate_name] = 0
      }
    })
    return row
  })

  return (
    <div
      id="compare-modal-overlay"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-12 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-6xl bg-surface-100 rounded-2xl border border-surface-200 shadow-2xl animate-slide-up">

        {/* ── Modal Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-surface rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-yellow-400" />
            <h2 className="text-lg font-bold text-white">Candidate Comparison</h2>
            <span className="text-xs text-surface-400 bg-surface-200 px-2 py-0.5 rounded-full ml-1">
              {candidates.length} candidates
            </span>
          </div>
          <button
            id="compare-modal-close"
            onClick={onClose}
            className="p-2 rounded-xl text-surface-300 hover:text-white hover:bg-surface-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Global Skill Radar Overlay ────────────────────────────────────────── */}
        {candidates.length > 0 && commonSkills.length > 2 && (
          <div className="border-b border-surface-200 bg-surface-100 p-6 flex flex-col items-center justify-center relative">
            <h3 className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Sparkles size={14} className="text-primary-400"/> Skill Footprint Overlay</h3>
            <p className="text-[11px] text-surface-300 mb-4 max-w-xl text-center">Visualizes how candidates overlap against the job's core skill requirements.</p>
            <div className="w-full max-w-2xl h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="#2a2a3a" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
                  {candidates.map((c, i) => (
                    <Radar
                      key={c.id}
                      name={c.resume.candidate_name}
                      dataKey={c.resume.candidate_name}
                      stroke={candidateColors[i % candidateColors.length]}
                      fill={candidateColors[i % candidateColors.length]}
                      fillOpacity={0.3}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Columns ──────────────────────────────────────────────────────── */}
        <div className="grid overflow-x-auto" style={{ gridTemplateColumns: `repeat(${candidates.length}, minmax(260px, 1fr))` }}>
          {candidates.map((mr) => {
            const isBest = mr.id === best.id
            const scoreColor = mr.match_score >= 80 ? 'text-green-400' : mr.match_score >= 50 ? 'text-yellow-400' : 'text-red-400'

            return (
              <div
                key={mr.id}
                className={clsx(
                  'flex flex-col border-r border-surface-200 last:border-r-0 transition-colors',
                  isBest && 'bg-primary-900/10'
                )}
              >
                {/* Best badge */}
                <div className="h-7 flex items-center justify-center">
                  {isBest && candidates.length > 1 && (
                    <span className="text-xs font-bold text-yellow-400 flex items-center gap-1 bg-yellow-500/10 px-3 py-0.5 rounded-full border border-yellow-500/20">
                      <Trophy size={12} /> Best Match
                    </span>
                  )}
                </div>

                {/* Candidate Info */}
                <div className="p-5 border-b border-surface-200 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary-600/20 border border-primary-600/30 flex items-center justify-center text-primary-400 font-black text-lg mx-auto mb-3">
                    {mr.resume.candidate_name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-base font-bold text-white truncate">{mr.resume.candidate_name}</h3>
                  <p className="text-xs text-surface-400 truncate">{mr.resume.candidate_email}</p>
                </div>

                {/* Score Ring */}
                <div className="p-5 border-b border-surface-200 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-3">Match Score</p>
                  <ScoreRing score={Math.round(Number(mr.match_score))} />
                  <span className={clsx('text-sm font-bold', scoreColor)}>
                    {mr.match_score >= 80 ? 'Excellent' : mr.match_score >= 60 ? 'Good' : mr.match_score >= 40 ? 'Fair' : 'Poor'}
                  </span>
                </div>

                {/* AI Explanation */}
                <div className="p-5 border-b border-surface-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-surface-300 mb-2 flex items-center gap-1">
                    <Sparkles size={12} className="text-primary-400" /> AI Summary
                  </h4>
                  <p className="text-xs text-surface-200 leading-relaxed italic line-clamp-4">
                    "{mr.explanation}"
                  </p>
                </div>

                {/* Strengths */}
                <div className="p-5 border-b border-surface-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-surface-300 mb-2 flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-green-400" /> Strengths
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {mr.matched_skills?.length ? mr.matched_skills.slice(0, 6).map(s => (
                      <span key={s} className="px-2 py-0.5 bg-green-500/10 text-green-300 text-xs rounded-lg border border-green-500/20">
                        {s}
                      </span>
                    )) : <span className="text-xs text-surface-400">None detected</span>}
                  </div>
                </div>

                {/* Weaknesses */}
                <div className="p-5 border-b border-surface-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-surface-300 mb-2 flex items-center gap-1">
                    <XCircle size={12} className="text-red-400" /> Gaps
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {mr.missing_skills?.length ? mr.missing_skills.slice(0, 6).map(s => (
                      <span key={s} className="px-2 py-0.5 bg-red-500/10 text-red-300 text-xs rounded-lg border border-red-500/20">
                        {s}
                      </span>
                    )) : <span className="text-xs text-surface-400">None detected</span>}
                  </div>
                </div>

                {/* Decision Buttons */}
                <div className="p-4 mt-auto flex flex-col gap-2">
                  <div className="text-center mb-1">
                    <span className="text-xs text-surface-400">Status: </span>
                    <strong className={clsx(
                      'text-xs uppercase tracking-wide',
                      mr.status === 'hire' ? 'text-green-400' : mr.status === 'reject' ? 'text-red-400' : 'text-primary-400'
                    )}>{mr.status}</strong>
                  </div>
                  <button
                    id={`compare-hire-${mr.id}`}
                    onClick={() => onDecision(mr.id, 'hire')}
                    disabled={mr.status === 'hire' || isUpdating}
                    className={clsx(
                      'w-full py-2 rounded-xl text-sm font-bold transition-all',
                      mr.status === 'hire'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30 opacity-50 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-500'
                    )}
                  >
                    Hire
                  </button>
                  <button
                    id={`compare-reject-${mr.id}`}
                    onClick={() => onDecision(mr.id, 'reject')}
                    disabled={mr.status === 'reject' || isUpdating}
                    className={clsx(
                      'w-full py-2 rounded-xl text-sm font-semibold border transition-all',
                      mr.status === 'reject'
                        ? 'bg-red-500/20 text-red-400 border-red-500/30 opacity-50 cursor-not-allowed'
                        : 'bg-surface text-surface-50 border-surface-200 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                    )}
                  >
                    Reject
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
