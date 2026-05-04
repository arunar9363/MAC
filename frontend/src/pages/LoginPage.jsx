import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, Eye, EyeOff, Loader2, Sun, Moon } from 'lucide-react'
import useAuthStore from '@/context/authStore'
import useThemeStore from '@/context/themeStore'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email,  setEmail]  = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const { login, isLoading } = useAuthStore()
  const toggle = useThemeStore((s) => s.toggle)
  const navigate = useNavigate()

  const isDark = document.documentElement.classList.contains('dark')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Please fill all fields')
    const result = await login(email, password)
    if (result.success) { toast.success('Welcome back!'); navigate('/dashboard') }
    else toast.error(result.error)
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 transition-colors duration-300">
      <div className="fixed inset-0 dark:bg-mesh-dark bg-mesh-light opacity-50 pointer-events-none" />

      {/* Theme toggle */}
      <button onClick={toggle} className="fixed top-5 right-5 w-9 h-9 rounded-xl glass flex items-center justify-center z-10">
        {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-mac-500" />}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center mb-6">
            <span className="font-display font-bold text-3xl leading-none"
              style={{ color: '#22c55e' }}>MAC</span>
            <span className="text-muted text-xs font-mono tracking-widest mt-0.5">
              Medical Affective Computing
            </span>
          </Link>
          <h1 className="font-display text-3xl font-bold text-primary mb-1">Welcome back</h1>
          <p className="text-muted font-body text-sm">Sign in to your clinical workspace</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Email</label>
              <input type="email" className="input-field" placeholder="doctor@clinic.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-2">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="input-field pr-12"
                  placeholder="••••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary">
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading}
              className="btn-primary w-full mt-6 shadow-glow-mac">
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</>
                : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-muted text-sm mt-6">
            No account?{' '}
            <Link to="/register" className="text-mac-400 hover:text-mac-300 font-medium">
              Create one free
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
