import { useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, Activity, Shield, ChevronRight, Zap, Eye, Mic, FileText, ArrowRight, Sun, Moon } from 'lucide-react'
import useThemeStore from '@/context/themeStore'

const FEATURES = [
  {
    icon: Eye,
    title: 'Facial Analysis',
    desc: 'DeepFace & MediaPipe detect micro-expressions, valence, arousal, and AU patterns across video frames.',
    color: 'from-green-600 to-green-400',
    glow: 'rgba(77,98,239,0.3)',
  },
  {
    icon: Mic,
    title: 'Voice Biomarkers',
    desc: 'Librosa extracts MFCCs, pitch, energy, jitter, shimmer and HNR as clinical affective signals.',
    color: 'from-green-600 to-green-400',
    glow: 'rgba(217,70,239,0.3)',
  },
  {
    icon: FileText,
    title: 'NLP Cognition',
    desc: 'HuggingFace transformers analyze semantic tone, cognitive distortions, and hopelessness markers.',
    color: 'from-green-600 to-green-400',
    glow: 'rgba(120,80,250,0.3)',
  },
  {
    icon: Brain,
    title: 'AI Clinical Reasoning',
    desc: 'Groq-powered LLaMA agent fuses all modalities and reasons like an experienced clinical psychologist.',
    color: 'from-green-600 to-green-400',
    glow: 'rgba(217,70,239,0.25)',
  },
]

const STATS = [
  { value: '94.2%', label: 'Detection Accuracy' },
  { value: '< 30s', label: 'Analysis Time' },
  { value: '3-Modal', label: 'Fusion Pipeline' },
  { value: 'HIPAA', label: 'Ready Architecture' },
]

/* ── Neural Network Canvas ─────────────────────────────── */
function NeuralCanvas() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const isDark = useThemeStore((s) => s.isDark)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const dark = document.documentElement.classList.contains('dark')

    const NODE_COUNT = 60
    const MAX_DIST = 120
    const PULSE_NODES = 10

    if (!canvas._nodes) {
      canvas._nodes = Array.from({ length: NODE_COUNT }, (_, i) => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 2 + 1,
        baseR: Math.random() * 2 + 1,
        phase: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.025,
        pulse: i < PULSE_NODES,
        layer: Math.floor(Math.random() * 3),
      }))
      canvas._t = 0
    }

    const nodes = canvas._nodes
    canvas._t += 1
    ctx.clearRect(0, 0, W, H)

    const layerColor = dark
      ? ['#6f87f6', '#d946ef', '#4d62ef']
      : ['#3a46e3', '#a21caf', '#2b2ea3']

    nodes.forEach((a, i) => {
      nodes.slice(i + 1).forEach((b) => {
        const dx = a.x - b.x
        const dy = a.y - b.y
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < MAX_DIST) {
          const alpha = (1 - d / MAX_DIST) * (dark ? 0.18 : 0.10)
          const pulsing = (a.pulse || b.pulse)
            ? 0.5 + 0.5 * Math.sin(canvas._t * 0.04 + a.phase)
            : 1
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = dark
            ? `rgba(99,120,246,${alpha * pulsing})`
            : `rgba(60,80,200,${alpha * pulsing})`
          ctx.lineWidth = pulsing > 0.8 ? 1.1 : 0.6
          ctx.stroke()
        }
      })
    })

    nodes.forEach((n) => {
      n.x += n.vx
      n.y += n.vy
      if (n.x < 0 || n.x > W) n.vx *= -1
      if (n.y < 0 || n.y > H) n.vy *= -1

      const pulseScale = n.pulse
        ? 1 + 0.6 * Math.sin(canvas._t * n.speed + n.phase)
        : 1
      const r = n.baseR * pulseScale
      const color = layerColor[n.layer]

      if (n.pulse) {
        const glowR = r * 3.5
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR)
        grad.addColorStop(0, dark ? 'rgba(99,120,246,0.35)' : 'rgba(60,80,200,0.18)')
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.beginPath()
        ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
      ctx.fillStyle = color + (dark ? 'cc' : '99')
      ctx.fill()
    })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      canvas._nodes = null
    }
    resize()
    window.addEventListener('resize', resize)
    const loop = () => { draw(); animRef.current = requestAnimationFrame(loop) }
    loop()
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.85 }}
    />
  )
}

/* ── Theme Toggle ─────────────────────────────────────── */
function ThemeToggle({ className = '' }) {
  const toggle = useThemeStore((s) => s.toggle)
  const isDark = document.documentElement.classList.contains('dark')
  return (
    <button
      onClick={toggle}
      className={`w-9 h-9 rounded-xl glass flex items-center justify-center transition-all hover:scale-105 ${className}`}
      title="Toggle theme"
    >
      {isDark
        ? <Sun className="w-4 h-4 text-yellow-400" />
        : <Moon className="w-4 h-4 text-mac-500" />}
    </button>
  )
}

