import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 animate-fade-in">
      <h1 className="text-6xl font-bold text-primary-600">404</h1>
      <p className="text-surface-300">Page not found.</p>
      <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
    </div>
  )
}
