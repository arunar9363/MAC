"""
Ghost Medical - Voice Analysis Service
Port: 8002
Uses: Librosa, openSMILE, scipy
Extracts: MFCCs, pitch, energy, speech rate, jitter, shimmer, HNR
"""

import os
import tempfile
import numpy as np
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

_librosa = None
_sf = None


def get_librosa():
    global _librosa
    if _librosa is None:
        import librosa
        _librosa = librosa
    return _librosa


def get_sf():
    global _sf
    if _sf is None:
        import soundfile as sf
        _sf = sf
    return _sf


app = FastAPI(title="Ghost Voice Analysis Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def compute_jitter(f0: np.ndarray) -> float:
    """Compute jitter (frequency perturbation) from F0 contour."""
    voiced = f0[f0 > 0]
    if len(voiced) < 2:
        return 0.0
    diffs = np.abs(np.diff(voiced))
    return float(np.mean(diffs) / (np.mean(voiced) + 1e-9))


def compute_shimmer(y: np.ndarray, sr: int) -> float:
    """Compute shimmer (amplitude perturbation) using RMS frames."""
    librosa = get_librosa()
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
    if len(rms) < 2:
        return 0.0
    diffs = np.abs(np.diff(rms))
    return float(np.mean(diffs) / (np.mean(rms) + 1e-9))


def compute_hnr(y: np.ndarray, sr: int) -> float:
    """Approximate Harmonics-to-Noise Ratio."""
    librosa = get_librosa()
    # Use harmonic/percussive separation
    harmonic, percussive = librosa.effects.hpss(y)
    harmonic_power = np.mean(harmonic ** 2)
    noise_power = np.mean(percussive ** 2)
    if noise_power < 1e-10:
        return 40.0  # Very high HNR
    hnr_db = 10 * np.log10(harmonic_power / noise_power + 1e-9)
    return float(np.clip(hnr_db, -10, 40))


def estimate_speech_rate(y: np.ndarray, sr: int) -> float:
    """Estimate speech rate via energy envelope onset detection."""
    librosa = get_librosa()
    onsets = librosa.onset.onset_detect(y=y, sr=sr, units='time')
    duration = len(y) / sr
    if duration < 0.5:
        return 0.0
    # Each onset roughly corresponds to a syllable
    syllables = len(onsets)
    return round(syllables / duration, 3)


def load_audio(file_path: str) -> tuple:
    """Load audio, converting video if needed."""
    librosa = get_librosa()
    suffix = Path(file_path).suffix.lower()

    # For video files, try to extract audio
    if suffix in ['.mp4', '.webm', '.mov', '.avi']:
        try:
            import subprocess
            audio_path = file_path + ".wav"
            subprocess.run(
                ["ffmpeg", "-i", file_path, "-vn", "-acodec", "pcm_s16le",
                 "-ar", "22050", "-ac", "1", audio_path, "-y"],
                capture_output=True, check=True
            )
            y, sr = librosa.load(audio_path, sr=22050, mono=True)
            os.unlink(audio_path)
            return y, sr
        except Exception:
            pass

    y, sr = librosa.load(file_path, sr=22050, mono=True)
    return y, sr


@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    """
    Analyze audio/video file for voice biomarkers.
    Returns MFCCs, pitch, energy, speech rate, jitter, shimmer, HNR.
    """
    suffix = Path(file.filename).suffix or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        librosa = get_librosa()

        try:
            y, sr = load_audio(tmp_path)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Audio load failed: {str(e)}")

        if len(y) == 0:
            raise HTTPException(status_code=422, detail="Empty audio file")

        duration = len(y) / sr

        # === MFCCs (13 coefficients) ===
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        mfcc_mean = mfccs.mean(axis=1).tolist()
        mfcc_std = mfccs.std(axis=1).tolist()

        # === Pitch (F0) using pyin ===
        f0, voiced_flag, _ = librosa.pyin(
            y, fmin=librosa.note_to_hz('C2'),
            fmax=librosa.note_to_hz('C7'),
            sr=sr
        )
        f0_voiced = f0[voiced_flag] if voiced_flag is not None else f0[~np.isnan(f0)]
        pitch_mean = float(np.nanmean(f0_voiced)) if len(f0_voiced) > 0 else 0.0
        pitch_std = float(np.nanstd(f0_voiced)) if len(f0_voiced) > 0 else 0.0

        # === Energy (RMS) ===
        rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
        energy_mean = float(np.mean(rms))
        energy_std = float(np.std(rms))

        # === Spectral features ===
        spectral_centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
        zcr = float(np.mean(librosa.feature.zero_crossing_rate(y=y)))

        # === Clinical voice quality metrics ===
        jitter = compute_jitter(f0 if f0 is not None else np.array([]))
        shimmer = compute_shimmer(y, sr)
        hnr = compute_hnr(y, sr)
        speech_rate = estimate_speech_rate(y, sr)

        return {
            "mfcc_mean": [round(v, 4) for v in mfcc_mean],
            "mfcc_std": [round(v, 4) for v in mfcc_std],
            "pitch_mean": round(pitch_mean, 2),
            "pitch_std": round(pitch_std, 2),
            "energy_mean": round(energy_mean, 4),
            "energy_std": round(energy_std, 4),
            "spectral_centroid": round(spectral_centroid, 2),
            "zero_crossing_rate": round(zcr, 5),
            "jitter": round(jitter, 6),
            "shimmer": round(shimmer, 6),
            "hnr": round(hnr, 3),
            "speech_rate": speech_rate,
            "audio_duration": round(duration, 2),
            "sample_rate": sr,
            "confidence": round(min(1.0, duration / 5.0), 3),  # more confidence with longer audio
        }

    finally:
        os.unlink(tmp_path)


@app.get("/health")
def health():
    return {"status": "ok", "service": "voice-analysis"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=False)