/* ── Landing Page ─────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface overflow-hidden transition-colors duration-300">
      <NeuralCanvas />

      {/* Gradient orbs */}
      <div className="fixed top-[-250px] left-[-200px] w-[700px] h-[700px] rounded-full dark:bg-mac-600/8 bg-mac-400/6 blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-[-250px] right-[-200px] w-[700px] h-[700px] rounded-full dark:bg-neuro-600/8 bg-neuro-400/5 blur-[140px] pointer-events-none z-0" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-8 lg:px-12 py-4 sm:py-5 w-full">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex flex-col">
            <span className="font-display font-bold text-2xl sm:text-3xl leading-none"
              style={{ color: '#22c55e' }}>MAC</span>
            <span className="text-muted text-[10px] sm:text-xs font-mono tracking-widest mt-0.5 hidden sm:block">
              Medical Affective Computing
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 sm:gap-3"
        >
          <ThemeToggle />
          <Link
            to="/login"
            className="text-muted hover:text-primary transition-colors font-body text-sm px-2 sm:px-3 py-2 rounded-lg hover:bg-[var(--accent-soft)] hidden sm:block"
          >
            Sign In
          </Link>
          <Link to="/login" className="btn-secondary text-xs py-2 px-3 sm:hidden">
            Sign In
          </Link>
          <Link to="/register" className="btn-primary text-xs sm:text-sm py-2 px-3 sm:py-2.5 sm:px-5">
            <span className="hidden sm:inline">Get Started </span>
            <span className="sm:hidden">Start</span>
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Link>
        </motion.div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-10 sm:pt-16 lg:pt-20 pb-16 sm:pb-24 lg:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-5xl"
        >
          {/* Heading — responsive font size */}
          <h1 className="font-display text-[2.4rem] sm:text-[3.5rem] lg:text-[4.5rem] leading-[1.04] tracking-tight mb-5 sm:mb-8">
            <span className="text-primary">Emotion-Aware</span>
            <br />
            <span className="text-gradient">Healthcare AI</span>
            <br />
            <span className="text-primary">at Clinical Scale</span>
          </h1>

          <p className="text-muted text-base sm:text-lg lg:text-xl font-body leading-relaxed max-w-2xl mb-8 sm:mb-12">
            MAC fuses facial micro-expressions, voice biomarkers, and linguistic patterns
            into a unified clinical intelligence layer — powered by a Groq reasoning agent
            that thinks like a clinical psychologist.
          </p>

          {/* CTA buttons */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <Link to="/register" className="btn-primary text-sm sm:text-base py-3 sm:py-4 px-6 sm:px-8 shadow-glow-mac">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5" /> Start Analysis
            </Link>
            <Link to="/login" className="btn-secondary text-sm sm:text-base py-3 sm:py-4 px-6 sm:px-8">
              Sign In <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </div>
        </motion.div>

        {/* Stats — 2 cols mobile, 4 cols desktop */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mt-12 sm:mt-20"
        >
          {STATS.map((s, i) => (
            <div key={i} className="card text-center p-4 sm:p-5">
              <p className="font-display text-2xl sm:text-3xl font-bold text-gradient mb-1">{s.value}</p>
              <p className="text-muted text-xs sm:text-sm">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features — 1 col mobile, 2 cols desktop */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pb-16 sm:pb-28">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-14"
        >
          <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-bold text-primary mb-3 sm:mb-4">
            Four-Layer Intelligence
          </h2>
          <p className="text-muted text-sm sm:text-lg max-w-xl mx-auto">
            Each modality feeds structured features to a unified reasoning agent.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              viewport={{ once: true }}
              className="card group hover:shadow-glow-mac p-4 sm:p-6"
              style={{ '--hover-glow': f.glow }}
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-3 sm:mb-5 shadow-lg`}>
                <f.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h3 className="font-display text-base sm:text-xl font-semibold text-primary mb-2">{f.title}</h3>
              <p className="text-muted font-body leading-relaxed text-xs sm:text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pb-16 sm:pb-24">
        <div className="text-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-bold text-primary mb-3 sm:mb-4">
              Ready to analyze?
            </h2>
            <p className="text-muted text-sm sm:text-lg mb-6 sm:mb-8 max-w-lg mx-auto leading-relaxed">
              Upload a short video, audio clip, or describe how you feel.
              MAC processes everything in under 30 seconds.
            </p>
            <Link to="/register" className="btn-primary text-sm sm:text-base py-3 sm:py-4 px-8 sm:px-10 shadow-glow-mac">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" /> Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-5 sm:py-7 flex items-center justify-between"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-mac-400" />
          <span className="font-display font-bold text-muted text-sm">MAC</span>
        </div>
        <span className="text-subtle text-[10px] sm:text-xs font-mono hidden sm:block">
          Medical Affective Computing Platform © 2025
        </span>
        <ThemeToggle />
      </footer>
    </div>
  )
}