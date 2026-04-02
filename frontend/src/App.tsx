import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import Layout from '@components/layout/Layout'
import DashboardPage from '@pages/DashboardPage'
import JobsPage from '@pages/JobsPage'
import JobDetailPage from '@pages/JobDetailPage'
import UploadPage from '@pages/UploadPage'
import CandidatesPage from '@pages/CandidatesPage'
import CandidateDetailPage from '@pages/CandidateDetailPage'
import ScreeningPage from '@pages/ScreeningPage'
import NotFoundPage from '@pages/NotFoundPage'
import LoginPage from '@pages/auth/LoginPage'
import RegisterPage from '@pages/auth/RegisterPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="jobs/:jobId" element={<JobDetailPage />} />
        <Route path="jobs/:jobId/screen" element={<ScreeningPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="candidates" element={<CandidatesPage />} />
        <Route path="candidates/:candidateId" element={<CandidateDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
