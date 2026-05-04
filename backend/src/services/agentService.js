const axios = require('axios')

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

/**
 * Builds the structured prompt for the clinical AI agent
 */
function buildPrompt(faceFeatures, voiceFeatures, textFeatures, patientId) {
  const sections = []

  if (faceFeatures) {
    sections.push(`
=== FACIAL ANALYSIS DATA ===
Patient ID: ${patientId}
Dominant Emotion: ${faceFeatures.dominant_emotion || 'unknown'}
Emotion Probabilities:
${Object.entries(faceFeatures.emotions || {}).map(([k, v]) => `  - ${k}: ${(v * 100).toFixed(1)}%`).join('\n')}
Valence (positive-negative): ${faceFeatures.valence?.toFixed(3) || 'N/A'} (scale: -1 to 1)
Arousal (calm-excited): ${faceFeatures.arousal?.toFixed(3) || 'N/A'} (scale: 0 to 1)
Facial Confidence Score: ${faceFeatures.confidence?.toFixed(3) || 'N/A'}
Action Units Detected: ${faceFeatures.au_detected?.join(', ') || 'none'}
Age Estimate: ${faceFeatures.age_estimate || 'unknown'}
`)
  }

  if (voiceFeatures) {
    sections.push(`
=== VOICE BIOMARKER DATA ===
Mean Energy: ${voiceFeatures.energy_mean?.toFixed(3) || 'N/A'}
Energy Variability (std): ${voiceFeatures.energy_std?.toFixed(3) || 'N/A'}
Mean Pitch (F0): ${voiceFeatures.pitch_mean?.toFixed(1) || 'N/A'} Hz
Pitch Variability: ${voiceFeatures.pitch_std?.toFixed(1) || 'N/A'} Hz
Speech Rate: ${voiceFeatures.speech_rate?.toFixed(2) || 'N/A'} syllables/sec
Harmonics-to-Noise Ratio: ${voiceFeatures.hnr?.toFixed(2) || 'N/A'} dB
Jitter (frequency perturbation): ${voiceFeatures.jitter?.toFixed(4) || 'N/A'}
Shimmer (amplitude perturbation): ${voiceFeatures.shimmer?.toFixed(4) || 'N/A'}
Audio Duration: ${voiceFeatures.audio_duration?.toFixed(1) || 'N/A'} seconds
`)
  }

  if (textFeatures) {
    sections.push(`
=== TEXT/LINGUISTIC ANALYSIS DATA ===
Primary Emotion: ${textFeatures.emotion || 'unknown'}
Emotion Confidence: ${textFeatures.emotion_confidence?.toFixed(3) || 'N/A'}
Sentiment: ${textFeatures.sentiment || 'unknown'}
Sentiment Scores: Positive=${textFeatures.pos?.toFixed(3)}, Negative=${textFeatures.neg?.toFixed(3)}, Neutral=${textFeatures.neu?.toFixed(3)}
Compound Sentiment Score: ${textFeatures.compound?.toFixed(3) || 'N/A'} (scale: -1 to 1)
Cognitive Distortions: ${textFeatures.cognitive_distortions?.join(', ') || 'none detected'}
Hopelessness Score: ${textFeatures.hopelessness_score?.toFixed(3) || 'N/A'}
Word Count: ${textFeatures.word_count || 'N/A'}
Key Phrases: ${textFeatures.key_phrases?.join(', ') || 'none'}
`)
  }

  return sections.join('\n')
}

/**
 * Main agent reasoning function
 */
async function analyze({ faceFeatures, voiceFeatures, textFeatures, patientId }) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

  const featureData = buildPrompt(faceFeatures, voiceFeatures, textFeatures, patientId)

  const systemPrompt = `You are an experienced clinical psychologist and affective computing specialist. 
You analyze multimodal emotional signals from facial analysis, voice biomarkers, and linguistic patterns.
Your role is to synthesize these signals into a comprehensive clinical assessment.

Key responsibilities:
1. Identify contradictions across modalities (e.g., a smile with negative speech - masked emotions)
2. Detect psychological patterns (depression, anxiety, emotional dysregulation, fatigue)
3. Assess risk level based on clinical evidence
4. Provide clear, evidence-based reasoning
5. Never diagnose - assess emotional state and psychological risk signals only

CRITICAL: Respond ONLY with valid JSON, no additional text.`

  const userPrompt = `Analyze the following multimodal emotional data for patient ${patientId}:

${featureData}

Based on this multimodal data, provide a comprehensive clinical assessment. 
Look for:
- Contradictions between modalities (masked emotions, incongruent signals)
- Patterns indicating depression, anxiety, fatigue, hopelessness, emotional numbing
- Risk signals that warrant clinical attention

Respond with EXACTLY this JSON structure (no markdown, no extra text):
{
  "emotional_state": "primary emotional state in 2-4 words",
  "confidence": 0.XX,
  "risk_level": "minimal|low|moderate|high|critical",
  "patterns_detected": ["pattern1", "pattern2"],
  "signals": {
    "face": "clinical interpretation of facial signals in 1-2 sentences",
    "voice": "clinical interpretation of voice biomarkers in 1-2 sentences",
    "text": "clinical interpretation of linguistic patterns in 1-2 sentences"
  },
  "explanation": "detailed clinical reasoning paragraph (150-250 words) describing the overall emotional state, cross-modal concordance or contradiction, psychological patterns, and clinical implications",
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"]
}`

  const response = await axios.post(
    GROQ_API_URL,
    {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      top_p: 0.9,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 45000,
    }
  )

  const content = response.data.choices[0]?.message?.content
  if (!content) throw new Error('Empty response from Groq')

  // Clean and parse JSON
  const cleaned = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const parsed = JSON.parse(cleaned)

  // Validate required fields
  if (!parsed.emotional_state || !parsed.risk_level || !parsed.explanation) {
    throw new Error('Invalid agent response structure')
  }

  return parsed
}

module.exports = { analyze }
