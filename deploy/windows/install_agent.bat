@echo off
echo Installing ICT Inventory Agent Service...
:: Request Admin Privileges
fltmc >nul 2>&1 || (
    echo Requesting Administrator privileges...
    PowerShell Start-Process -FilePath "%0" -Verb RunAs
    exit /b
)

cd /d "%~dp0"
echo Running installer...
agent.exe --install

echo.
echo Process complete. Press any key to exit.
pause >nul
