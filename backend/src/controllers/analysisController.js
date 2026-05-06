const axios = require('axios')
const path = require('path')
const Analysis = require('../models/Analysis')
const pdfService = require('../services/pdfService')

const FACE_URL  = process.env.FACE_SERVICE_URL  || 'http://localhost:8001'
const VOICE_URL = process.env.VOICE_SERVICE_URL || 'http://localhost:8002'
const TEXT_URL  = process.env.TEXT_SERVICE_URL  || 'http://localhost:8003'
const AGENT_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8004'

// Warm up all services on backend start (prevents Render spin-down delay)
const warmupServices = async () => {
  const urls = [FACE_URL, VOICE_URL, TEXT_URL, AGENT_URL]
  for (const url of urls) {
    axios.get(`${url}/health`).catch(() => {})
  }
}
warmupServices()

// Call Python microservice with file
async function callFileService(serviceUrl, filePath, endpoint = '/analyze') {
  const FormData = require('form-data')
  const fs = require('fs')

  const form = new FormData()
  form.append('file', fs.createReadStream(filePath))

  const res = await axios.post(`${serviceUrl}${endpoint}`, form, {
    headers: form.getHeaders(),
    timeout: 120000,
  })
  return res.data
}

async function callTextService(text) {
  const res = await axios.post(`${TEXT_URL}/analyze`, { text }, { timeout: 30000 })
  return res.data
}

// Call Python agent service (port 8004)
async function callAgentService({ faceFeatures, voiceFeatures, textFeatures, patientId, sessionId, previousReport }) {
  const res = await axios.post(`${AGENT_URL}/reason`, {
    face_features:   faceFeatures  || null,
    voice_features:  voiceFeatures || null,
    text_features:   textFeatures  || null,
    patient_id:      patientId,
    session_id:      sessionId     || '',
    previous_report: previousReport || null,
  }, { timeout: 45000 })
  return res.data
}

const runAnalysis = async (req, res) => {
  try {
    const startTime = Date.now()
    const { patientId, text } = req.body
    const userId = req.user._id

    if (!patientId) {
      return res.status(400).json({ message: 'patientId is required' })
    }

    const videoFile = req.files?.video?.[0]
    const audioFile = req.files?.audio?.[0]

    if (!videoFile && !audioFile && !text?.trim()) {
      return res.status(400).json({ message: 'At least one input (video, audio, or text) required' })
    }

    // Create pending record
    const analysis = await Analysis.create({
      patientId: patientId.toUpperCase(),
      userId,
      inputs: {
        videoPath: videoFile?.path || null,
        audioPath: audioFile?.path || null,
        text: text?.trim() || null,
        hasVideo:  !!videoFile,
        hasAudio:  !!audioFile,
        hasText:   !!text?.trim(),
      },
      status: 'processing',
    })

    // Fetch previous session for this patient (Python agent uses it for context)
    const previousAnalysis = await Analysis.findOne({
      patientId: patientId.toUpperCase(),
      userId,
      _id:    { $ne: analysis._id },
      status: 'completed',
    })
      .sort({ createdAt: -1 })
      .select('finalReport')

    // Run face, voice, text services in parallel
    const [faceResult, voiceResult, textResult] = await Promise.allSettled([
      videoFile ? callFileService(FACE_URL, videoFile.path) : Promise.resolve(null),
      (audioFile || videoFile) ? callFileService(VOICE_URL, audioFile?.path || videoFile.path) : Promise.resolve(null),
      text?.trim() ? callTextService(text.trim()) : Promise.resolve(null),
    ])

    const faceFeatures  = faceResult.status  === 'fulfilled' ? faceResult.value  : null
    const voiceFeatures = voiceResult.status === 'fulfilled' ? voiceResult.value : null
    const textFeatures  = textResult.status  === 'fulfilled' ? textResult.value  : null

    if (!faceFeatures && !voiceFeatures && !textFeatures) {
      analysis.status = 'failed'
      await analysis.save()
      return res.status(503).json({
        message: 'All AI microservices failed. Ensure Python services are running.',
      })
    }

    // Store extracted features
    analysis.extractedFeatures = {
      face:  faceFeatures,
      voice: voiceFeatures,
      text:  textFeatures,
    }

    // Call Python agent service
    try {
      const finalReport = await callAgentService({
        faceFeatures,
        voiceFeatures,
        textFeatures,
        patientId:      patientId.toUpperCase(),
        sessionId:      analysis._id.toString(),
        previousReport: previousAnalysis?.finalReport || null,
      })
      analysis.finalReport = finalReport
      analysis.status = 'completed'
    } catch (agentErr) {
      console.error('Python agent error:', agentErr.message)
      analysis.finalReport = generateFallbackReport(faceFeatures, voiceFeatures, textFeatures)
      analysis.status = 'completed'
    }

    analysis.processingTime = Date.now() - startTime
    await analysis.save()

    res.json({
      analysisId:     analysis._id,
      status:         'completed',
      processingTime: analysis.processingTime,
    })

  } catch (err) {
    console.error('runAnalysis fatal error:', err)
    res.status(500).json({ message: 'Analysis failed: ' + err.message })
  }
}

