"""
AI Agent Reasoning Service
Uses Groq API with LLaMA to perform clinical-grade multimodal emotional reasoning.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os, json, logging
from groq import Groq

logger = logging.getLogger(__name__)

app = FastAPI(title="MAC Agent Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

SYSTEM_PROMPT = """You are an experienced clinical psychologist and affective computing specialist with 20+ years of practice. You analyze multimodal emotional signals from facial expressions, voice acoustics, and text content to produce clinically-relevant psychological assessments.

Your analysis is:
- Evidence-based and grounded in psychological literature
- Sensitive to cross-modal contradictions (e.g., forced smile with negative text)
- Nuanced in distinguishing momentary states from trait-level patterns
- Cautious about over-diagnosis while not dismissing genuine risk signals
- Compassionate and professional in tone

You must respond ONLY with a valid JSON object. No preamble, no markdown, no explanation outside the JSON."""

def build_prompt(face, voice, text, patient_id, previous_report):
    sections = [f"Patient ID: {patient_id}\n"]

    if face:
        sections.append(f"""
=== FACIAL ANALYSIS ===
Dominant emotion: {face.get('dominant_emotion', 'N/A')}
Emotion distribution: {json.dumps(face.get('emotions', {}), indent=2)}
Valence: {face.get('valence', 'N/A')} | Arousal: {face.get('arousal', 'N/A')}
Confidence: {face.get('confidence', 'N/A')}
Raw signal: {face.get('raw_signal', 'N/A')}
""")

    if voice:
        sections.append(f"""
=== VOICE/ACOUSTIC ANALYSIS ===
Pitch mean: {voice.get('pitch_mean', 'N/A')} Hz | Std: {voice.get('pitch_std', 'N/A')} Hz
Energy mean: {voice.get('energy_mean', 'N/A')} | Speech rate: {voice.get('speech_rate', 'N/A')}
Pause ratio: {voice.get('pause_ratio', 'N/A')}
Valence: {voice.get('valence', 'N/A')} | Arousal: {voice.get('arousal', 'N/A')}
Raw signal: {voice.get('raw_signal', 'N/A')}
""")

    if text:
        sections.append(f"""
=== TEXT/LINGUISTIC ANALYSIS ===
Dominant emotion: {text.get('dominant_emotion', 'N/A')}
Sentiment: {json.dumps(text.get('sentiment', {}), indent=2)}
Cognitive patterns: {text.get('cognitive_patterns', [])}
Hopelessness score: {text.get('hopelessness_score', 'N/A')}
Fatigue indicators: {text.get('fatigue_indicators', [])}
Valence: {text.get('valence', 'N/A')} | Arousal: {text.get('arousal', 'N/A')}
""")

    if previous_report:
        sections.append(f"""
=== PREVIOUS SESSION CONTEXT ===
Prior emotional state: {previous_report.get('emotional_state', 'N/A')}
Prior risk level: {previous_report.get('risk_level', 'N/A')}
Prior patterns: {previous_report.get('patterns_detected', [])}
""")

    sections.append("""
=== YOUR TASK ===
Respond ONLY with this exact JSON structure:
{
  "emotional_state": "Precise clinical description",
  "confidence": 0.0-1.0,
  "risk_level": "low" | "moderate" | "high" | "critical",
  "patterns_detected": ["list", "of", "patterns"],
  "signals": {
    "face": "Clinical interpretation of facial signals",
    "voice": "Clinical interpretation of voice signals",
    "text": "Clinical interpretation of text signals"
  },
  "contradictions": ["any cross-modal contradictions"],
  "explanation": "Detailed 3-5 sentence clinical reasoning",
  "recommendations": ["3-5 specific clinical recommendations"],
  "follow_up_required": true | false
}
""")
    return "\n".join(sections)


class AgentInput(BaseModel):
    face_features: Optional[dict] = None
    voice_features: Optional[dict] = None
    text_features: Optional[dict] = None
    patient_id: Optional[str] = "UNKNOWN"
    session_id: Optional[str] = ""
    previous_report: Optional[dict] = None


@app.post("/reason")
async def reason(body: AgentInput):
    if not body.face_features and not body.voice_features and not body.text_features:
        raise HTTPException(400, "At least one feature set is required.")

    prompt = build_prompt(
        face=body.face_features,
        voice=body.voice_features,
        text=body.text_features,
        patient_id=body.patient_id,
        previous_report=body.previous_report,
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.3,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content
        result = json.loads(raw)

        required = ["emotional_state", "confidence", "risk_level", "patterns_detected", "explanation"]
        for field in required:
            if field not in result:
                raise ValueError(f"Missing field: {field}")

        result["confidence"] = float(max(0.0, min(1.0, result.get("confidence", 0.5))))
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Agent returned invalid JSON: {e}")
        raise HTTPException(500, "Agent returned malformed response.")
    except Exception as e:
        logger.error(f"Agent reasoning error: {e}", exc_info=True)
        raise HTTPException(500, f"Agent reasoning failed: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "agent-service"}