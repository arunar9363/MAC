FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir torch==2.1.2+cpu --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8003

CMD ["python", "start.py"]