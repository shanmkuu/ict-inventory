@echo off
echo Starting ICT Inventory System...

:: Start Backend
start "ICT Inventory Backend" cmd /k "cd backend && python main.py"

:: Wait a moment for backend to initialize
timeout /t 5

:: Start Frontend
start "ICT Inventory Frontend" cmd /k "cd frontend && npm run dev:host"

:: Wait a moment for frontend to initialize
timeout /t 5

echo Opening Dashboard...
start http://BlackHat-X.local:5173

echo System starting...
pause
