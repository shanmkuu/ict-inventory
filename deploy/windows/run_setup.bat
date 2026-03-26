@echo off
:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running with Administrator privileges...
    goto :run
) else (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:run
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\setup_tunnel.ps1"
if %errorlevel% neq 0 (
    echo.
    echo Script failed with error code %errorlevel%
    pause
)
