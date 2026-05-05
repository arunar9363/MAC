FROM python:3.11-slim

# System dependencies for audio/video processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    libportaudio2 \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libgl1 \
    libglib2.0-0 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
