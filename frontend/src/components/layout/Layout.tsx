import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

/**
 * Layout — persistent shell wrapping all app pages.
 * Sidebar (navigation) + Header (breadcrumb/user menu) + page content.
 */
export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
