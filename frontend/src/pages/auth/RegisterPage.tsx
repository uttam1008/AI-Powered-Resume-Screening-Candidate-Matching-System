import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { UserPlus } from 'lucide-react'
import { authService } from '../../services/auth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await authService.register(name, email, password)
      toast.success('Account created! Please log in.')
      navigate('/login')
    } catch (err: any) {
      toast.error(err.message || 'Failed to register')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div className="card w-full max-w-md animate-slide-up">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary-600/20 text-primary-400 rounded-full flex items-center justify-center mb-4">
            <UserPlus size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Create Account</h1>
          <p className="text-surface-300 text-sm">Join AI Screen to manage applications</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="label">Full Name</label>
            <input
              type="text"
              required
              className="input"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              required
              className="input"
              placeholder="hr@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="btn-primary w-full mt-2"
          >
            {isLoading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-surface-300">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 font-medium hover:text-primary-300 transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
