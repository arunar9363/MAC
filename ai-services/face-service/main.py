"""
MAC - Face Analysis Service (Lightweight)
Port: 8001
Uses: OpenCV only — no DeepFace, no TensorFlow, no MediaPipe
Memory: ~150MB (vs 1GB+ with DeepFace)
"""

import os
import cv2
import tempfile
import numpy as np
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="MAC Face Analysis Service (Lightweight)", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load OpenCV's built-in face + eye detectors (no download needed)
FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
EYE_CASCADE  = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
SMILE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_smile.xml')

# Emotion proxies from facial geometry
EMOTION_VALENCE = {
    "happy":    0.85,
    "surprised": 0.1,
    "neutral":   0.0,
    "sad":      -0.7,
    "fearful":  -0.6,
    "disgusted":-0.75,
    "angry":    -0.65,
}
EMOTION_AROUSAL = {
    "happy":    0.7,
    "surprised": 0.8,
    "neutral":   0.0,
    "sad":      -0.4,
    "fearful":   0.75,
    "disgusted": 0.2,
    "angry":     0.8,
}


def extract_frames(video_path: str, max_frames: int = 6):
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps   = cap.get(cv2.CAP_PROP_FPS) or 25
    duration = total / fps

    indices = np.linspace(0, max(total - 1, 0), min(max_frames, max(total, 1)), dtype=int)
    frames = []
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
        ret, frame = cap.read()
        if ret:
            frames.append(frame)
    cap.release()
    return frames, duration


