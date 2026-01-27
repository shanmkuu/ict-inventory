import sys
import os
import subprocess
import ctypes

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def install_service():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    agent_path = os.path.join(script_dir, "agent.py")
    
    # Locate pythonw.exe (windowless python)
    python_exe = sys.executable
    pythonw_exe = python_exe.replace("python.exe", "pythonw.exe")
    
    if not os.path.exists(pythonw_exe):
        print(f"Warning: pythonw.exe not found at {pythonw_exe}. Using python.exe (console window will appear).")
        pythonw_exe = python_exe

    task_name = "ICTInventoryAgent"
    # Command: pythonw.exe "C:\path\to\agent.py"
    # We quote the paths to handle spaces
    command = f'"{pythonw_exe}" "{agent_path}"'
    
    print(f"Installing '{task_name}'...")
    print(f"  Target: {command}")
    
    # schtasks command
    # /SC ONSTART : Run at startup
    # /RU SYSTEM : Run as SYSTEM account (max privileges, no user login needed)
    # /F : Force overwrite if exists
    # /RL HIGHEST : Run with highest privileges
    cmd = [
        'schtasks', '/Create', 
        '/TN', task_name, 
        '/TR', command, 
        '/SC', 'ONSTART', 
        '/RU', 'SYSTEM', 
        '/RL', 'HIGHEST',
        '/F'
    ]
    
    try:
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode == 0:
            print(f"SUCCESS: Service installed. The agent will run automatically at the next system startup.")
            print("You can also start it immediately via Task Scheduler or by rebooting.")
        else:
            print(f"ERROR: Failed to install service.")
            print(result.stderr)
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    if is_admin():
        install_service()
    else:
        # Re-run with admin privileges
        print("Requesting administrator privileges...")
        ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, __file__, None, 1)
