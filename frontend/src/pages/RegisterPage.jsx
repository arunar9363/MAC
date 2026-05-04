import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, Loader2, Sun, Moon } from 'lucide-react'
import useAuthStore from '@/context/authStore'
import useThemeStore from '@/context/themeStore'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const { register, isLoading } = useAuthStore()
  const toggle = useThemeStore((s) => s.toggle)
  const navigate = useNavigate()
  const isDark = document.documentElement.classList.contains('dark')

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) return toast.error('Fill all fields')
    if (form.password !== form.confirm) return toast.error('Passwords do not match')
    if (form.password.length < 8) return toast.error('Password must be 8+ characters')
    const result = await register(form.name, form.email, form.password)
    if (result.success) { toast.success('Account created!'); navigate('/dashboard') }
    else toast.error(result.error)
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 transition-colors duration-300">
      <div className="fixed inset-0 dark:bg-mesh-dark bg-mesh-light opacity-50 pointer-events-none" />

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
          <h1 className="font-display text-3xl font-bold text-primary mb-1">Create account</h1>
          <p className="text-muted text-sm">Start your clinical emotion analysis workspace</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Full Name',        key: 'name',     type: 'text',     ph: 'Dr. Jane Smith' },
              { label: 'Email',            key: 'email',    type: 'email',    ph: 'jane@clinic.com' },
              { label: 'Password',         key: 'password', type: 'password', ph: 'Min 8 characters' },
              { label: 'Confirm Password', key: 'confirm',  type: 'password', ph: 'Repeat password' },
            ].map(({ label, key, type, ph }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-muted mb-2">{label}</label>
                <input type={type} className="input-field" placeholder={ph}
                  value={form[key]} onChange={update(key)} />
              </div>
            ))}
            <button type="submit" disabled={isLoading}
              className="btn-primary w-full mt-6 shadow-glow-mac">
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-muted text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-mac-400 hover:text-mac-300 font-medium">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
