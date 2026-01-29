import sys
import os
import subprocess
import ctypes

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def install_server_task():
    # Path to python executable (we use the one running this script)
    python_exe = sys.executable
    # Use pythonw.exe if available to hide console
    pythonw_exe = python_exe.replace("python.exe", "pythonw.exe")
    if not os.path.exists(pythonw_exe):
        pythonw_exe = python_exe
        
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir) # Parent of backend
    
    # We want to run: py -m uvicorn main:app --host 0.0.0.0 --port 8000
    # But uvicorn is a module. Ideally we run: pythonw -m uvicorn backend.main:app
    # Note: cwd must be set correctly.
    
    task_name = "ICTInventoryServer"
    
    # We will invoke uvicorn as a module from the python executable
    # "C:\Path\To\pythonw.exe" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
    # Arguments need careful quoting
    # uvicorn needs to be importable. If we set CWD to project root, `backend.main:app` works.
    
    arguments = f'-m uvicorn backend.main:app --host 0.0.0.0 --port 8000'
    
    print(f"Installing '{task_name}'...")
    print(f"  Program: {pythonw_exe}")
    print(f"  Args: {arguments}")
    print(f"  CWD: {project_root}")
    
    # schtasks command
    cmd = [
        'schtasks', '/Create', 
        '/TN', task_name, 
        '/TR', f'"{pythonw_exe}" {arguments}', 
        '/SC', 'ONSTART', 
        '/RU', 'SYSTEM', 
        '/RL', 'HIGHEST',
        '/F'
    ]
    
    # Note: Setting Working Directory using schtasks /V1 is tricky or not supported directly in /Create
    # A workaround calls a batch file or uses XML import.
    # HOWEVER, we can include the CWD in the execution logic? 
    # Or cleaner: Create a batch file wrapper in the backend folder and call that.
    
    batch_wrapper = os.path.join(script_dir, "start_server_service.bat")
    with open(batch_wrapper, "w") as f:
        f.write("@echo off\n")
        f.write(f'cd /d "{project_root}"\n')
        f.write(f'"{python_exe}" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000\n')
        
    # Start via the batch file (using a VBS script or just directly might show a window)
    # If we run the BAT via Task Scheduler as SYSTEM, it is hidden by default (Session 0).
    
    cmd = [
        'schtasks', '/Create', 
        '/TN', task_name, 
        '/TR', f'"{batch_wrapper}"', 
        '/SC', 'ONSTART', 
        '/RU', 'SYSTEM', 
        '/RL', 'HIGHEST',
        '/F'
    ]

    try:
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode == 0:
            print(f"SUCCESS: Server service installed. It will run automatically at startup.")
            # Run immediately
            print("Starting service now...")
            subprocess.run(['schtasks', '/Run', '/TN', task_name], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        else:
            print(f"ERROR: Failed to install service.")
            print(result.stderr)
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    if is_admin():
        install_server_task()
    else:
        # Re-run with admin privileges
        print("Requesting administrator privileges...")
        ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, __file__, None, 1)
