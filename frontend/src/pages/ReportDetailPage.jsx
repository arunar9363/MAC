import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Download, Brain, Eye, Mic, FileText, AlertTriangle,
  CheckCircle, Activity, Loader2, Clock, User, Zap
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area
} from 'recharts'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

function getRiskBadgeClass(risk) {
  const map = {
    critical: 'bg-red-500/15 border-red-500/40 text-red-400',
    high: 'bg-orange-500/15 border-orange-500/40 text-orange-400',
    moderate: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400',
    low: 'bg-green-500/15 border-green-500/40 text-green-400',
    minimal: 'bg-mac-600/15 border-mac-500/40 text-mac-400',
  }
  return map[risk?.toLowerCase()] || 'bg-[var(--bg-secondary)] border-[var(--border)] text-muted'
}

function MetricBar({ label, value, color = '#4d62ef' }) {
  const pct = Math.round((value || 0) * 100)
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-muted text-xs sm:text-sm">{label}</span>
        <span className="text-primary font-mono text-xs">{pct}%</span>
      </div>
      <div className="h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export default function ReportDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [prevReport, setPrevReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    api.get(`/analyses/${id}`)
      .then((r) => {
        setData(r.data.analysis)
        if (r.data.previousAnalysis) setPrevReport(r.data.previousAnalysis)
      })
      .catch(() => { toast.error('Report not found'); navigate('/reports') })
      .finally(() => setLoading(false))
  }, [id])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await api.get(`/analyses/${id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = `mac-report-${data?.patientId}-${id}.pdf`; a.click()
      URL.revokeObjectURL(url); toast.success('PDF downloaded!')
    } catch { toast.error('PDF generation failed') }
    finally { setDownloading(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-mac-400 mx-auto mb-3" />
        <p className="text-muted text-sm">Loading report...</p>
      </div>
    </div>
  )
  if (!data) return null

  const report = data.finalReport || {}
  const face = data.extractedFeatures?.face || {}
  const voice = data.extractedFeatures?.voice || {}
  const text = data.extractedFeatures?.text || {}

  const radarData = [
    { subject: 'Valence', value: (face.valence || 0.5) * 100 },
    { subject: 'Arousal', value: (face.arousal || 0.5) * 100 },
    { subject: 'Confidence', value: (report.confidence || 0.5) * 100 },
    { subject: 'Voice Energy', value: (voice.energy_mean || 0.5) * 100 },
    { subject: 'Text Pos.', value: ((text.compound || 0) + 1) * 50 },
  ]

  const emotionBars = Object.entries(face.emotions || {
    happy: 0.2, sad: 0.4, angry: 0.1, fearful: 0.15, disgusted: 0.05, surprised: 0.1
  }).map(([name, val]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: Math.round(val * 100),
  }))

  const trendData = prevReport
    ? [
      { time: 'Previous', confidence: Math.round((prevReport.finalReport?.confidence || 0.5) * 100) },
      { time: 'Current', confidence: Math.round((report.confidence || 0.5) * 100) },
    ]
    : null

  const tooltipStyle = {
    contentStyle: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      color: 'var(--text-primary)',
      fontSize: '12px',
    },
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-5 sm:mb-8 gap-3">
        <div className="min-w-0">
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-2 text-muted hover:text-primary transition-colors mb-3 sm:mb-4 text-xs sm:text-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Back to Reports
          </button>
          <h1 className="font-display text-xl sm:text-3xl font-bold text-primary mb-2">Clinical Report</h1>
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted font-mono flex-wrap">
            <span className="flex items-center gap-1"><User className="w-3 h-3 sm:w-4 sm:h-4" />{data.patientId}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 sm:w-4 sm:h-4" />{formatDate(data.createdAt)}</span>
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4 flex-shrink-0"
        >
          {downloading
            ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
            : <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          <span className="hidden sm:inline">{downloading ? 'Generating...' : 'Download PDF'}</span>
        </button>
      </div>

      {/* Risk banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 border flex items-start gap-3 sm:gap-4 ${getRiskBadgeClass(report.risk_level)}`}
      >
        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
            <span className="font-display text-base sm:text-xl font-bold capitalize">
              {report.risk_level || 'unknown'} Risk
            </span>
            <span className="font-mono text-xs sm:text-sm opacity-70">
              Confidence: {Math.round((report.confidence || 0) * 100)}%
            </span>
          </div>
          <p className="text-xs sm:text-sm opacity-90 capitalize">
            Emotional State: <strong>{report.emotional_state || 'Not determined'}</strong>
          </p>
        </div>
      </motion.div>

      {/* Patterns */}
      {report.patterns_detected?.length > 0 && (
        <div className="card mb-4 sm:mb-6 p-4 sm:p-5">
          <h3 className="font-display text-base sm:text-lg font-semibold text-primary mb-3 sm:mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" /> Detected Patterns
          </h3>
          <div className="flex flex-wrap gap-2">
            {report.patterns_detected.map((p, i) => (
              <span key={i} className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs sm:text-sm font-mono capitalize">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Charts — stacked on mobile, side by side on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="card p-4 sm:p-5">
          <h3 className="font-display text-sm sm:text-base font-semibold text-primary mb-3 sm:mb-4">
            Multimodal Signals
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="value" stroke="#4d62ef" fill="#4d62ef" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4 sm:p-5">
          <h3 className="font-display text-sm sm:text-base font-semibold text-primary mb-3 sm:mb-4">
            Facial Emotion Distribution
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={emotionBars} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="value" fill="#4d62ef" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Metrics — stacked on mobile, 3 cols on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-4 sm:mb-6">
        <div className="card p-4 sm:p-5">
          <h3 className="font-display text-xs sm:text-sm font-semibold text-primary mb-3 sm:mb-4 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-mac-400" /> Facial Features
          </h3>
          <MetricBar label="Valence" value={face.valence || 0.5} />
          <MetricBar label="Arousal" value={face.arousal || 0.5} color="#d946ef" />
          <MetricBar label="Confidence" value={face.confidence || 0.6} color="#22c55e" />
          <p className="text-xs text-subtle font-mono mt-3">Dominant: {face.dominant_emotion || 'neutral'}</p>
        </div>
        <div className="card p-4 sm:p-5">
          <h3 className="font-display text-xs sm:text-sm font-semibold text-primary mb-3 sm:mb-4 flex items-center gap-2">
            <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neuro-400" /> Voice Biomarkers
          </h3>
          <MetricBar label="Energy" value={voice.energy_mean || 0.5} color="#d946ef" />
          <MetricBar label="Pitch Var." value={voice.pitch_std ? Math.min(voice.pitch_std / 200, 1) : 0.4} color="#f59e0b" />
          <MetricBar label="Speech Rate" value={voice.speech_rate ? Math.min(voice.speech_rate / 5, 1) : 0.5} color="#06b6d4" />
          <p className="text-xs text-subtle font-mono mt-3">HNR: {voice.hnr?.toFixed(1) || '—'} dB</p>
        </div>
        <div className="card p-4 sm:p-5">
          <h3 className="font-display text-xs sm:text-sm font-semibold text-primary mb-3 sm:mb-4 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" /> Text Analysis
          </h3>
          <MetricBar label="Positive" value={text.pos || 0.3} color="#22c55e" />
          <MetricBar label="Negative" value={text.neg || 0.2} color="#ef4444" />
          <MetricBar label="Neutral" value={text.neu || 0.5} color="#6b7280" />
          <p className="text-xs text-subtle font-mono mt-3">Emotion: {text.emotion || 'neutral'}</p>
        </div>
      </div>

      {/* Modality signals — stacked on mobile, 3 cols on desktop */}
      {report.signals && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-4 sm:mb-6">
          {[
            { icon: Eye, title: 'Face Signals', content: report.signals.face, color: 'text-mac-400' },
            { icon: Mic, title: 'Voice Signals', content: report.signals.voice, color: 'text-neuro-400' },
            { icon: FileText, title: 'Text Signals', content: report.signals.text, color: 'text-green-400' },
          ].map(({ icon: Icon, title, content, color }) => (
            <div key={title} className="card p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${color}`} />
                <h3 className="font-display text-xs sm:text-sm font-semibold text-primary">{title}</h3>
              </div>
              <p className="text-muted text-xs sm:text-sm leading-relaxed">{content || 'No data'}</p>
            </div>
          ))}
        </div>
      )}

      {/* AI Explanation */}
      <div className="card mb-4 sm:mb-6 border-mac-600/30 p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-green-600 flex items-center justify-center shadow-glow-sm flex-shrink-0">
            <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h3 className="font-display text-base sm:text-lg font-semibold text-primary">Clinical AI Reasoning</h3>
            <p className="text-muted text-[10px] sm:text-xs font-mono">Groq LLaMA 3.3 multimodal agent</p>
          </div>
        </div>
        <div className="bg-[var(--bg-secondary)] rounded-xl p-4 sm:p-5" style={{ border: '1px solid var(--border)' }}>
          <p className="text-muted text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
            {report.explanation || 'No clinical explanation available.'}
          </p>
        </div>
      </div>

      {/* Trend */}
      {trendData && (
        <div className="card mb-4 sm:mb-6 p-4 sm:p-5">
          <h3 className="font-display text-base sm:text-lg font-semibold text-primary mb-2 sm:mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-mac-400" /> Patient Trend
          </h3>
          <p className="text-muted text-xs sm:text-sm mb-3 sm:mb-4">
            Comparison with previous analysis · {data.patientId}
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={trendData}>
              <CartesianGrid stroke="var(--border)" />
              <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="confidence" stroke="#4d62ef" fill="#4d62ef22" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer */}
      <div
        className="flex items-center justify-between p-3 sm:p-5 glass rounded-xl gap-3"
        style={{ border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted font-mono min-w-0">
          <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
          <span className="truncate">ID: {id}</span>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="btn-secondary text-xs sm:text-sm py-2 flex items-center gap-2 flex-shrink-0"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Download PDF Report</span>
          <span className="sm:hidden">PDF</span>
        </button>
      </div>
    </div>
  )
}