import { useState } from 'react'
import { PlusCircle, Briefcase, MapPin, Building, ChevronRight, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { jobService } from '../services/jobs'
import { analyticsService } from '../services/analytics'
import CreateJobModal from '../components/jobs/CreateJobModal'

const FUNNEL_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd']

export default function DashboardPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  const { data: jobs, isLoading, error, refetch } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobService.getJobs(),
  })

  const { data: overview, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsService.getOverview(),
  })

  // Group stats
  const totalJobs = overview?.stats.total_jobs ?? (jobs?.length || 0)
  const openJobs = overview?.stats.open_jobs ?? (jobs?.filter(j => j.status === 'open').length || 0)
  const avgMatchScore = overview?.stats.avg_match_score != null ? `${overview.stats.avg_match_score}%` : '—'
  const hired = overview?.stats.hired_count ?? 0
  const rejected = overview?.stats.rejected_count ?? 0
  const pending = overview?.stats.pending_count ?? 0

  const funnel = overview?.funnel ?? []
  const maxVal = funnel[0]?.value || 1
  const funnelWithPct = funnel.map(f => ({ ...f, pct: Math.round((f.value / maxVal) * 100) }))

  return (
    <div className="space-y-6 animate-slide-up pb-10">
      
      {/* ── Header Area ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">HR Dashboard</h1>
          <p className="text-surface-300 text-sm mt-1">Manage open positions and screen candidates using AI.</p>
        </div>
        
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary shadow-lg shadow-primary-900/20"
        >
          <PlusCircle size={18} className="mr-1" />
          Create New Role
        </button>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex flex-col gap-2 bg-gradient-to-br from-surface-100 to-primary-900/10 border-primary-900/30">
          <span className="text-surface-300 text-xs font-semibold uppercase tracking-wider">Active Roles</span>
          <span className="text-3xl font-bold text-primary-400">{totalJobs}</span>
          <span className="text-xs text-surface-400">{openJobs} Open</span>
        </div>
        <div className="card flex flex-col gap-2">
           <span className="text-surface-300 text-xs font-semibold uppercase tracking-wider">Avg Match</span>
           <span className="text-3xl font-bold text-violet-400">{avgMatchScore}</span>
        </div>
        <div className="card flex flex-col gap-2">
           <span className="text-surface-300 text-xs font-semibold uppercase tracking-wider">Hired</span>
           <span className="text-3xl font-bold text-green-400">{hired}</span>
        </div>
        <div className="card flex flex-col gap-2">
           <span className="text-surface-300 text-xs font-semibold uppercase tracking-wider">Pending</span>
           <span className="text-3xl font-bold text-yellow-400">{pending}</span>
           <span className="text-xs text-red-400">{rejected} Rejected</span>
        </div>
      </div>

      {/* ── Recruitment Funnel ─────────────────────────────────────────── */}
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-6">Recruitment Funnel</h2>
        {analyticsLoading ? (
           <div className="h-32 flex items-center justify-center text-surface-400">Loading pipeline data...</div>
        ) : funnel.length === 0 ? (
          <p className="text-surface-400 text-sm text-center py-8">No resumes processed yet.</p>
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Job Roles List ─────────────────────────────────────────────────── */}
      <div className="card !p-0 overflow-hidden">
        <div className="p-5 border-b border-surface-200 flex items-center justify-between bg-surface-100">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Briefcase size={20} className="text-primary-400" />
            Recent Job Roles
          </h2>
          <Link to="/jobs" className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors">
            View All
          </Link>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-surface-300 animate-pulse">Loading roles...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 bg-red-900/10">Failed to load roles. Ensure backend is running.</div>
        ) : jobs?.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-surface-200 rounded-full flex items-center justify-center text-surface-300 mb-4">
              <Search size={28} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Job Roles Found</h3>
            <p className="text-surface-300 text-sm max-w-sm mb-6">You haven't posted any jobs yet. Create a new role to start screening resumes.</p>
            <button onClick={() => setIsCreateModalOpen(true)} className="btn-secondary">
              <PlusCircle size={18} /> Add First Role
            </button>
          </div>
        ) : (
          <div className="divide-y divide-surface-200">
            {jobs?.slice(0, 5).map((job) => (
              <Link 
                key={job.id} 
                to={`/jobs/${job.id}`}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-surface-200/50 transition-colors gap-4"
              >
                <div>
                  <h3 className="text-base font-semibold text-surface-50 group-hover:text-primary-400 transition-colors">
                    {job.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-surface-300">
                    {job.department && (
                      <span className="flex items-center gap-1"><Building size={14} /> {job.department}</span>
                    )}
                    {job.location && (
                      <span className="flex items-center gap-1"><MapPin size={14} /> {job.location}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 max-w-2 ml-1"></span>
                      {job.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/3">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium text-surface-50">{job.resume_count || 0} Resumes</div>
                    <div className="text-xs text-surface-300">
                      Added {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-surface-300 group-hover:text-primary-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Modal ───────────────────────────────────────────────────── */}
      <CreateJobModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={() => refetch()}
      />
    </div>
  )
}
