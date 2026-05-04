@echo off
echo Starting MedAffect Platform...
echo.

:: Backend
start "Backend - Port 5000" cmd /k "cd /d %~dp0backend && npm run dev"

:: Frontend
start "Frontend - Port 5173" cmd /k "cd /d %~dp0frontend && npm run dev"

:: Face Service
start "Face Service - Port 8001" cmd /k "cd /d %~dp0ai-services\face-service && venv\Scripts\activate && uvicorn main:app --port 8001 --reload"

:: Voice Service
start "Voice Service - Port 8002" cmd /k "cd /d %~dp0ai-services\voice-service && venv\Scripts\activate && uvicorn main:app --port 8002 --reload"

:: Text Service
start "Text Service - Port 8003" cmd /k "cd /d %~dp0ai-services\text-service && venv\Scripts\activate && uvicorn main:app --port 8003 --reload"

:: Agent Service
start "Agent Service - Port 8004" cmd /k "cd /d %~dp0ai-services\agent-service && venv\Scripts\activate && uvicorn main:app --port 8004 --reload"

echo.
echo All services starting...
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5000
echo.
pause