import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { LogIn } from 'lucide-react'
import { authService } from '../../services/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await authService.login(email, password)
      toast.success('Successfully logged in!')
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      toast.error(err.message || 'Failed to login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div className="card w-full max-w-md animate-slide-up">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary-600/20 text-primary-400 rounded-full flex items-center justify-center mb-4">
            <LogIn size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Welcome Back</h1>
          <p className="text-surface-300 text-sm">Sign in to your AI Screen account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="label !mb-0">Password</label>
              <a href="#" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">Forgot password?</a>
            </div>
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
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-surface-300">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-400 font-medium hover:text-primary-300 transition-colors">
            Create one now
          </Link>
        </div>
      </div>
    </div>
  )
}
