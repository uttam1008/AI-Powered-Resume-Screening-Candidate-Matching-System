import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Building, MapPin, Loader2, Sparkles, Files } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { jobService } from '../services/jobs'

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()

  const { data: job, isLoading, isError } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobService.getById(jobId!),
    enabled: !!jobId,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-fade-in text-surface-300">
        <Loader2 className="animate-spin text-primary-400 mb-4" size={40} />
        <h2 className="text-xl font-medium text-white mb-2">Loading Job Details...</h2>
      </div>
    )
  }

  if (isError || !job) {
    return (
      <div className="p-8 text-center text-red-400">Failed to load job details.</div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up pb-10">
      
      {/* ── Header Area ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div>
          <Link to="/dashboard" className="text-surface-300 hover:text-white flex items-center gap-1 text-sm mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-surface-50">
            {job.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-surface-300">
            {job.department && (
              <span className="flex items-center gap-1.5 bg-surface-200/50 px-2.5 py-1 rounded-md"><Building size={14} /> {job.department}</span>
            )}
            {job.location && (
              <span className="flex items-center gap-1.5 bg-surface-200/50 px-2.5 py-1 rounded-md"><MapPin size={14} /> {job.location}</span>
            )}
            <span className="flex items-center gap-1.5 bg-surface-200/50 px-2.5 py-1 rounded-md">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </span>
            <span className="text-surface-400 border-l border-surface-200 pl-4">
               Added {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-3 shrink-0">
          <Link 
            to={`/jobs/${job.id}/screen`}
            className="btn-primary shadow-lg shadow-primary-900/20 py-2.5 px-5 text-base"
          >
            <Sparkles size={18} className="mr-2" />
            Screen Candidates
          </Link>
          <div className="flex items-center gap-2 text-surface-300 bg-surface-100 border border-surface-200 px-4 py-2 rounded-xl text-sm font-medium w-full justify-center">
            <Files size={16} className="text-primary-400" />
            <span>{job.resume_count || 0} Resumes Uploaded</span>
          </div>
        </div>
      </div>

      {/* ── Content Area ───────────────────────────────────────────────────── */}
      <div className="grid gap-6">
         <div className="card p-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-surface-300 mb-4 border-b border-surface-200 pb-2">Description</h2>
            <div className="text-surface-50 whitespace-pre-wrap leading-relaxed">
               {job.description}
            </div>
         </div>

         <div className="card p-8 bg-surface-100/50">
            <h2 className="text-sm font-bold uppercase tracking-wider text-surface-300 mb-4 border-b border-surface-200 pb-2">Requirements</h2>
            <div className="text-surface-50 whitespace-pre-wrap leading-relaxed">
               {job.requirements}
            </div>
         </div>
      </div>
    </div>
  )
}
