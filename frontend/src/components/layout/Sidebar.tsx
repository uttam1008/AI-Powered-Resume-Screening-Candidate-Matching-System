import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, Upload, Users } from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { to: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/jobs',      label: 'Jobs',       icon: Briefcase },
  { to: '/upload',    label: 'Upload',     icon: Upload },
  { to: '/candidates',label: 'Candidates', icon: Users },
]

export default function Sidebar() {
  return (
    <aside className="w-60 bg-surface-100 border-r border-surface-200 flex flex-col py-6 px-3 gap-1 shrink-0">
      {/* Logo */}
      <div className="px-3 mb-6">
        <span className="text-xl font-bold text-primary-400 tracking-tight">
          AI<span className="text-surface-50">Screen</span>
        </span>
      </div>

      {/* Nav links */}
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              isActive
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-surface-300 hover:bg-surface-200 hover:text-surface-50',
            )
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </aside>
  )
}
