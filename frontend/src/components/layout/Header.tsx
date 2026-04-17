import { useState, useRef, useEffect } from 'react'
import { LogOut, ChevronDown, LineChart, FileText, Target, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { authService } from '../../services/auth'
import { analyticsService } from '../../services/analytics'
import { useNavigate, Link } from 'react-router-dom'

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

  const { data: userStats, isLoading: loadingStats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => analyticsService.getUserStats(),
    enabled: showDropdown
  })

  return (
    <>
      <header className="h-16 bg-surface-100 border-b border-surface-200 px-6 flex items-center justify-between shrink-0">
        <div className="text-sm text-surface-300 font-medium">
          AI Resume Screening System
        </div>
        <div className="flex items-center gap-4">
          <Link 
            to="/candidates"
            className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-600/10 text-primary-400 hover:bg-primary-600/20 text-sm font-semibold transition-colors border border-primary-500/20 shadow-sm"
          >
            <Users size={16} /> Global Talent Vault
          </Link>
          
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
            <div className="absolute right-0 top-full mt-2 w-[340px] bg-surface-200/50 p-2 border border-surface-200 rounded-[28px] shadow-2xl z-50 overflow-hidden animate-fade-in backdrop-blur-xl">
              
              {/* Google-like Profile Card Inner */}
              <div className="bg-surface rounded-t-[20px] rounded-b-[4px] p-6 flex flex-col items-center text-center relative border border-surface-200/50">
                 {/* Email at the top */}
                 <p className="text-xs text-surface-300 font-medium tracking-wide mb-4">{user?.email}</p>
                 
                 {/* Big Avatar */}
                 <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg ring-4 ring-surface-100 mb-3 shrink-0">
                   {user ? user.name.charAt(0).toUpperCase() : 'HR'}
                 </div>
                 
                 {/* Greeting */}
                 <h2 className="text-[22px] text-white font-medium mb-6">Hi, {user?.name?.split(' ')[0]}!</h2>

                 {/* Manage Account Pill */}
                 <button 
                   onClick={() => setShowDropdown(false)}
                   className="px-6 py-2 rounded-full border border-surface-300 text-surface-50 font-medium text-sm hover:bg-surface-200 hover:text-white transition-colors"
                 >
                   Manage your account
                 </button>
              </div>

              {/* Enhanced Insights Panel */}
              <div className="bg-surface rounded-[4px] mt-[2px] p-4 border border-surface-200/50 flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <LineChart size={16} className="text-primary-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-surface-400">HR Quick Insights</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div className="bg-surface-100 p-2.5 rounded-xl border border-surface-200">
                    <div className="text-[10px] text-surface-400 font-medium mb-1 flex items-center gap-1">
                      <FileText size={10} /> Evaluated
                    </div>
                    <div className="text-lg font-bold text-white">
                      {loadingStats ? '...' : userStats?.total_evaluated || 0}
                    </div>
                  </div>
                  
                  <div className="bg-surface-100 p-2.5 rounded-xl border border-surface-200">
                    <div className="text-[10px] text-surface-400 font-medium mb-1 flex items-center gap-1">
                      <Target size={10} /> Avg Hired Match
                    </div>
                    <div className="text-lg font-bold text-green-400">
                      {loadingStats ? '...' : `${userStats?.accuracy || 0}%`}
                    </div>
                  </div>

                  <div className="col-span-2 bg-surface-100 p-2.5 rounded-xl border border-surface-200 flex items-center justify-between">
                    <span className="text-xs text-surface-400">Top Hiring Skill</span>
                    <span className="text-xs font-bold text-primary-300 px-2 py-1 bg-primary-900/30 rounded border border-primary-800/50">
                      {loadingStats ? '...' : userStats?.top_skill || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sign Out Section below it */}
              <div className="bg-surface rounded-b-[20px] rounded-t-[4px] mt-[2px] overflow-hidden border border-surface-200/50">
                <button
                  onClick={() => { setShowDropdown(false); setShowLogoutModal(true) }}
                  className="w-full flex items-center justify-center gap-2.5 px-3 py-4 text-sm font-medium text-surface-300 hover:text-white hover:bg-surface-200 transition-colors"
                >
                  <LogOut size={18} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
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

