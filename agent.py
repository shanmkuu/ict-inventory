import argparse
import ctypes
import subprocess
import sys
import time
import json
import logging
import platform
import psutil
import requests
import socket
import uuid
import os
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("agent.log"),
        logging.StreamHandler()
    ]
)

CONFIG_FILE = "config.json"

def load_config():
    try:
        # If running as specific exe (PyInstaller), look in same folder
        if getattr(sys, 'frozen', False):
            base_path = os.path.dirname(sys.executable)
        else:
            base_path = os.path.dirname(os.path.abspath(__file__))
            
        config_path = os.path.join(base_path, CONFIG_FILE)
        
        with open(config_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        logging.error(f"Config file not found at {config_path}!")
        sys.exit(1)

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def install_service():
    if not is_admin():
        # Re-run with admin privileges
        print("Requesting administrator privileges...")
        ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, " --install", None, 1)
        return

    # If bundled with PyInstaller, sys.executable is the exe path
    # If running as script, it's python.exe
    exe_path = sys.executable
    
    # Correct path handling depending on if frozen (exe) or script
    if getattr(sys, 'frozen', False):
        command = f'"{exe_path}"'
    else:
        # If script, we might be running via python
        # Fallback to current file
        script_path = os.path.abspath(__file__)
        command = f'"{sys.executable}" "{script_path}"'

    task_name = "ICTInventoryAgent"
    
    print(f"Installing '{task_name}'...")
    print(f"  Target: {command}")
    
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
        else:
            print(f"ERROR: Failed to install service.")
            print(result.stderr)
    except Exception as e:
        print(f"An error occurred: {e}")

def get_system_info():
    try:
        boot_time_timestamp = psutil.boot_time()
        bt = datetime.fromtimestamp(boot_time_timestamp)
        boot_time = f"{bt.year}-{bt.month}-{bt.day} {bt.hour}:{bt.minute}:{bt.second}"
    except:
        boot_time = "Unknown"

    return {
        "hostname": socket.gethostname(),
        "ip_address": socket.gethostbyname(socket.gethostname()),
        "mac_address": '-'.join(['{:02x}'.format((uuid.getnode() >> ele) & 0xff) for ele in range(0,8*6,8)][::-1]),
        "os_name": platform.system(),
        "os_version": platform.version(),
        "os_release": platform.release(),
        "architecture": platform.machine(),
        "cpu_model": platform.processor(),
        "cpu_cores_logical": psutil.cpu_count(logical=True),
        "cpu_cores_physical": psutil.cpu_count(logical=False),
        "ram_total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
        "disk_total_gb": round(psutil.disk_usage('/').total / (1024**3), 2),
        "boot_time": boot_time,
        "current_user": os.getlogin()
    }

def run_agent():
    config = load_config()
    api_url = config.get("api_url")
    interval = config.get("interval_seconds", 300)
    
    logging.info("Starting ICT Inventory Endpoint Agent...")
    logging.info(f"Agent configured. Reporting to {api_url} every {interval} seconds.")

    while True:
        try:
            logging.info("Collecting system information...")
            data = get_system_info()
            # Add API KEY if needed
            headers = {"x-api-key": config.get("api_key")}
            
            logging.info("Sending heartbeat...")
            response = requests.post(api_url, json=data, headers=headers)
            
            if response.status_code == 200:
                logging.info(f"Heartbeat sent successfully. Status: {response.status_code}")
            else:
                logging.error(f"Failed to send heartbeat. Status: {response.status_code}. Response: {response.text}")
                
        except Exception as e:
            logging.error(f"Error during execution: {e}")
        
        time.sleep(interval)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ICT Inventory Agent")
    parser.add_argument("--install", action="store_true", help="Install as a startup task")
    args = parser.parse_args()

    if args.install:
        install_service()
    else:
        run_agent()
