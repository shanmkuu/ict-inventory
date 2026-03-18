@echo off
cd /d "C:\Users\Admin\Desktop\Projects\ict-inventory"
"C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
