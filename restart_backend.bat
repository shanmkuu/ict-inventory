@echo off
echo Stopping old backend processes on port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    echo Killing PID %%a
    taskkill /F /PID %%a 2>nul
)
timeout /t 2 >nul
echo Starting backend on ALL interfaces (0.0.0.0:8000)...
start "ICT Inventory Backend" cmd /k "C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"
echo Done! Backend is now reachable at http://BlackHat-X.local:8000
pause
