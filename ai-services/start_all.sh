#!/bin/bash
# Ghost Medical - Start all AI microservices

echo "🧠 Starting Ghost AI Services..."

# Face service
cd face-service
uvicorn main:app --host 0.0.0.0 --port 8001 --reload &
FACE_PID=$!
echo "✅ Face Service started (PID: $FACE_PID) → http://localhost:8001"

# Voice service
cd ../voice-service
uvicorn main:app --host 0.0.0.0 --port 8002 --reload &
VOICE_PID=$!
echo "✅ Voice Service started (PID: $VOICE_PID) → http://localhost:8002"

# Text service
cd ../text-service
uvicorn main:app --host 0.0.0.0 --port 8003 --reload &
TEXT_PID=$!
echo "✅ Text Service started (PID: $TEXT_PID) → http://localhost:8003"

# Agent service
cd ../agent-service
uvicorn main:app --host 0.0.0.0 --port 8004 --reload &
AGENT_PID=$!
echo "✅ Agent Service started (PID: $AGENT_PID) → http://localhost:8004"

echo ""
echo "All AI services running. Press Ctrl+C to stop all."

# Wait for all
wait $FACE_PID $VOICE_PID $TEXT_PID
