import { LogOut } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { authService } from '../../services/auth'
import { useNavigate } from 'react-router-dom'

/**
 * Header — top bar with page title area and user avatar/logout.
 */
export default function Header() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  return (
    <header className="h-16 bg-surface-100 border-b border-surface-200 px-6 flex items-center justify-between shrink-0">
      <div className="text-sm text-surface-300 font-medium">
        AI Resume Screening System
      </div>
      
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-surface-300 font-medium hidden sm:block">
            {user.name}
          </span>
        )}
        <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold text-white shadow-sm ring-2 ring-surface-100">
          {user ? user.name.charAt(0).toUpperCase() : 'HR'}
        </div>
        
        <button 
          onClick={handleLogout}
          className="p-2 text-surface-300 hover:text-red-400 hover:bg-surface-200 rounded-lg transition-colors ms-2"
          title="Sign Out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
