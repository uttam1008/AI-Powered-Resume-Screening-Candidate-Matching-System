import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import {
  BarChart2, Users, Briefcase, CheckCircle2, XCircle,
  Clock, TrendingUp, Loader2
} from 'lucide-react'
import { analyticsService, type SkillGapItem } from '../services/analytics'
import { jobService } from '../services/jobs'
import { useState } from 'react'

const FUNNEL_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd']

function StatCard({
  icon: Icon, label, value, sub, color = 'text-primary-400'
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-surface-200 ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-surface-300">{label}</p>
        <p className="text-2xl font-black text-surface-50 leading-tight">{value}</p>
        {sub && <p className="text-xs text-surface-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function SkillGapChart({ jobRoleId }: { jobRoleId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['skill-gap', jobRoleId],
    queryFn: () => analyticsService.getSkillGap(jobRoleId),
    enabled: !!jobRoleId,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-surface-300">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading skill gap data...
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-surface-400 text-sm">
        No screening data yet. Run screening for this job role first.
      </div>
    )
  }

  // Show top 10
  const chartData = data.slice(0, 10).map((item: SkillGapItem) => ({
    skill: item.skill.length > 18 ? item.skill.slice(0, 18) + '…' : item.skill,
    'Missing in candidates': item.missing_count,
    'Found in candidates': item.matched_count,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" horizontal={false} />
        <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
        <YAxis type="category" dataKey="skill" tick={{ fill: '#cbd5e1', fontSize: 12 }} width={140} />
        <Tooltip
          contentStyle={{ background: '#1e1e2e', border: '1px solid #2a2a3a', borderRadius: 12, color: '#f1f5f9' }}
          cursor={{ fill: 'rgba(99,102,241,0.05)' }}
        />
        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
        <Bar dataKey="Missing in candidates" fill="#f87171" radius={[0, 4, 4, 0]} barSize={10} />
        <Bar dataKey="Found in candidates" fill="#34d399" radius={[0, 4, 4, 0]} barSize={10} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function AnalyticsPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsService.getOverview(),
  })

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobService.getJobs(),
  })

  const [selectedJobId, setSelectedJobId] = useState<string>('')

  const stats = overview?.stats
  const funnel = overview?.funnel ?? []

  // Enrich funnel with percentage relative to first step
  const maxVal = funnel[0]?.value || 1
  const funnelWithPct = funnel.map(f => ({ ...f, pct: Math.round((f.value / maxVal) * 100) }))

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-slide-up">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
          <BarChart2 className="text-primary-400" size={26} />
          Analytics
        </h1>
        <p className="text-surface-300 text-sm mt-1">
          Real-time recruitment pipeline insights & skill gap analysis.
        </p>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-surface-300">
          <Loader2 className="animate-spin mr-2" size={24} /> Loading analytics...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Briefcase}    label="Total Jobs"       value={stats?.total_jobs ?? 0}        sub={`${stats?.open_jobs ?? 0} open`} />
            <StatCard icon={Users}        label="Resumes Uploaded" value={stats?.total_resumes ?? 0}     sub={`${stats?.screened_resumes ?? 0} screened`} />
            <StatCard icon={CheckCircle2} label="Hired"            value={stats?.hired_count ?? 0}       color="text-green-400" />
            <StatCard icon={XCircle}      label="Rejected"         value={stats?.rejected_count ?? 0}    color="text-red-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              icon={TrendingUp}
              label="Average Match Score"
              value={stats?.avg_match_score != null ? `${stats.avg_match_score}%` : '—'}
              color="text-violet-400"
            />
            <StatCard
              icon={Clock}
              label="Pending Decisions"
              value={stats?.pending_count ?? 0}
              color="text-yellow-400"
            />
          </div>

          {/* ── Recruitment Funnel ─────────────────────────────────────────── */}
          <div className="card">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <BarChart2 size={20} className="text-primary-400" />
              Recruitment Funnel
            </h2>

            {funnel.length === 0 ? (
              <p className="text-surface-400 text-sm text-center py-8">No data yet.</p>
            ) : (
              <div className="space-y-4">
                {funnelWithPct.map((step, i) => (
                  <div key={step.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-surface-200">{step.label}</span>
                      <span className="text-sm font-bold text-surface-50">{step.value}</span>
                    </div>
                    <div className="w-full bg-surface-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-3 rounded-full transition-all duration-700"
                        style={{
                          width: `${step.pct}%`,
                          backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                          boxShadow: `0 0 8px ${FUNNEL_COLORS[i % FUNNEL_COLORS.length]}66`
                        }}
                      />
                    </div>
                    <p className="text-xs text-surface-400 mt-1">{step.pct}% of total resumes</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Skill Gap Heatmap ──────────────────────────────────────────── */}
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <XCircle size={20} className="text-red-400" />
                  Skill Gap Heatmap
                </h2>
                <p className="text-surface-300 text-xs mt-1">
                  Top skills that are most commonly missing across screened candidates.
                </p>
              </div>
              <select
                id="skill-gap-job-select"
                className="input !w-auto min-w-[200px] text-sm"
                value={selectedJobId}
                onChange={e => setSelectedJobId(e.target.value)}
              >
                <option value="">— Select a Job Role —</option>
                {jobs?.map(j => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            </div>

            {selectedJobId ? (
              <SkillGapChart jobRoleId={selectedJobId} />
            ) : (
              <div className="flex items-center justify-center h-48 text-surface-400 text-sm border border-dashed border-surface-200 rounded-xl">
                Select a job role above to see the skill gap analysis.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
