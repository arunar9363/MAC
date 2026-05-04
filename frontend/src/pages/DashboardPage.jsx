import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Activity, FileText, Users, TrendingUp, Plus, ArrowRight, Brain, Clock } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import useAuthStore from '@/context/authStore'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'

const RADAR_DEFAULT = [
  { subject: 'Valence', A: 0.6 },
  { subject: 'Arousal', A: 0.4 },
  { subject: 'Confidence', A: 0.75 },
  { subject: 'Stability', A: 0.55 },
  { subject: 'Engagement', A: 0.8 },
]

function getRiskClass(risk) {
  const map = {
    critical: 'bg-red-500/15 border-red-500/40 text-red-400',
    high: 'bg-orange-500/15 border-orange-500/40 text-orange-400',
    moderate: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400',
    low: 'bg-green-500/15 border-green-500/40 text-green-400',
    minimal: 'bg-mac-600/15 border-mac-500/40 text-mac-400',
  }
  return map[risk?.toLowerCase()] || 'bg-[var(--bg-secondary)] border-[var(--border)] text-muted'
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/analyses/stats'), api.get('/analyses?limit=5')])
      .then(([s, r]) => { setStats(s.data); setRecent(r.data.analyses || []) })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label: 'Total Analyses', value: stats?.total ?? 0, icon: Activity, color: 'text-mac-400', bg: 'from-mac-600/15 to-mac-800/5' },
    { label: 'Patients', value: stats?.patients ?? 0, icon: Users, color: 'text-neuro-400', bg: 'from-neuro-600/15 to-neuro-800/5' },
    { label: 'Reports', value: stats?.reports ?? 0, icon: FileText, color: 'text-green-400', bg: 'from-green-600/15 to-green-800/5' },
    {
      label: 'Avg Confidence',
      value: stats?.avgConfidence ? `${Math.round(stats.avgConfidence * 100)}%` : '—',
      icon: TrendingUp,
      color: 'text-yellow-400',
      bg: 'from-yellow-600/15 to-yellow-800/5',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 sm:mb-10 gap-3">
        <div className="min-w-0">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-1 truncate"
          >
            Good {getGreeting()}, {user?.name?.split(' ')[0]}
          </motion.h1>
          <p className="text-muted font-body text-xs sm:text-sm">Your clinical intelligence workspace</p>
        </div>
        <Link to="/analysis" className="btn-primary text-sm py-2 px-3 sm:px-4 flex-shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Analysis</span>
        </Link>
      </div>

      {/* Stat cards — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8">
        {statCards.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`card bg-gradient-to-br ${s.bg} p-4 sm:p-5`}
          >
            <s.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${s.color} mb-2 sm:mb-3`} />
            <p className="font-display text-2xl sm:text-3xl font-bold text-primary mb-0.5 sm:mb-1">{s.value}</p>
            <p className="text-muted text-xs sm:text-sm leading-tight">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Bottom grid — stacked on mobile, 3 cols on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Recent analyses — full width mobile, 2/3 desktop */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="font-display text-lg sm:text-xl font-semibold text-primary">Recent Analyses</h2>
            <Link to="/reports" className="text-mac-400 hover:text-mac-300 text-xs sm:text-sm flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-14 sm:h-16 rounded-xl" />)}
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Brain className="w-10 h-10 sm:w-12 sm:h-12 text-muted mx-auto mb-3 opacity-40" />
              <p className="text-muted text-sm mb-4">No analyses yet. Run your first one!</p>
              <Link to="/analysis" className="btn-primary text-sm py-2">
                <Plus className="w-4 h-4" /> Start Analysis
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((item) => (
                <Link
                  key={item._id}
                  to={`/reports/${item._id}`}
                  className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl glass hover:border-mac-500/40 transition-all group"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-green-600 to-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-primary text-xs sm:text-sm font-mono truncate">{item.patientId}</p>
                    <p className="text-muted text-xs flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{formatDate(item.createdAt)}</span>
                    </p>
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border capitalize flex-shrink-0 ${getRiskClass(item.finalReport?.risk_level)}`}>
                    {item.finalReport?.risk_level || 'pending'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-mac-400 transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Radar chart — full width mobile, 1/3 desktop */}
        <div className="card">
          <h2 className="font-display text-lg sm:text-xl font-semibold text-primary mb-4 sm:mb-5">Signal Overview</h2>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={RADAR_DEFAULT}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <Radar name="Signal" dataKey="A" stroke="#4d62ef" fill="#4d62ef" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <p className="text-subtle text-xs text-center mt-2 font-mono">Aggregate multimodal profile</p>
        </div>

      </div>
    </div>
  )
}