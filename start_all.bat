@echo off
echo Starting ICT Inventory System...

:: Start Backend
start "ICT Inventory Backend" cmd /k "cd backend && python main.py"

:: Start Backend (Uvicorn Reload)
start "ICT Inventory Backend (Uvicorn)" cmd /k "py -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait a moment for backend to initialize
timeout /t 5

:: Start Frontend
start "ICT Inventory Frontend" cmd /k "cd frontend && npm run dev:host"

:: Wait a moment for frontend to initialize
timeout /t 5

echo Opening Dashboard...
start http://blackhat-x.local:5173

:: Start Agent
start "ICT Inventory Agent" cmd /k "python agent.py"

echo System starting...
pause