def analyze_frame(frame):
    """
    Lightweight analysis using Haar cascades:
    - Detect face presence
    - Detect smile (happy proxy)
    - Detect open eyes (alertness proxy)
    - Compute brightness & contrast as arousal proxies
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    faces = FACE_CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
    if len(faces) == 0:
        return None

    # Use largest face
    x, y, w, h = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)[0]
    face_roi   = gray[y:y+h, x:x+w]
    face_color = frame[y:y+h, x:x+w]

    # --- Smile detection ---
    smiles = SMILE_CASCADE.detectMultiScale(face_roi, scaleFactor=1.7, minNeighbors=20, minSize=(25, 25))
    smile_score = min(len(smiles) * 0.4, 1.0)

    # --- Eye openness ---
    eyes = EYE_CASCADE.detectMultiScale(face_roi, scaleFactor=1.1, minNeighbors=10)
    eye_score = min(len(eyes) / 2.0, 1.0)  # 0 = closed/tired, 1 = both open

    # --- Brightness (proxy for energy/arousal) ---
    brightness = float(np.mean(face_roi)) / 255.0  # 0-1

    # --- Skin tone variance (proxy for emotional flush / pallor) ---
    hsv = cv2.cvtColor(face_color, cv2.COLOR_BGR2HSV)
    sat_mean = float(np.mean(hsv[:, :, 1])) / 255.0  # saturation

    return {
        "face_detected": True,
        "smile_score":   round(smile_score, 3),
        "eye_score":     round(eye_score, 3),
        "brightness":    round(brightness, 3),
        "saturation":    round(sat_mean, 3),
        "face_area":     int(w * h),
    }


def infer_emotion(smile, eye, brightness, saturation):
    """
    Rule-based emotion inference from OpenCV features.
    Returns emotion distribution dict.
    """
    emotions = {
        "happy":     0.0,
        "neutral":   0.0,
        "sad":       0.0,
        "angry":     0.0,
        "fearful":   0.0,
        "disgusted": 0.0,
        "surprised": 0.0,
    }

    if smile > 0.5:
        emotions["happy"]   += smile * 0.7
        emotions["neutral"] += (1 - smile) * 0.3
    elif eye < 0.3:
        # Eyes mostly closed — tired / sad
        emotions["sad"]     += 0.4
        emotions["neutral"] += 0.3
        emotions["fearful"] += 0.2
        emotions["angry"]   += 0.1
    elif brightness < 0.35:
        # Dark / low energy face
        emotions["sad"]     += 0.35
        emotions["neutral"] += 0.35
        emotions["angry"]   += 0.2
        emotions["disgusted"] += 0.1
    elif saturation > 0.45:
        # Flushed / high saturation — anger or fear
        emotions["angry"]   += 0.35
        emotions["fearful"] += 0.3
        emotions["surprised"] += 0.2
        emotions["neutral"] += 0.15
    else:
        emotions["neutral"] += 0.55
        emotions["happy"]   += 0.2
        emotions["sad"]     += 0.15
        emotions["fearful"] += 0.1

    # Normalize
    total = sum(emotions.values()) or 1
    return {k: round(v / total, 4) for k, v in emotions.items()}


@app.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):
    suffix = Path(file.filename or "video.webm").suffix or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        frames, duration = extract_frames(tmp_path, max_frames=6)

        if not frames:
            return {
                "face_detected":   False,
                "dominant_emotion": "neutral",
                "emotions":         {k: 0.0 for k in EMOTION_VALENCE},
                "valence":          0.0,
                "arousal":          0.0,
                "confidence":       0.1,
                "au_detected":      [],
                "age_estimate":     None,
                "gender_estimate":  None,
                "video_duration":   duration,
            }

        results = [analyze_frame(f) for f in frames]
        results = [r for r in results if r is not None]

        if not results:
            return {
                "face_detected":    False,
                "dominant_emotion": "neutral",
                "emotions":         {k: 0.0 for k in EMOTION_VALENCE},
                "valence":          0.0,
                "arousal":          0.0,
                "confidence":       0.1,
                "au_detected":      [],
                "age_estimate":     None,
                "gender_estimate":  None,
                "video_duration":   round(duration, 2),
            }

        # Aggregate
        avg_smile  = float(np.mean([r["smile_score"]  for r in results]))
        avg_eye    = float(np.mean([r["eye_score"]    for r in results]))
        avg_bright = float(np.mean([r["brightness"]   for r in results]))
        avg_sat    = float(np.mean([r["saturation"]   for r in results]))

        emotions = infer_emotion(avg_smile, avg_eye, avg_bright, avg_sat)
        dominant = max(emotions, key=emotions.get)

        valence  = sum(EMOTION_VALENCE.get(e, 0) * w for e, w in emotions.items())
        arousal  = sum(EMOTION_AROUSAL.get(e, 0) * w for e, w in emotions.items())
        valence  = float(np.clip(valence, -1, 1))
        arousal  = float(np.clip(arousal, -1, 1))

        detection_rate = len(results) / len(frames)
        confidence     = round(detection_rate * emotions.get(dominant, 0.5), 3)

        # Map to approximate AUs
        au_map = {
            "happy":     ["AU6", "AU12"],
            "sad":       ["AU1", "AU4", "AU15"],
            "angry":     ["AU4", "AU5", "AU7", "AU23"],
            "fearful":   ["AU1", "AU2", "AU4", "AU20"],
            "disgusted": ["AU9", "AU15"],
            "surprised": ["AU1", "AU2", "AU5", "AU27"],
            "neutral":   [],
        }
        aus = au_map.get(dominant, [])

        return {
            "face_detected":    True,
            "dominant_emotion": dominant,
            "emotions":         emotions,
            "valence":          round(valence, 4),
            "arousal":          round(arousal, 4),
            "confidence":       round(confidence, 4),
            "au_detected":      aus,
            "age_estimate":     None,
            "gender_estimate":  None,
            "frames_analyzed":  len(frames),
            "frames_with_face": len(results),
            "video_duration":   round(duration, 2),
        }

    finally:
        os.unlink(tmp_path)


@app.get("/health")
def health():
    return {"status": "ok", "service": "face-analysis", "engine": "opencv-lightweight"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)