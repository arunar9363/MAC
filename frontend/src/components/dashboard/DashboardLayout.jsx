import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Microscope, FileText, LogOut, Menu, X, ChevronRight, Bell, User, Sun, Moon } from 'lucide-react'
import useAuthStore from '@/context/authStore'
import useThemeStore from '@/context/themeStore'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analysis', icon: Microscope, label: 'New Analysis' },
  { to: '/reports', icon: FileText, label: 'Reports' },
]

function ThemeToggle() {
  const toggle = useThemeStore((s) => s.toggle)
  const isDark = document.documentElement.classList.contains('dark')
  return (
    <button
      onClick={toggle}
      className="w-8 h-8 rounded-lg glass flex items-center justify-center transition-all hover:scale-105"
      title="Toggle theme"
    >
      {isDark
        ? <Sun className="w-4 h-4 text-yellow-400" />
        : <Moon className="w-4 h-4 text-mac-500" />}
    </button>
  )
}

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Signed out')
    navigate('/')
  }

  const handleNavClick = () => {
    // Close mobile sidebar on nav click
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-surface flex transition-colors duration-300">

      {/* ── Mobile Overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── Mobile Sidebar (Drawer) ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed left-0 top-0 h-full w-64 z-40 flex flex-col glass-strong lg:hidden"
            style={{ borderRight: '1px solid var(--border)' }}
          >
            {/* Logo row */}
            <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-xl leading-none" style={{ color: '#22c55e' }}>MAC</p>
                <p className="text-subtle text-[10px] font-mono truncate mt-0.5">Affective Computing</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-muted hover:text-primary transition-colors p-1 rounded-lg hover:bg-[var(--accent-soft)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 p-2.5 space-y-1">
              {NAV.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/dashboard'}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                     ${isActive ? 'nav-active font-semibold' : 'text-muted hover:text-primary hover:bg-[var(--accent-soft)]'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-mac-400' : ''}`} />
                      <span className="font-body text-sm">{label}</span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-mac-400" />}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* User + logout */}
            <div className="p-2.5 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl glass">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-600 to-emerald-400 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate leading-none">{user?.name}</p>
                  <p className="text-xs text-muted truncate mt-0.5">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-body">Sign Out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Desktop Sidebar ── */}
      <motion.aside
        animate={{ width: desktopCollapsed ? 68 : 256 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="hidden lg:flex flex-shrink-0 h-screen sticky top-0 z-20 flex-col glass-strong"
        style={{ borderRight: '1px solid var(--border)' }}
      >
        {/* Logo row */}
        <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <AnimatePresence>
            {!desktopCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="flex-1 min-w-0"
              >
                <p className="font-display font-bold text-xl leading-none" style={{ color: '#22c55e' }}>MAC</p>
                <p className="text-subtle text-[10px] font-mono truncate mt-0.5">Affective Computing</p>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setDesktopCollapsed(!desktopCollapsed)}
            className="ml-auto flex-shrink-0 text-muted hover:text-primary transition-colors p-1 rounded-lg hover:bg-[var(--accent-soft)]"
          >
            {desktopCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-2.5 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                 ${isActive ? 'nav-active font-semibold' : 'text-muted hover:text-primary hover:bg-[var(--accent-soft)]'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-mac-400' : ''}`} />
                  <AnimatePresence>
                    {!desktopCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="font-body text-sm whitespace-nowrap"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {isActive && !desktopCollapsed && (
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-mac-400" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="p-2.5 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl glass">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-600 flex items-center justify-center flex-shrink-0">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <AnimatePresence>
              {!desktopCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-medium text-primary truncate leading-none">{user?.name}</p>
                  <p className="text-xs text-muted truncate mt-0.5">{user?.email}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!desktopCollapsed && <span className="text-sm font-body">Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* ── Main area ── */}
      <main className="flex-1 overflow-auto min-w-0">

        {/* Topbar */}
        <div
          className="sticky top-0 z-10 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between glass-strong"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-8 h-8 rounded-lg glass flex items-center justify-center text-muted hover:text-primary transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="font-display font-bold text-base" style={{ color: '#22c55e' }}>MAC</span>
            <span className="text-subtle text-xs font-mono hidden sm:inline">· Medical Affective Computing</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button className="w-8 h-8 rounded-lg glass flex items-center justify-center text-muted hover:text-primary transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-mac-500" />
            </button>
          </div>
        </div>

        {/* Page content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {children}
          </motion.div>
        </div>

        {/* ── Mobile Bottom Nav ── */}
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-20 glass-strong flex items-center justify-around px-2 py-2"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all
                 ${isActive ? 'text-mac-400' : 'text-muted'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-mac-400' : 'text-muted'}`} />
                  <span className={`text-[10px] font-body ${isActive ? 'text-mac-400 font-semibold' : 'text-muted'}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Bottom padding for mobile nav */}
        <div className="lg:hidden h-16" />
      </main>
    </div>
  )
}