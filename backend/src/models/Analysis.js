const mongoose = require('mongoose')

const faceFeatureSchema = new mongoose.Schema({
  dominant_emotion: String,
  emotions: {
    happy: Number,
    sad: Number,
    angry: Number,
    fearful: Number,
    disgusted: Number,
    surprised: Number,
    neutral: Number,
  },
  valence: Number,
  arousal: Number,
  confidence: Number,
  au_detected: [String],
  face_detected: Boolean,
  age_estimate: Number,
  gender_estimate: String,
}, { _id: false })

const voiceFeatureSchema = new mongoose.Schema({
  energy_mean: Number,
  energy_std: Number,
  pitch_mean: Number,
  pitch_std: Number,
  speech_rate: Number,
  mfcc_mean: [Number],
  mfcc_std: [Number],
  spectral_centroid: Number,
  zero_crossing_rate: Number,
  hnr: Number,  // Harmonics to noise ratio
  jitter: Number,
  shimmer: Number,
  confidence: Number,
  audio_duration: Number,
}, { _id: false })

const textFeatureSchema = new mongoose.Schema({
  emotion: String,
  emotion_confidence: Number,
  sentiment: String,
  compound: Number,
  pos: Number,
  neg: Number,
  neu: Number,
  cognitive_distortions: [String],
  hopelessness_score: Number,
  word_count: Number,
  avg_sentence_length: Number,
  key_phrases: [String],
}, { _id: false })

const finalReportSchema = new mongoose.Schema({
  emotional_state: String,
  confidence: Number,
  risk_level: {
    type: String,
    enum: ['minimal', 'low', 'moderate', 'high', 'critical'],
    default: 'minimal',
  },
  patterns_detected: [String],
  signals: {
    face: String,
    voice: String,
    text: String,
  },
  explanation: String,
  recommendations: [String],
  generated_at: {
    type: Date,
    default: Date.now,
  },
}, { _id: false })

const analysisSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    index: true,
    trim: true,
    uppercase: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  inputs: {
    videoPath: String,
    audioPath: String,
    text: String,
    hasVideo: { type: Boolean, default: false },
    hasAudio: { type: Boolean, default: false },
    hasText: { type: Boolean, default: false },
  },
  extractedFeatures: {
    face: faceFeatureSchema,
    voice: voiceFeatureSchema,
    text: textFeatureSchema,
  },
  finalReport: finalReportSchema,
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  processingTime: Number, // ms
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Update updatedAt on save
analysisSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model('Analysis', analysisSchema)
