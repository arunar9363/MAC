"""
Ghost Medical - Face Analysis Service
Port: 8001
Uses: DeepFace, MediaPipe, OpenCV
Extracts: emotions, valence, arousal, action units
"""

import os
import io
import math
import tempfile
import numpy as np
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Lazy imports to avoid slow startup
_deepface = None
_cv2 = None
_mp = None


def get_deepface():
    global _deepface
    if _deepface is None:
        from deepface import DeepFace
        _deepface = DeepFace
    return _deepface


def get_cv2():
    global _cv2
    if _cv2 is None:
        import cv2
        _cv2 = cv2
    return _cv2


def get_mediapipe():
    global _mp
    if _mp is None:
        import mediapipe as mp
        _mp = mp
    return _mp


app = FastAPI(title="Ghost Face Analysis Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Valence/arousal mapping from basic emotions (Russell's circumplex model)
EMOTION_VALENCE = {
    "happy": 0.85,
    "surprised": 0.1,
    "neutral": 0.0,
    "sad": -0.7,
    "fearful": -0.6,
    "disgusted": -0.75,
    "angry": -0.65,
}
EMOTION_AROUSAL = {
    "happy": 0.7,
    "surprised": 0.8,
    "neutral": 0.0,
    "sad": -0.4,
    "fearful": 0.75,
    "disgusted": 0.2,
    "angry": 0.8,
}


def extract_frames(video_path: str, max_frames: int = 8) -> list:
    """Extract evenly-spaced frames from video."""
    cv2 = get_cv2()
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    duration = total_frames / fps if fps > 0 else 0

    indices = np.linspace(0, max(total_frames - 1, 0), min(max_frames, total_frames), dtype=int)
    frames = []
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
        ret, frame = cap.read()
        if ret:
            frames.append(frame)
    cap.release()
    return frames, duration


def analyze_frame_deepface(frame) -> dict:
    """Run DeepFace analysis on a single frame."""
    DeepFace = get_deepface()
    cv2 = get_cv2()

    # Convert BGR to RGB
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    try:
        results = DeepFace.analyze(
            img_path=rgb,
            actions=["emotion", "age", "gender"],
            enforce_detection=False,
            silent=True,
        )
        if isinstance(results, list):
            results = results[0]
        return results
    except Exception as e:
        return None


def detect_face_mediapipe(frame) -> dict:
    """Run MediaPipe Face Mesh for landmark detection."""
    mp = get_mediapipe()
    cv2 = get_cv2()

    mp_face_mesh = mp.solutions.face_mesh
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
    ) as face_mesh:
        results = face_mesh.process(rgb)
        if results.multi_face_landmarks:
            return {"detected": True, "landmark_count": len(results.multi_face_landmarks[0].landmark)}
    return {"detected": False, "landmark_count": 0}


def infer_action_units(emotions: dict) -> list:
    """Map dominant emotions to approximate FACS action units."""
    au_map = {
        "happy": ["AU6", "AU12"],
        "sad": ["AU1", "AU4", "AU15", "AU17"],
        "angry": ["AU4", "AU5", "AU7", "AU23", "AU24"],
        "fearful": ["AU1", "AU2", "AU4", "AU5", "AU7", "AU20"],
        "disgusted": ["AU9", "AU15", "AU16"],
        "surprised": ["AU1", "AU2", "AU5", "AU26", "AU27"],
        "neutral": [],
    }
    dominant = max(emotions, key=emotions.get)
    aus = au_map.get(dominant, [])
    # Add secondary AUs for secondary emotion
    sorted_emos = sorted(emotions.items(), key=lambda x: x[1], reverse=True)
    if len(sorted_emos) > 1 and sorted_emos[1][1] > 0.2:
        secondary = sorted_emos[1][0]
        aus += au_map.get(secondary, [])
    return list(set(aus))


@app.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):
    """
    Analyze a video file for facial emotional signals.
    Returns structured features including emotions, valence, arousal.
    """
    suffix = Path(file.filename).suffix or ".mp4"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        frames, duration = extract_frames(tmp_path, max_frames=8)
        if not frames:
            raise HTTPException(status_code=422, detail="No frames extracted from video")

        # Analyze frames
        all_emotions = []
        all_ages = []
        genders = []
        face_detected_count = 0

        for frame in frames:
            df_result = analyze_frame_deepface(frame)
            if df_result:
                face_detected_count += 1
                emotion_dict = df_result.get("emotion", {})
                # Normalize to 0-1
                total = sum(emotion_dict.values()) or 1
                normalized = {k: v / total for k, v in emotion_dict.items()}
                all_emotions.append(normalized)
                age = df_result.get("age")
                if age:
                    all_ages.append(age)
                gender_data = df_result.get("gender", {})
                if gender_data:
                    genders.append(max(gender_data, key=gender_data.get))

        if not all_emotions:
            # Return minimal response if no face detected
            return {
                "face_detected": False,
                "dominant_emotion": "neutral",
                "emotions": {k: 0.0 for k in EMOTION_VALENCE},
                "valence": 0.0,
                "arousal": 0.0,
                "confidence": 0.1,
                "au_detected": [],
                "age_estimate": None,
                "gender_estimate": None,
                "video_duration": duration,
            }

        # Aggregate across frames (mean)
        avg_emotions = {}
        for key in all_emotions[0]:
            avg_emotions[key] = float(np.mean([e.get(key, 0) for e in all_emotions]))

        # Normalize
        total = sum(avg_emotions.values()) or 1
        avg_emotions = {k: round(v / total, 4) for k, v in avg_emotions.items()}

        dominant = max(avg_emotions, key=avg_emotions.get)

        # Compute valence and arousal (weighted average)
        valence = sum(EMOTION_VALENCE.get(e, 0) * w for e, w in avg_emotions.items())
        arousal = sum(EMOTION_AROUSAL.get(e, 0) * w for e, w in avg_emotions.items())

        # Clamp
        valence = float(np.clip(valence, -1, 1))
        arousal = float(np.clip(arousal, -1, 1))

        # Confidence = detection rate × dominant emotion score
        detection_rate = face_detected_count / len(frames)
        confidence = round(detection_rate * avg_emotions.get(dominant, 0.5), 3)

        aus = infer_action_units(avg_emotions)
        age_est = round(float(np.mean(all_ages))) if all_ages else None
        gender_est = max(set(genders), key=genders.count) if genders else None

        return {
            "face_detected": True,
            "dominant_emotion": dominant,
            "emotions": avg_emotions,
            "valence": round(valence, 4),
            "arousal": round(arousal, 4),
            "confidence": round(confidence, 4),
            "au_detected": aus,
            "age_estimate": age_est,
            "gender_estimate": gender_est,
            "frames_analyzed": len(frames),
            "frames_with_face": face_detected_count,
            "video_duration": round(duration, 2),
        }

    finally:
        os.unlink(tmp_path)


@app.get("/health")
def health():
    return {"status": "ok", "service": "face-analysis"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)
