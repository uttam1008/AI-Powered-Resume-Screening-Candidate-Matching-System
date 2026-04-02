import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { jobService, type JobRoleCreate } from '../../services/jobs'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateJobModal({ isOpen, onClose, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<JobRoleCreate>({
    title: '',
    department: '',
    location: '',
    description: '',
    requirements: '',
    experience_min: 0,
    experience_max: 5,
  })

  if (!isOpen) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await jobService.createJob(formData)
      toast.success('Job role created successfully!')
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create job role')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-100/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-surface-200 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-200 shrink-0">
          <h2 className="text-xl font-bold text-white">Create New Job Role</h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-surface-300 hover:text-white hover:bg-surface-200 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="create-job-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="label">Job Title *</label>
              <input
                required
                name="title"
                className="input"
                placeholder="e.g. Senior Software Engineer"
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label">Department</label>
                <input
                  name="department"
                  className="input"
                  placeholder="e.g. Engineering"
                  value={formData.department}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label">Location</label>
                <input
                  name="location"
                  className="input"
                  placeholder="e.g. Remote / New York"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="label">Job Description *</label>
              <textarea
                required
                name="description"
                rows={4}
                className="input resize-none"
                placeholder="Describe the role responsibilities..."
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="label">Requirements *</label>
              <textarea
                required
                name="requirements"
                rows={4}
                className="input resize-none"
                placeholder="List skills, qualifications, tech stack..."
                value={formData.requirements}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-5 border-t border-surface-200 pt-5 mt-2">
              <div>
                <label className="label">Min Experience (Years)</label>
                <input
                  type="number"
                  name="experience_min"
                  min="0"
                  className="input"
                  value={formData.experience_min}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label">Max Experience (Years)</label>
                <input
                  type="number"
                  name="experience_max"
                  min="0"
                  className="input"
                  value={formData.experience_max}
                  onChange={handleChange}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-surface-200 bg-surface-100 flex items-center justify-end gap-3 rounded-b-2xl shrink-0">
          <button 
            type="button" 
            onClick={onClose} 
            className="btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="create-job-form"
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Role'}
          </button>
        </div>
        
      </div>
    </div>
  )
}
