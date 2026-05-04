import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import useAuthStore from '@/context/authStore'
import useThemeStore from '@/context/themeStore'

import LandingPage      from '@/pages/LandingPage'
import LoginPage        from '@/pages/LoginPage'
import RegisterPage     from '@/pages/RegisterPage'
import DashboardPage    from '@/pages/DashboardPage'
import AnalysisPage     from '@/pages/AnalysisPage'
import ReportsPage      from '@/pages/ReportsPage'
import ReportDetailPage from '@/pages/ReportDetailPage'
import DashboardLayout  from '@/components/dashboard/DashboardLayout'

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}
function PublicRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  if (token) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  const initAuth  = useAuthStore((s) => s.initAuth)
  const initTheme = useThemeStore((s) => s.init)

  useEffect(() => {
    initAuth()
    initTheme()
  }, [])

  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/"        element={<LandingPage />} />
        <Route path="/login"   element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardLayout><DashboardPage /></DashboardLayout></ProtectedRoute>
        } />
        <Route path="/analysis" element={
          <ProtectedRoute><DashboardLayout><AnalysisPage /></DashboardLayout></ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute><DashboardLayout><ReportsPage /></DashboardLayout></ProtectedRoute>
        } />
        <Route path="/reports/:id" element={
          <ProtectedRoute><DashboardLayout><ReportDetailPage /></DashboardLayout></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}
