import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Loader2, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { resumeService } from '../services/resumes'
import { useJobs } from '../hooks/useJobs'
import type { JobRole } from '../services/jobs'

type UploadStatus = 'pending' | 'uploading' | 'success' | 'error'

interface FileItem {
  id: string
  file: File
  status: UploadStatus
  progress: number
  error?: string
  resultName?: string
}

export default function UploadPage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  
  // Fetch available jobs to link resumes to
  const { data: jobs } = useJobs()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newItems = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: 'pending' as UploadStatus,
      progress: 0,
    }))
    setFiles(prev => [...prev, ...newItems])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const handleUploadAll = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error')
    if (pendingFiles.length === 0) return

    for (const item of pendingFiles) {
      // Mark as uploading
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f))
      
      try {
         const response = await resumeService.uploadResume(item.file, selectedJobId || undefined)
         setFiles(prev => prev.map(f => 
           f.id === item.id 
            ? { ...f, status: 'success', progress: 100, resultName: response.resume.candidate_name } 
            : f
         ))
      } catch (err: any) {
         setFiles(prev => prev.map(f => 
           f.id === item.id 
            ? { ...f, status: 'error', error: err.message || 'Upload failed' } 
            : f
         ))
      }
    }
  }

  const isUploading = files.some(f => f.status === 'uploading')
  const pendingCount = files.filter(f => f.status === 'pending' || f.status === 'error').length
  const allSuccess = files.length > 0 && files.every(f => f.status === 'success')

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up pb-10">
      
      <div>
        <h1 className="text-2xl font-bold text-surface-50">Upload Candidates</h1>
        <p className="text-surface-300 text-sm mt-1">
          Bulk drop PDF or DOCX resumes here. Our AI will automatically extract their details.
        </p>
      </div>

      <div className="card grid gap-6">
        <div>
          <label className="label">Target Job Role (Optional)</label>
          <select 
            className="input max-w-md"
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            disabled={isUploading}
          >
            <option value="">No specific role / General Pool</option>
            {jobs?.filter((j: JobRole) => j.status === 'open').map((job: JobRole) => (
              <option key={job.id} value={job.id}>{job.title} ({job.department || 'N/A'})</option>
            ))}
          </select>
        </div>

        {/* Dropzone Area */}
        <div 
          {...getRootProps()} 
          className={clsx(
            "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors duration-200",
            isDragActive ? "border-primary-500 bg-primary-900/10" : "border-surface-200 bg-surface-100 hover:bg-surface-200/50",
            isUploading && "pointer-events-none opacity-50"
          )}
        >
          <input {...getInputProps()} />
          <div className="w-16 h-16 bg-surface-200 text-primary-400 rounded-full flex items-center justify-center mb-4">
            <UploadCloud size={32} />
          </div>
          <p className="text-lg font-medium text-white mb-1">
            {isDragActive ? "Drop files here..." : "Drag & drop resumes"}
          </p>
          <p className="text-surface-300 text-sm">
            Supported formats: PDF, DOCX (Max 10MB per file)
          </p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-surface-200 pb-2">
              <h3 className="font-semibold text-white">Selected Files ({files.length})</h3>
              {pendingCount > 0 && (
                <button 
                  onClick={handleUploadAll}
                  disabled={isUploading}
                  className="btn-primary py-1.5 px-3 text-sm"
                >
                  {isUploading ? <><Loader2 className="animate-spin" size={16} /> Processing...</> : `Upload ${pendingCount} Files`}
                </button>
              )}
            </div>
            
            <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {files.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-surface-200/50 rounded-xl border border-surface-200">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="text-primary-400 shrink-0" size={24} />
                    <div className="truncate">
                      <p className="text-sm font-medium text-white truncate">{item.file.name}</p>
                      <p className="text-xs text-surface-300">
                         {(item.file.size / 1024 / 1024).toFixed(2)} MB
                         {item.resultName && <span className="text-primary-300 ml-2 border-l border-surface-300 pl-2">AI found: {item.resultName}</span>}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {item.status === 'pending' && !isUploading && (
                      <button onClick={() => removeFile(item.id)} className="text-surface-300 hover:text-red-400 transition-colors">
                        <X size={18} />
                      </button>
                    )}
                    {item.status === 'uploading' && <Loader2 className="animate-spin text-primary-400" size={20} />}
                    {item.status === 'success' && <CheckCircle2 className="text-green-400" size={20} />}
                    {item.status === 'error' && (
                      <div className="flex items-center gap-1 text-red-400" title={item.error}>
                        <AlertCircle size={18} />
                        <span className="text-xs hidden sm:inline w-24 truncate">{item.error}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {allSuccess && selectedJobId && (
              <div className="pt-4 mt-2 border-t border-surface-200/50 flex justify-end animate-fade-in">
                <Link to={`/jobs/${selectedJobId}/screen`} className="btn-primary shadow-lg shadow-primary-900/20 py-2.5 px-6">
                   <Sparkles size={18} className="mr-2" /> View Screening Results
                </Link>
              </div>
            )}
            
            {allSuccess && !selectedJobId && (
              <div className="pt-4 mt-2 border-t border-surface-200/50 flex justify-end animate-fade-in">
                <Link to={`/dashboard`} className="btn-secondary py-2.5 px-6">
                   Back to Dashboard
                </Link>
              </div>
            )}
            
          </div>
        )}
      </div>
      
    </div>
  )
}
