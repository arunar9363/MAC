FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir fastapi uvicorn[standard] transformers torch vaderSentiment nltk pydantic

RUN python -c "import nltk; nltk.download('punkt')"
# Pre-download HuggingFace model
RUN python -c "from transformers import pipeline; pipeline('text-classification', model='j-hartmann/emotion-english-distilroberta-base', top_k=None)" || true

COPY main.py .
EXPOSE 8003
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]
