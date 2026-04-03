import { useState, useRef, useEffect } from 'react'
import { LogOut, User, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { authService } from '../../services/auth'
import { useNavigate } from 'react-router-dom'

/**
 * Header — top bar with page title area and user avatar/logout.
 */
export default function Header() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  return (
    <>
      <header className="h-16 bg-surface-100 border-b border-surface-200 px-6 flex items-center justify-between shrink-0">
        <div className="text-sm text-surface-300 font-medium">
          AI Resume Screening System
        </div>
        
        {/* User Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown((prev) => !prev)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-surface-200 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold text-white shadow-sm ring-2 ring-surface-100 shrink-0">
              {user ? user.name.charAt(0).toUpperCase() : 'HR'}
            </div>
            <span className="text-sm text-surface-300 font-medium hidden sm:block">{user?.name}</span>
            <ChevronDown
              size={14}
              className={`text-surface-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-surface-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in">
              {/* User Info */}
              <div className="p-4 border-b border-surface-200 bg-surface-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {user ? user.name.charAt(0).toUpperCase() : 'HR'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                    <p className="text-xs text-surface-400 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-surface-300 hover:text-white hover:bg-surface-200 rounded-xl transition-colors"
                  onClick={() => setShowDropdown(false)}
                >
                  <User size={15} /> Profile
                </button>
                <button
                  onClick={() => { setShowDropdown(false); setShowLogoutModal(true) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors mt-0.5"
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-100/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-surface-200 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col p-6">
            <h3 className="text-xl font-bold text-white mb-2">Sign Out</h3>
            <p className="text-surface-300 mb-6 text-sm">Are you sure you want to log out?</p>
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-red-500/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