function generateFallbackReport(face, voice, text) {
  const patterns = []
  let riskScore = 0

  if (face?.dominant_emotion === 'sad' || face?.dominant_emotion === 'fearful') {
    patterns.push('negative affect')
    riskScore += 2
  }
  if (voice?.energy_mean < 0.3) {
    patterns.push('low energy speech')
    riskScore += 1
  }
  if (text?.neg > 0.4) {
    patterns.push('negative linguistic patterns')
    riskScore += 2
  }

  const riskMap = { 0: 'minimal', 1: 'low', 2: 'low', 3: 'moderate', 4: 'high', 5: 'critical' }
  const risk = riskMap[Math.min(riskScore, 5)]

  return {
    emotional_state:   face?.dominant_emotion || text?.emotion || 'undetermined',
    confidence:        0.6,
    risk_level:        risk,
    patterns_detected: patterns,
    signals: {
      face:  face  ? `Dominant: ${face.dominant_emotion}, Valence: ${face.valence?.toFixed(2)}`          : 'No facial data',
      voice: voice ? `Energy: ${voice.energy_mean?.toFixed(2)}, Pitch: ${voice.pitch_mean?.toFixed(0)}Hz` : 'No audio data',
      text:  text  ? `Sentiment: ${text.sentiment}, Compound: ${text.compound?.toFixed(2)}`               : 'No text data',
    },
    explanation: 'Fallback analysis generated from raw modality features (AI agent unavailable). Please review manually.',
  }
}

const getAnalyses = async (req, res) => {
  const { limit = 20, page = 1 } = req.query
  const skip = (page - 1) * limit

  const analyses = await Analysis.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip)
    .select('-extractedFeatures.face.mfcc_mean -extractedFeatures.voice.mfcc_mean')

  const total = await Analysis.countDocuments({ userId: req.user._id })

  res.json({ analyses, total, page: parseInt(page), limit: parseInt(limit) })
}

const getAnalysis = async (req, res) => {
  const analysis = await Analysis.findOne({
    _id:    req.params.id,
    userId: req.user._id,
  })

  if (!analysis) {
    return res.status(404).json({ message: 'Analysis not found' })
  }

  const previousAnalysis = await Analysis.findOne({
    patientId: analysis.patientId,
    userId:    req.user._id,
    _id:       { $ne: analysis._id },
    status:    'completed',
  })
    .sort({ createdAt: -1 })
    .select('finalReport createdAt')

  res.json({ analysis, previousAnalysis })
}

const downloadPDF = async (req, res) => {
  const analysis = await Analysis.findOne({
    _id:    req.params.id,
    userId: req.user._id,
  })

  if (!analysis) {
    return res.status(404).json({ message: 'Analysis not found' })
  }

  try {
    const pdfBuffer = await pdfService.generate(analysis, req.user)
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="mac-report-${analysis.patientId}.pdf"`,
      'Content-Length':      pdfBuffer.length,
    })
    res.send(pdfBuffer)
  } catch (err) {
    console.error('PDF error:', err)
    res.status(500).json({ message: 'PDF generation failed' })
  }
}

const getStats = async (req, res) => {
  const userId = req.user._id

  const [total, patients, reports, avgConf] = await Promise.all([
    Analysis.countDocuments({ userId }),
    Analysis.distinct('patientId', { userId }),
    Analysis.countDocuments({ userId, status: 'completed' }),
    Analysis.aggregate([
      { $match: { userId, 'finalReport.confidence': { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$finalReport.confidence' } } },
    ]),
  ])

  res.json({
    total,
    patients:      patients.length,
    reports,
    avgConfidence: avgConf[0]?.avg || 0,
  })
}

module.exports = { runAnalysis, getAnalyses, getAnalysis, downloadPDF, getStats }