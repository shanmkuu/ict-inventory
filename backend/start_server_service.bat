@echo off
cd /d "C:\Users\leshe.THE-VORTEX\Desktop\ict-inventory"
"C:\Users\leshe.THE-VORTEX\AppData\Local\Programs\Python\Python313\python.exe" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
