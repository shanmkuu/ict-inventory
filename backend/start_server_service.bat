@echo off
cd /d "C:\Users\Admin\Desktop\Projects\ict-inventory"
"C:\Program Files (x86)\Python314-32\python.exe" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
