import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileText, Search, Filter, ArrowRight, Clock, Plus, Brain } from 'lucide-react'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'

function getRiskClass(risk) {
  const map = {
    critical: 'bg-red-500/15 border-red-500/40 text-red-400',
    high: 'bg-orange-500/15 border-orange-500/40 text-orange-400',
    moderate: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400',
    low: 'bg-green-500/15 border-green-500/40 text-green-400',
    minimal: 'bg-mac-600/15 border-green-500/40 text-mac-400',
  }
  return map[risk?.toLowerCase()] || 'bg-[var(--bg-secondary)] border-[var(--border)] text-muted'
}

function SkeletonRow() {
  return (
    <div className="p-4 flex items-center gap-3">
      <div className="skeleton w-9 h-9 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="skeleton h-3 w-28 rounded" />
        <div className="skeleton h-2.5 w-40 rounded" />
      </div>
      <div className="skeleton h-6 w-16 rounded-full flex-shrink-0" />
    </div>
  )
}

export default function ReportsPage() {
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api.get('/analyses')
      .then((r) => setAnalyses(r.data.analyses || []))
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])

  const filtered = analyses.filter((a) => {
    const matchSearch = !search ||
      a.patientId?.toLowerCase().includes(search.toLowerCase()) ||
      a.finalReport?.emotional_state?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || a.finalReport?.risk_level?.toLowerCase() === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-5 sm:mb-8 gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-4xl font-bold text-primary mb-1">Reports</h1>
          <p className="text-muted text-xs sm:text-sm">{analyses.length} total analyses</p>
        </div>
        <Link to="/analysis" className="btn-primary text-sm py-2 px-3 sm:px-4 flex-shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline"> New Analysis</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted" />
          <input
            type="text"
            className="input-field pl-9 text-sm"
            placeholder="Search patient or emotion..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Filter className="w-3.5 h-3.5 text-muted hidden sm:block" />
          <select
            className="input-field py-2.5 px-2 sm:px-3 w-auto cursor-pointer text-xs sm:text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {['all', 'critical', 'high', 'moderate', 'low', 'minimal'].map((v) => (
              <option key={v} value={v}>
                {v === 'all' ? 'All Risks' : v.charAt(0).toUpperCase() + v.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Desktop Table (hidden on mobile) ── */}
      <div className="card p-0 overflow-hidden hidden sm:block">
        <div
          className="p-4 grid grid-cols-12 gap-4 text-xs font-mono text-subtle uppercase tracking-wider"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="col-span-3">Patient ID</div>
          <div className="col-span-3">Emotional State</div>
          <div className="col-span-2">Risk Level</div>
          <div className="col-span-2">Confidence</div>
          <div className="col-span-2">Date</div>
        </div>

        {loading ? (
          <div>{[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Brain className="w-14 h-14 text-muted mx-auto mb-4 opacity-30" />
            <p className="text-muted text-sm mb-4">No analyses found</p>
            <Link to="/analysis" className="btn-primary text-sm py-2">
              <Plus className="w-4 h-4" /> Run First Analysis
            </Link>
          </div>
        ) : (
          filtered.map((a, i) => (
            <motion.div
              key={a._id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <Link
                to={`/reports/${a._id}`}
                className="p-4 sm:p-5 grid grid-cols-12 gap-4 items-center hover:bg-[var(--accent-soft)] transition-all group"
              >
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-mac-700 to-mac-900 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-mac-300" />
                  </div>
                  <span className="font-mono text-sm text-primary truncate">{a.patientId}</span>
                </div>
                <div className="col-span-3 text-muted text-sm capitalize truncate">
                  {a.finalReport?.emotional_state || '—'}
                </div>
                <div className="col-span-2">
                  <span className={`text-xs font-mono px-2.5 py-1 rounded-full border capitalize ${getRiskClass(a.finalReport?.risk_level)}`}>
                    {a.finalReport?.risk_level || 'pending'}
                  </span>
                </div>
                <div className="col-span-2 text-muted text-sm font-mono">
                  {a.finalReport?.confidence ? `${Math.round(a.finalReport.confidence * 100)}%` : '—'}
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-subtle text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatDate(a.createdAt)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted group-hover:text-mac-400 transition-colors" />
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>

      {/* ── Mobile Cards (hidden on desktop) ── */}
      <div className="sm:hidden space-y-2">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-4">
              <SkeletonRow />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Brain className="w-12 h-12 text-muted mx-auto mb-3 opacity-30" />
            <p className="text-muted text-sm mb-4">No analyses found</p>
            <Link to="/analysis" className="btn-primary text-sm py-2">
              <Plus className="w-4 h-4" /> Run First Analysis
            </Link>
          </div>
        ) : (
          filtered.map((a, i) => (
            <motion.div
              key={a._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={`/reports/${a._id}`}
                className="card p-4 flex items-center gap-3 hover:border-mac-500/40 transition-all group"
              >
                {/* Icon */}
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-mac-700 to-mac-900 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-mac-300" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-sm text-primary truncate">{a.patientId}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border capitalize flex-shrink-0 ${getRiskClass(a.finalReport?.risk_level)}`}>
                      {a.finalReport?.risk_level || 'pending'}
                    </span>
                  </div>
                  <p className="text-muted text-xs truncate capitalize">
                    {a.finalReport?.emotional_state || 'Pending analysis'}
                  </p>
                  <p className="text-subtle text-[10px] flex items-center gap-1 mt-0.5 font-mono">
                    <Clock className="w-2.5 h-2.5" /> {formatDate(a.createdAt)}
                  </p>
                </div>

                {/* Confidence + arrow */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs font-mono text-muted">
                    {a.finalReport?.confidence ? `${Math.round(a.finalReport.confidence * 100)}%` : '—'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-mac-400 transition-colors" />
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}