/** JobsPage — list and create job postings. */
export default function JobsPage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Job Postings</h1>
        <button className="btn-primary">+ New Job</button>
      </div>
      <p className="text-surface-300 text-sm">Manage job descriptions and trigger AI screening.</p>
      {/* TODO: JobList component */}
    </div>
  )
}
