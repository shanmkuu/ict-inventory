@echo off
echo Installing ICT Inventory Server Service...
cd /d "%~dp0"
py setup_server_service.py
pause
