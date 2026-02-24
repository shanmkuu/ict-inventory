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

# Determine base path for logging (and config)
if getattr(sys, 'frozen', False):
    base_path = os.path.dirname(sys.executable)
else:
    base_path = os.path.dirname(os.path.abspath(__file__))

log_file_path = os.path.join(base_path, "agent.log")

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file_path),
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
        if getattr(sys, 'frozen', False):
            # If exe, runs itself
            ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, " --install", None, 1)
        else:
            # If script, run python with script path
            script_path = os.path.abspath(__file__)
            ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, f'"{script_path}" --install', None, 1)
        return

    # If bundled with PyInstaller, sys.executable is the exe path
    # If running as script, it's python.exe
    exe_path = sys.executable
    
    # Correct path handling depending on if frozen (exe) or script
    if getattr(sys, 'frozen', False):
        command = f'"{exe_path}"'
    else:
        # If script, we want to run with pythonw.exe (no console)
        # Assuming pythonw.exe is in the same directory as python.exe
        python_dir = os.path.dirname(sys.executable)
        pythonw_path = os.path.join(python_dir, "pythonw.exe")
        
        if os.path.exists(pythonw_path):
            executable = pythonw_path
        else:
            executable = sys.executable
            
        script_path = os.path.abspath(__file__)
        command = f'"{executable}" "{script_path}"'

    task_name = "ICTInventoryAgent"
    
    print(f"Installing '{task_name}'...")
    print(f"  Target: {command}")
    
    cmd = [
        'schtasks', '/Create', 
        '/TN', task_name, 
        '/TR', command, 
        '/SC', 'ONLOGON', 
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

    except Exception as e:
        print(f"An error occurred: {e}")

def get_gpu_info():
    """Retrieve GPU Name using PowerShell."""
    try:
        if platform.system() == "Windows":
            cmd = "powershell \"Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name\""
            output = subprocess.check_output(cmd, shell=True).decode().strip()
            # Output might contain multiple lines if multiple GPUs
            lines = [line.strip() for line in output.split('\r\n') if line.strip()]
            if lines:
                return ", ".join(lines) # Return all GPUs found
    except:
        pass
    return "Unknown"

def get_system_type():
    """Retrieve System Type (Desktop/Laptop) via chassis type."""
    try:
        if platform.system() == "Windows":
            # Simplified check using battery presence
            if psutil.sensors_battery() is not None:
                return "Laptop"
            else:
                return "Desktop" 
    except:
        pass
    return "Unknown"

def get_mac_address():
    """Get the primary network interface MAC address using psutil."""
    import psutil
    AF_LINK = psutil.AF_LINK  # platform-agnostic constant for hardware addresses
    try:
        interfaces = psutil.net_if_addrs()
        for iface_name, addrs in interfaces.items():
            # Skip loopback and virtual/tunneling adapters
            lower = iface_name.lower()
            if any(skip in lower for skip in ('loopback', 'lo', 'vethernet', 'vmware', 'virtualbox', 'pseudo', 'teredo')):
                continue
            for addr in addrs:
                if addr.family == AF_LINK and addr.address and addr.address != '00-00-00-00-00-00':
                    return addr.address.upper()
    except Exception:
        pass
    # Fallback: uuid.getnode()
    node = uuid.getnode()
    return '-'.join(['{:02X}'.format((node >> ele) & 0xff) for ele in range(0, 8*6, 8)][::-1])


def get_system_info():
    try:
        boot_time_timestamp = psutil.boot_time()
        bt = datetime.fromtimestamp(boot_time_timestamp)
        boot_time = f"{bt.year}-{bt.month}-{bt.day} {bt.hour}:{bt.minute}:{bt.second}"
    except:
        boot_time = "Unknown"

    return {
        "device_id": str(uuid.getnode()),
        "hostname": socket.gethostname(),
        "ip_address": socket.gethostbyname(socket.gethostname()),
        "mac_address": get_mac_address(),
        "os_name": platform.system(),
        "os_version": platform.version(),
        "os_release": platform.release(),
        "architecture": platform.machine(),
        "system_type": get_system_type(),
        "cpu_model": platform.processor(),
        "gpu_model": get_gpu_info(),
        "cpu_cores_logical": psutil.cpu_count(logical=True),
        "cpu_cores_physical": psutil.cpu_count(logical=False),
        "ram_total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
        "disk_total_gb": round(psutil.disk_usage('/').total / (1024**3), 2),
        "boot_time": boot_time,
        "current_user": os.getlogin()
    }


def send_heartbeat(config):
    """
    Sends a heartbeat to the configured API URLs.
    Returns True if successful (at least one URL worked), False otherwise.
    """
    try:
        logging.info("Collecting system information...")
        data = get_system_info()
        # Add API KEY if needed
        headers = {"x-api-key": config.get("api_key")}
        
        # Support both sinlge 'api_url' and list 'api_urls'
        api_urls = config.get("api_urls", [])
        if config.get("api_url"):
            api_urls.insert(0, config.get("api_url"))
        
        # Remove duplicates while preserving order
        api_urls = list(dict.fromkeys(api_urls))

        if not api_urls:
            logging.error("No API URLs configured! Please set 'api_urls' or 'api_url' in config.json.")
            return False

        success = False
        for url in api_urls:
            try:
                logging.info(f"Sending heartbeat to {url}...")
                response = requests.post(url, json=data, headers=headers, timeout=10)
                
                if response.status_code == 200:
                    logging.info(f"Heartbeat sent successfully to {url}. Status: {response.status_code}")
                    return True
                else:
                    logging.error(f"Failed to send heartbeat to {url}. Status: {response.status_code}. Response: {response.text}")
            except requests.exceptions.RequestException as e:
                logging.warning(f"Connection failed to {url}: {e}")
        
        logging.error("Failed to send heartbeat to ALL configured URLs.")
        return False

    except Exception as e:
        logging.error(f"Error during execution: {e}")
        return False

def run_agent():
    config = load_config()
    interval = config.get("interval_seconds", 300)
    
    # Log configuration (just once)
    api_urls = config.get("api_urls", [])
    if config.get("api_url"):
        api_urls.insert(0, config.get("api_url"))
    api_urls = list(dict.fromkeys(api_urls))
    
    logging.info("Starting ICT Inventory Endpoint Agent...")
    logging.info(f"Agent configured. Reporting to {api_urls} every {interval} seconds.")

    while True:
        send_heartbeat(config)
        time.sleep(interval)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ICT Inventory Agent")
    parser.add_argument("--install", action="store_true", help="Install as a startup task")
    args = parser.parse_args()

    if args.install:
        install_service()
    else:
        run_agent()
