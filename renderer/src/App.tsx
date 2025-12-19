import { useEffect, useState } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { Home } from './pages/Home'
import { Project } from './pages/Project'
import { Player } from './pages/Player'
import { Record } from './pages/Record'
import { Insights } from './pages/Insights'
import { Profile } from './pages/Profile'
import { Login } from './pages/Login'
import { VerifyEmail } from './pages/VerifyEmail'
import { ResetPassword } from './pages/ResetPassword'
import { ForgotPassword } from './pages/ForgotPassword'
import { SharedPageView } from './pages/SharedPageView'
import { VerificationGuard } from './components/auth/VerificationGuard'
import { useThemeStore } from './store/themeStore'
import { useUserStore } from './store/userStore'
import { useProjectStore } from './store/projectStore'
import { useAnalyticsStore } from './store/analyticsStore'
import { ToastContainer } from './components/Toast'
import { MediaPlayer } from './components/audio/MediaPlayer'
import { FloatingAddButton } from './components/common/FloatingAddButton'

// Protected Route wrapper moved outside to prevent re-renders
const ProtectedRoute = ({
  children,
  isInitialized,
  isAuthenticated,
}: {
  children: React.ReactNode
  isInitialized: boolean
  isAuthenticated: boolean
}) => {
  if (!isInitialized) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: 'var(--keyColor)' }}
        />
      </div>
    )
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  const theme = useThemeStore((state) => state.theme)
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)
  const fetchUser = useUserStore((state) => state.fetchUser)
  const currentTrack = useProjectStore((state) => state.currentTrack)
  // Optimize selector to prevent re-renders when analytics data changes
  const startSession = useAnalyticsStore((state) => state.startSession)
  const endSession = useAnalyticsStore((state) => state.endSession)

  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }, [theme])

  // Fetch user from database on app start
  useEffect(() => {
    const initApp = async () => {
      await fetchUser()
      setIsInitialized(true)
    }
    initApp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Load projects after authentication
  useEffect(() => {
    if (isAuthenticated && isInitialized) {
      const { loadProjects } = useProjectStore.getState()
      loadProjects().catch(console.error)
    }
  }, [isAuthenticated, isInitialized])

  // Start analytics session when authenticated and initialized
  useEffect(() => {
    if (isAuthenticated && isInitialized) {
      startSession()

      // End session on unmount or logout
      return () => {
        endSession()
      }
    }
    return undefined
  }, [isAuthenticated, isInitialized, startSession, endSession])

  if (!isInitialized) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: 'var(--keyColor)' }}
        />
      </div>
    )
  }

  return (
    <Router>
      {/* Toast Notification container */}
      <ToastContainer />

      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Public shared content route - No authentication required */}
        <Route path="/share/:token" element={<SharedPageView />} />

        {/* Protected routes - Wrapped in Layout (Sidebar + Header + Window Controls) */}
        <Route
          element={
            <ProtectedRoute isInitialized={isInitialized} isAuthenticated={isAuthenticated}>
              <VerificationGuard>
                <Layout />
              </VerificationGuard>
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/project/:id" element={<Project />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/record/:projectId" element={<Record />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Player route - Full screen */}
        {/* Lưu ý: Trang này đang nằm ngoài Layout nên sẽ không có Header/Window Controls. 
            Bạn cần thêm nút đóng/mở riêng vào trong component Player nếu muốn. */}
        <Route
          path="/player/:id"
          element={
            <ProtectedRoute isInitialized={isInitialized} isAuthenticated={isAuthenticated}>
              <VerificationGuard>
                <Player />
              </VerificationGuard>
            </ProtectedRoute>
          }
        />

        {/* Fallback 404 */}
        <Route
          path="*"
          element={
            <div
              className="flex items-center justify-center min-h-screen draggable"
              style={{ backgroundColor: 'var(--bg)' }}
            >
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--text)' }}>
                  404
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>Page not found</p>
                <button
                  onClick={() => window.history.back()}
                  className="mt-4 px-4 py-2 bg-[var(--keyColor)] text-white rounded hover:opacity-90"
                >
                  Go Back
                </button>
              </div>
            </div>
          }
        />
      </Routes>

      {/* Global Media Player & Floating Button - Always mounted */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center"
        style={{ paddingBottom: 'var(--space-6)' }}
      >
        <div
          className={`relative pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            currentTrack ? 'w-full max-w-4xl' : 'w-0'
          }`}
        >
          <div
            className={`transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              currentTrack ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <MediaPlayer />
          </div>

          {/* FloatingAddButton with fixed vertical position */}
          <div
            className="absolute bottom-0 pointer-events-auto flex items-center transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{
              left: currentTrack ? 'calc(100% - 130px)' : '50%',
              transform: currentTrack ? 'none' : 'translateX(-50%)',
              height: '64px',
            }}
          >
            <FloatingAddButton />
          </div>
        </div>
      </div>
    </Router>
  )
}

export default App
