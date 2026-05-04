"""
Ghost Medical - Text Analysis Service
Port: 8003
Uses: HuggingFace Transformers, VADER, NLTK
Extracts: emotion, sentiment, cognitive distortions, hopelessness score
"""

import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

_sentiment_pipeline = None
_emotion_pipeline = None
_vader = None


def get_vader():
    global _vader
    if _vader is None:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        _vader = SentimentIntensityAnalyzer()
    return _vader


def get_emotion_pipeline():
    global _emotion_pipeline
    if _emotion_pipeline is None:
        from transformers import pipeline
        _emotion_pipeline = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            top_k=None,
            truncation=True,
            max_length=512,
        )
    return _emotion_pipeline


app = FastAPI(title="Ghost Text Analysis Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cognitive distortion patterns (CBT-based)
COGNITIVE_DISTORTION_PATTERNS = {
    "all-or-nothing thinking": [
        r"\b(always|never|everyone|nobody|everything|nothing|completely|totally|absolutely)\b",
        r"\b(all|none|every|no one)\b",
    ],
    "catastrophizing": [
        r"\b(terrible|horrible|awful|disaster|worst|unbearable|devastating|catastrophic)\b",
        r"\b(can't stand|end of the world|everything is ruined)\b",
    ],
    "mind reading": [
        r"\b(they think|she thinks|he thinks|people think|everyone knows|they must)\b",
        r"\b(they hate|thinks i'm|must think)\b",
    ],
    "fortune telling": [
        r"\b(will never|won't work|won't get better|going to fail|will always)\b",
        r"\b(it's hopeless|nothing will change|never going to)\b",
    ],
    "emotional reasoning": [
        r"\b(i feel like|i feel that|i just know|it feels|my gut says)\b",
    ],
    "should statements": [
        r"\b(should|shouldn't|must|must not|ought to|have to|need to)\b",
    ],
    "personalization": [
        r"\b(my fault|i caused|i ruined|because of me|i'm to blame|i made it)\b",
    ],
    "hopelessness": [
        r"\b(hopeless|pointless|no point|what's the point|no future|give up)\b",
        r"\b(no way out|can't go on|nothing matters|doesn't matter anymore)\b",
    ],
}

# Hopelessness lexicon (Beck Hopelessness Scale-inspired)
HOPELESSNESS_WORDS = {
    "high": ["hopeless", "pointless", "worthless", "useless", "meaningless",
             "no future", "give up", "can't go on", "want to die", "suicidal",
             "end it", "no point", "nothing to live for"],
    "moderate": ["exhausted", "tired of", "what's the use", "doesn't matter",
                 "nobody cares", "all alone", "never better", "always fail",
                 "can't cope", "overwhelmed", "burden"],
    "low": ["difficult", "struggling", "hard time", "feeling down", "not well",
            "anxious", "worried", "scared", "uncertain", "lost"],
}

HOPELESSNESS_SCORES = {"high": 1.0, "moderate": 0.5, "low": 0.2}


def compute_hopelessness(text: str) -> float:
    text_lower = text.lower()
    score = 0.0
    count = 0
    for level, words in HOPELESSNESS_WORDS.items():
        for word in words:
            if word in text_lower:
                score += HOPELESSNESS_SCORES[level]
                count += 1
    if count == 0:
        return 0.0
    return round(min(1.0, score / max(count, 3)), 4)


def detect_cognitive_distortions(text: str) -> list:
    text_lower = text.lower()
    detected = []
    for distortion, patterns in COGNITIVE_DISTORTION_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text_lower):
                detected.append(distortion)
                break
    return detected


def extract_key_phrases(text: str) -> list:
    """Simple key phrase extraction (high-affect words)."""
    affect_words = [
        "hopeless", "alone", "scared", "angry", "sad", "happy", "anxious",
        "depressed", "overwhelmed", "exhausted", "numb", "empty", "fear",
        "worry", "panic", "grief", "loss", "joy", "love", "hate", "pain"
    ]
    words = re.findall(r'\b\w+\b', text.lower())
    found = [w for w in words if w in affect_words]
    return list(dict.fromkeys(found))[:8]  # unique, max 8


class TextInput(BaseModel):
    text: str


@app.post("/analyze")
async def analyze_text(body: TextInput):
    """
    Analyze text for emotional content, cognitive patterns, and linguistic signals.
    """
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Text cannot be empty")

    if len(text) < 3:
        raise HTTPException(status_code=422, detail="Text too short for analysis")

    # Truncate for model limits
    text_truncated = text[:1024]

    # === VADER Sentiment ===
    vader = get_vader()
    scores = vader.polarity_scores(text_truncated)
    compound = scores["compound"]
    sentiment = "positive" if compound >= 0.05 else "negative" if compound <= -0.05 else "neutral"

    # === HuggingFace Emotion ===
    try:
        emotion_pipe = get_emotion_pipeline()
        emotion_results = emotion_pipe(text_truncated)
        if isinstance(emotion_results, list) and isinstance(emotion_results[0], list):
            emotion_results = emotion_results[0]
        emotion_results_sorted = sorted(emotion_results, key=lambda x: x["score"], reverse=True)
        primary_emotion = emotion_results_sorted[0]["label"].lower()
        emotion_confidence = round(emotion_results_sorted[0]["score"], 4)
    except Exception:
        # Fallback: derive from VADER
        if compound >= 0.05:
            primary_emotion = "joy"
            emotion_confidence = abs(compound)
        elif compound <= -0.5:
            primary_emotion = "sadness"
            emotion_confidence = abs(compound)
        elif compound <= -0.2:
            primary_emotion = "fear"
            emotion_confidence = abs(compound)
        else:
            primary_emotion = "neutral"
            emotion_confidence = 0.5

    # === Cognitive distortions ===
    distortions = detect_cognitive_distortions(text)

    # === Hopelessness score ===
    hopelessness = compute_hopelessness(text)

    # === Linguistic stats ===
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    word_count = len(text.split())
    avg_sentence_length = word_count / max(len(sentences), 1)

    # === Key phrases ===
    key_phrases = extract_key_phrases(text)

    return {
        "emotion": primary_emotion,
        "emotion_confidence": emotion_confidence,
        "sentiment": sentiment,
        "compound": round(compound, 4),
        "pos": round(scores["pos"], 4),
        "neg": round(scores["neg"], 4),
        "neu": round(scores["neu"], 4),
        "cognitive_distortions": distortions,
        "hopelessness_score": hopelessness,
        "word_count": word_count,
        "sentence_count": len(sentences),
        "avg_sentence_length": round(avg_sentence_length, 2),
        "key_phrases": key_phrases,
        "text_length": len(text),
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "text-analysis"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=False)
