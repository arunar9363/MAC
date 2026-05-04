# MAC — Medical Affective Computing Platform

> **Multimodal AI for Emotion-Aware Healthcare Systems**  
> Fuses facial analysis, voice biomarkers, and NLP into a unified clinical reasoning layer.

---

## 🧠 Architecture Overview

```
mac-medical/
├── frontend/              # React + Vite + Tailwind (port 3000)
├── backend/               # Node.js + Express + MongoDB (port 5000)
├── ai-services/
│   ├── face-service/      # DeepFace + MediaPipe (port 8001)
│   ├── voice-service/     # Librosa + openSMILE (port 8002)
│   ├── text-service/      # HuggingFace + VADER (port 8003)
│   └── requirements.txt   # Shared Python deps
├── uploads/               # Local file storage
└── docker-compose.yml
```

---

## ⚡ Quick Start (Docker — Recommended)

### Prerequisites
- Docker Desktop 4.x+
- 8GB RAM minimum (ML models)

### 1. Clone & Configure

```bash
git clone <repo>
cd mac-medical
cp backend/.env.example backend/.env
```

### 2. Add your Groq API key to `backend/.env`

```env
GROQ_API_KEY=gsk_your_actual_key_here
JWT_SECRET=your-random-secret-here
```

Get a free Groq API key at: https://console.groq.com

### 3. Start everything

```bash
docker-compose up --build
```

### 4. Open the app

```
http://localhost:3000
```

---

## 🛠 Manual Setup (Development)

### Prerequisites
- Node.js 20+
- Python 3.11+
- MongoDB 7.0+ (running locally)
- FFmpeg (for audio extraction from video)

### Step 1: Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Step 2: Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set MONGODB_URI, GROQ_API_KEY, JWT_SECRET
npm install
npm run dev
# → http://localhost:5000
```

### Step 3: Python AI Services

```bash
cd ai-services
pip install -r requirements.txt

# Download NLTK data (one time)
python -c "import nltk; nltk.download('punkt')"
```

**Start each service in a separate terminal:**

```bash
# Terminal 1 - Face Service
cd ai-services/face-service
uvicorn main:app --port 8001 --reload

# Terminal 2 - Voice Service
cd ai-services/voice-service
uvicorn main:app --port 8002 --reload

# Terminal 3 - Text Service
cd ai-services/text-service
uvicorn main:app --port 8003 --reload
```

Or use the convenience script:
```bash
cd ai-services
chmod +x start_all.sh
./start_all.sh
```

---

## 🔑 Environment Variables

### `backend/.env`

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | ✅ |
| `JWT_SECRET` | Secret for JWT signing (32+ chars) | ✅ |
| `GROQ_API_KEY` | Groq API key for AI agent | ✅ |
| `PORT` | Backend port (default: 5000) | ❌ |
| `FACE_SERVICE_URL` | Face service URL (default: http://localhost:8001) | ❌ |
| `VOICE_SERVICE_URL` | Voice service URL (default: http://localhost:8002) | ❌ |
| `TEXT_SERVICE_URL` | Text service URL (default: http://localhost:8003) | ❌ |

---

## 📊 API Reference

### Auth Endpoints

```
POST /api/auth/register    { name, email, password }
POST /api/auth/login       { email, password }
GET  /api/auth/me          (requires Bearer token)
```

### Analysis Endpoints

```
POST   /api/analyses/run        multipart: { video?, audio?, text?, patientId }
GET    /api/analyses            ?limit=20&page=1
GET    /api/analyses/:id        Full report + previous analysis comparison
GET    /api/analyses/:id/pdf    Download PDF report (binary)
GET    /api/analyses/stats      { total, patients, reports, avgConfidence }
```

### Python Service Endpoints

```
POST http://localhost:8001/analyze    video file → face features
POST http://localhost:8002/analyze    audio file → voice biomarkers  
POST http://localhost:8003/analyze    { text } → NLP features
```

---

## 🧩 Groq AI Agent

The backend's `agentService.js` sends structured multimodal features to Groq's LLaMA 3.3 70B model with a clinical psychology system prompt.

The agent:
- Detects cross-modal contradictions (e.g., happy face + hopeless text)
- Identifies psychological patterns (depression, anxiety, fatigue)
- Assigns risk level: `minimal | low | moderate | high | critical`
- Generates 150-250 word clinical explanation
- Outputs structured JSON report

---

## 📱 Frontend Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/register` | Create account |
| `/login` | Sign in |
| `/dashboard` | Stats overview |
| `/analysis` | Upload/record + run analysis |
| `/reports` | All reports with filtering |
| `/reports/:id` | Full report with charts + PDF download |

---

## 🗄 MongoDB Schemas

### User
```js
{ name, email, password (hashed), authProvider, role, createdAt }
```

### Analysis
```js
{
  patientId,           // e.g. "PT-001" (indexed)
  userId,              // ref to User
  inputs: { videoPath, audioPath, text, hasVideo, hasAudio, hasText },
  extractedFeatures: {
    face: { dominant_emotion, emotions{}, valence, arousal, confidence, au_detected },
    voice: { energy_mean, pitch_mean, pitch_std, mfcc_mean[], jitter, shimmer, hnr },
    text: { emotion, sentiment, compound, cognitive_distortions[], hopelessness_score }
  },
  finalReport: {
    emotional_state, confidence, risk_level, patterns_detected[],
    signals: { face, voice, text }, explanation, recommendations[]
  },
  status, processingTime, createdAt, updatedAt
}
```

---

## 📄 PDF Report

Generated via Puppeteer (HTML → PDF). Includes:
- Patient ID, report ID, clinician name, date
- Risk banner with color coding
- Detected psychological patterns
- AI clinical reasoning (full explanation)
- Modality signal summaries
- Facial emotion distribution table
- Voice biomarker metrics
- Text/linguistic analysis
- Clinical recommendations
- Medical disclaimer

---

## ⚠️ Notes

- **First run is slow**: DeepFace and HuggingFace models download on first use (~1-2GB)
- **GPU not required**: All models run on CPU (slower but functional)
- **Analysis time**: ~15-45 seconds depending on file size and hardware
- **Patient trends**: Run the same patientId twice to see trend comparison in report

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, Recharts, Zustand |
| Backend | Node.js, Express, MongoDB, Mongoose, Multer, Puppeteer |
| AI Agent | Groq API (LLaMA 3.3 70B) |
| Face Analysis | DeepFace, MediaPipe, OpenCV |
| Voice Analysis | Librosa, scipy, soundfile |
| Text Analysis | HuggingFace Transformers, VADER Sentiment |
| Auth | JWT (bcrypt hashed passwords) |
| PDF | Puppeteer (Chromium headless) |

---

## 🔐 Security

- Passwords hashed with bcrypt (salt rounds: 12)
- JWT expiry: 7 days
- Rate limiting on auth endpoints (10 req/15min)
- Helmet.js security headers
- File type validation on uploads
- User-scoped data access (users only see their own analyses)
