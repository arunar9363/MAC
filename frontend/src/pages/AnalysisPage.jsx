import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import Webcam from 'react-webcam'
import {
  Upload, Video, Mic, FileText, Play, Square, CheckCircle,
  AlertCircle, Loader2, ChevronRight, Sparkles, User, RotateCcw
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { generatePatientId } from '@/lib/utils'

const STEPS = [
  { id: 'upload', label: 'Uploading inputs', detail: 'Securing your files...' },
  { id: 'face', label: 'Analyzing facial expressions', detail: 'DeepFace + MediaPipe running...' },
  { id: 'voice', label: 'Processing voice biomarkers', detail: 'Librosa extracting prosody...' },
  { id: 'text', label: 'Running NLP analysis', detail: 'HuggingFace transformers...' },
  { id: 'agent', label: 'AI clinical reasoning', detail: 'Groq agent fusing modalities...' },
  { id: 'report', label: 'Generating report', detail: 'Compiling final assessment...' },
]

const SUGGESTIONS = [
  "I've been feeling really overwhelmed lately and can't seem to focus on anything...",
  "Things have been difficult, I'm not sleeping well and feel exhausted all the time...",
  "I feel disconnected from people around me, like I'm going through the motions...",
  "I'm doing okay overall, but there are moments where everything feels too much...",
]

export default function AnalysisPage() {
  const [patientId, setPatientId] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [audioFile, setAudioFile] = useState(null)
  const [textInput, setTextInput] = useState('')
  const [mode, setMode] = useState('upload')
  const [recording, setRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [completedSteps, setCompletedSteps] = useState([])
  const [error, setError] = useState(null)
  const webcamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const navigate = useNavigate()

  const onDropVideo = useCallback((f) => { if (f[0]) setVideoFile(f[0]) }, [])
  const onDropAudio = useCallback((f) => { if (f[0]) setAudioFile(f[0]) }, [])

  const { getRootProps: getVP, getInputProps: getVI, isDragActive: isVD } = useDropzone({
    onDrop: onDropVideo, accept: { 'video/*': ['.mp4', '.webm', '.mov', '.avi'] }, maxFiles: 1, maxSize: 100 * 1024 * 1024,
  })
  const { getRootProps: getAP, getInputProps: getAI, isDragActive: isAD } = useDropzone({
    onDrop: onDropAudio, accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.webm'] }, maxFiles: 1, maxSize: 50 * 1024 * 1024,
  })

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      chunksRef.current = []
      const mr = new MediaRecorder(stream, { mimeType: 'video/webm' })
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        setRecordedBlob(new Blob(chunksRef.current, { type: 'video/webm' }))
        stream.getTracks().forEach((t) => t.stop())
      }
      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
      setTimeout(() => { if (mediaRecorderRef.current?.state === 'recording') stopRecording() }, 10000)
    } catch { toast.error('Camera/mic access denied') }
  }
  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false) }

  const handleAnalyze = async () => {
    const pid = patientId.trim() || generatePatientId()
    const hasVideo = videoFile || recordedBlob
    if (!hasVideo && !audioFile && !textInput.trim()) {
      return toast.error('Provide at least one input')
    }
    setProcessing(true); setCompletedSteps([]); setCurrentStep(0); setError(null)

    const fd = new FormData()
    fd.append('patientId', pid)
    if (videoFile) fd.append('video', videoFile)
    else if (recordedBlob) fd.append('video', new File([recordedBlob], 'recorded.webm', { type: 'video/webm' }))
    if (audioFile) fd.append('audio', audioFile)
    if (textInput.trim()) fd.append('text', textInput.trim())

    try {
      for (let i = 0; i < STEPS.length - 1; i++) {
        await new Promise((r) => setTimeout(r, 2200))
        setCurrentStep(i + 1)
        setCompletedSteps((p) => [...p, STEPS[i].id])
      }
      const res = await api.post('/analyses/run', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setCompletedSteps(STEPS.map((s) => s.id))
      toast.success('Analysis complete!')
      setTimeout(() => navigate(`/reports/${res.data.analysisId}`), 700)
    } catch (err) {
      const msg = err.response?.data?.message || 'Analysis failed. Check AI services are running.'
      setError(msg); toast.error(msg)
    } finally { setProcessing(false) }
  }

  const reset = () => {
    setVideoFile(null); setAudioFile(null); setTextInput(''); setRecordedBlob(null)
    setProcessing(false); setCurrentStep(-1); setCompletedSteps([]); setError(null)
  }

  const dropBase = 'border-2 border-dashed rounded-2xl p-5 sm:p-8 text-center cursor-pointer transition-all'

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-5 sm:mb-8">
        <h1 className="font-display text-2xl sm:text-4xl font-bold text-primary mb-1">New Analysis</h1>
        <p className="text-muted text-xs sm:text-sm">Upload multimodal inputs for clinical emotion assessment</p>
      </div>

      {/* Patient ID */}
      <div className="card mb-4 sm:mb-6">
        <div className="flex items-center gap-3 mb-3 sm:mb-4">
          <User className="w-4 h-4 sm:w-5 sm:h-5 text-mac-400 flex-shrink-0" />
          <h2 className="font-display text-base sm:text-lg font-semibold text-primary">Patient Identification</h2>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <input
            type="text"
            className="input-field flex-1 text-sm"
            placeholder="Patient ID or leave blank for auto"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            disabled={processing}
          />
          <button
            onClick={() => setPatientId(generatePatientId())}
            className="btn-secondary px-3 sm:px-4 py-2.5 text-sm flex-shrink-0"
            disabled={processing}
          >
            Auto
          </button>
        </div>
        {patientId && <p className="text-mac-400 text-xs font-mono mt-2">Patient: {patientId}</p>}
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4 sm:mb-6">
        {[
          { id: 'upload', icon: Upload, label: 'Upload Files' },
          { id: 'record', icon: Video, label: 'Record Live' },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm transition-all font-body flex-1 sm:flex-none justify-center
              ${mode === id ? 'bg-mac-600 text-white shadow-glow-sm' : 'glass text-muted hover:text-primary'}`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {mode === 'upload' ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3 sm:space-y-4 mb-4 sm:mb-6"
          >
            {/* Video drop */}
            <div
              {...getVP()}
              className={`${dropBase} ${isVD ? 'border-mac-500 bg-mac-600/10' : 'border-[var(--border)] hover:border-mac-600/50'} ${videoFile ? 'border-mac-600 bg-mac-600/8' : ''}`}
            >
              <input {...getVI()} />
              <Video className={`w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 ${videoFile ? 'text-mac-400' : 'text-muted'}`} />
              {videoFile ? (
                <p className="text-mac-300 text-xs sm:text-sm font-body truncate px-2">✓ {videoFile.name}</p>
              ) : (
                <>
                  <p className="text-primary font-medium text-sm mb-1">Drop video here (5–10 sec)</p>
                  <p className="text-muted text-xs">MP4, WebM, MOV · Max 100MB</p>
                </>
              )}
            </div>

            {/* Audio drop */}
            <div
              {...getAP()}
              className={`${dropBase} ${isAD ? 'border-neuro-500 bg-neuro-600/10' : 'border-[var(--border)] hover:border-neuro-600/50'} ${audioFile ? 'border-neuro-600 bg-neuro-600/8' : ''}`}
            >
              <input {...getAI()} />
              <Mic className={`w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 ${audioFile ? 'text-neuro-400' : 'text-muted'}`} />
              {audioFile ? (
                <p className="text-neuro-300 text-xs sm:text-sm truncate px-2">✓ {audioFile.name}</p>
              ) : (
                <>
                  <p className="text-primary font-medium text-sm mb-1">Drop audio file here</p>
                  <p className="text-muted text-xs">MP3, WAV, M4A · Max 50MB</p>
                </>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="record"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="card mb-4 sm:mb-6"
          >
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <Video className="w-4 h-4 sm:w-5 sm:h-5 text-mac-400 flex-shrink-0" />
              <h3 className="font-display text-base sm:text-lg font-semibold text-primary">Live Recording</h3>
              <span className="text-muted text-xs font-mono">(max 10s)</span>
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-xl overflow-hidden aspect-video mb-3 sm:mb-4 relative">
              <Webcam ref={webcamRef} audio={false} className="w-full h-full object-cover" mirrored />
              {recording && (
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-500/90 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-white text-xs font-mono">REC</span>
                </div>
              )}
              {recordedBlob && !recording && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-center">
                    <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-400 mx-auto mb-2" />
                    <p className="text-white text-xs sm:text-sm">Recording saved</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 sm:gap-3">
              {!recording && !recordedBlob && (
                <button onClick={startRecording} className="btn-primary flex-1 text-sm py-2.5">
                  <Play className="w-4 h-4" /> Start Recording
                </button>
              )}
              {recording && (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 flex-1 justify-center bg-red-600 hover:bg-red-500 text-white font-display font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all text-sm"
                >
                  <Square className="w-4 h-4" /> Stop
                </button>
              )}
              {recordedBlob && (
                <button onClick={() => setRecordedBlob(null)} className="btn-secondary text-sm py-2.5">
                  <RotateCcw className="w-4 h-4" /> Re-record
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text input */}
      <div className="card mb-4 sm:mb-6">
        <div className="flex items-center gap-3 mb-3 sm:mb-4">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-mac-400 flex-shrink-0" />
          <h2 className="font-display text-base sm:text-lg font-semibold text-primary">Patient Statement</h2>
          <span className="text-muted text-xs">(optional)</span>
        </div>
        <textarea
          className="input-field min-h-[80px] sm:min-h-[90px] resize-none mb-3 text-sm"
          placeholder="Describe the patient's emotional state..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          disabled={processing}
        />
        {/* Suggestions — 1 col on mobile, wrap on desktop */}
        <div>
          <p className="text-xs text-subtle font-mono mb-2">Suggestions:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => setTextInput(s)}
                className="text-xs glass px-3 py-2 rounded-lg text-muted hover:text-primary hover:border-mac-500/40 transition-all text-left leading-relaxed"
              >
                {s.substring(0, 55)}...
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-3 sm:p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-4 sm:mb-6">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-xs sm:text-sm">{error}</p>
        </div>
      )}

      {/* Processing steps */}
      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card mb-4 sm:mb-6 overflow-hidden"
          >
            <h3 className="font-display text-base sm:text-lg font-semibold text-primary mb-4 sm:mb-5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-mac-400" /> Processing Pipeline
            </h3>
            <div className="space-y-2">
              {STEPS.map((step, i) => {
                const isCompleted = completedSteps.includes(step.id)
                const isCurrent = currentStep === i
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-3 sm:p-3.5 rounded-xl transition-all
                      ${isCurrent ? 'glass border-mac-500/40 bg-mac-600/5' :
                        isCompleted ? 'bg-green-500/5 border border-green-500/20' : 'opacity-35'}`}
                  >
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0
                      ${isCompleted ? 'bg-green-500' : isCurrent ? 'bg-mac-600' : 'bg-[var(--border)]'}`}>
                      {isCompleted
                        ? <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        : isCurrent
                          ? <Loader2 className="w-3 h-3 text-white animate-spin" />
                          : <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs sm:text-sm font-medium truncate ${isCompleted ? 'text-green-400' : isCurrent ? 'text-primary' : 'text-muted'}`}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-mac-400 font-mono mt-0.5 truncate">{step.detail}</p>
                      )}
                    </div>
                    {isCurrent && <ChevronRight className="w-3.5 h-3.5 text-mac-400 animate-pulse flex-shrink-0" />}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleAnalyze}
          disabled={processing}
          className="btn-primary flex-1 py-3 sm:py-4 text-sm sm:text-base shadow-glow-mac"
        >
          {processing
            ? <><Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> Analyzing...</>
            : <><Sparkles className="w-4 h-4 sm:w-5 sm:h-5" /> Run Analysis</>
          }
        </button>
        <button
          onClick={reset}
          disabled={processing}
          className="btn-secondary px-4 sm:px-5 py-3 sm:py-4"
        >
          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  )
}