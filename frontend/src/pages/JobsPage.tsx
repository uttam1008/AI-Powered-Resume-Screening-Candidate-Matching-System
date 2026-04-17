import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { Briefcase, MapPin, Building, Loader2, PlusCircle, Sparkles, Clock, Users, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { clsx } from 'clsx'
import { jobService, type JobRole } from '../services/jobs'
import CreateJobModal from '../components/jobs/CreateJobModal'

const STATUS_STYLES: Record<string, string> = {
  open:     'bg-green-500/10 text-green-400 border-green-500/20',
  draft:    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  closed:   'bg-red-500/10 text-red-400 border-red-500/20',
  archived: 'bg-surface-200 text-surface-300 border-surface-200',
}

export default function JobsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [confirmDeleteJobId, setConfirmDeleteJobId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: jobs, isLoading, isError } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobService.getJobs(),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'open' | 'closed' }) => 
      jobService.updateJobStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      toast.success(`Position ${data.title} is now ${data.status}`)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err.message || 'Failed to update position schedule')
    }
  })

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['jobs'] })
  }

  const deleteJobMutation = useMutation({
    mutationFn: (id: string) => jobService.deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      toast.success('Job role deleted successfully.')
      setConfirmDeleteJobId(null)
    },
    onError: () => {
      toast.error('Failed to delete job role. Try again.')
      setConfirmDeleteJobId(null)
    },
  })

  return (
    <div className="space-y-6 animate-slide-up pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Job Postings</h1>
          <p className="text-surface-300 text-sm mt-1">Manage job descriptions and trigger AI screening.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary shadow-lg shadow-primary-900/20">
          <PlusCircle size={18} className="mr-1" /> New Job Role
        </button>
      </div>

      {/* State: Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-20 text-surface-300">
          <Loader2 className="animate-spin text-primary-400 mb-4" size={36} />
          <p className="text-sm">Fetching job roles...</p>
        </div>
      )}

      {/* State: Error */}
      {isError && (
        <div className="card p-8 text-center text-red-400 bg-red-900/10 border-red-500/20">
          Failed to load jobs. Ensure the backend is running.
        </div>
      )}

      {/* State: Empty */}
      {!isLoading && !isError && jobs?.length === 0 && (
        <div className="card p-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-surface-200 rounded-full flex items-center justify-center text-surface-300 mb-4">
            <Briefcase size={28} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Job Roles Yet</h3>
          <p className="text-surface-300 text-sm max-w-sm mb-6">
            Create your first job role to start uploading resumes and running AI screening.
          </p>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            <PlusCircle size={18} /> Create First Role
          </button>
        </div>
      )}

      {/* State: Data */}
      {!isLoading && !isError && jobs && jobs.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {jobs.map((job: JobRole) => (
            <div
              key={job.id}
              className="card flex flex-col gap-4 hover:border-primary-700/50 hover:shadow-lg hover:shadow-primary-900/10 transition-all duration-200"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-white leading-snug">{job.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-surface-300">
                    {job.department && (
                      <span className="flex items-center gap-1"><Building size={12} />{job.department}</span>
                    )}
                    {job.location && (
                      <span className="flex items-center gap-1"><MapPin size={12} />{job.location}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <span className={clsx('px-2.5 py-1 text-xs font-semibold rounded-full border capitalize shrink-0', STATUS_STYLES[job.status] ?? STATUS_STYLES.archived)}>
                  {job.status}
                </span>
              </div>

              {/* Description preview */}
              <p className="text-sm text-surface-300 line-clamp-2 leading-relaxed">{job.description}</p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-surface-200 mt-auto">
                <span className="flex items-center gap-1.5 text-sm text-surface-300">
                  <Users size={14} />
                  <strong className="text-white">{job.resume_count ?? 0}</strong> Resumes
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: job.id, status: 'open' })}
                    disabled={job.status === 'open' || updateStatusMutation.isPending}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border",
                      job.status !== 'open'
                        ? "bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20"
                        : "bg-surface-200/50 text-surface-400 border-transparent opacity-50 cursor-not-allowed"
                    )}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: job.id, status: 'closed' })}
                    disabled={job.status === 'closed' || updateStatusMutation.isPending}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border",
                      job.status !== 'closed'
                        ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
                        : "bg-surface-200/50 text-surface-400 border-transparent opacity-50 cursor-not-allowed"
                    )}
                  >
                    Close
                  </button>
                  <Link
                    to={`/jobs/${job.id}/screen`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
                  >
                    <Sparkles size={13} /> Screen
                  </Link>
                  <Link
                    to={`/jobs/${job.id}`}
                    className="px-3 py-1.5 text-xs font-semibold bg-surface-200 hover:bg-surface-300/60 text-surface-50 rounded-lg transition-colors"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => setConfirmDeleteJobId(job.id)}
                    title="Delete Job Role"
                    className="p-1.5 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors border border-red-800/20"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateJobModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />

      {/* Delete Job Confirmation Dialog */}
      {confirmDeleteJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-surface-200 rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-red-900/30 border border-red-800/40 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Job Role?</h3>
                <p className="text-sm text-surface-300 mt-0.5">This will permanently delete the job role and all its screening results. Uploaded resumes will be unlinked but not deleted.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteJobId(null)}
                className="btn-secondary px-4 py-2 text-sm"
                disabled={deleteJobMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteJobMutation.mutate(confirmDeleteJobId)}
                disabled={deleteJobMutation.isPending}
                className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all flex items-center gap-2 shadow-md shadow-red-900/30"
              >
                <Trash2 size={14} />
                {deleteJobMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
