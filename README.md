# Realtime ICT Inventory Endpoint Agent

A lightweight Python agent to collect system information and report it to a central inventory server.

## Features

- **Automated Data Collection**: Gathers hostname, IP, MAC, OS details, CPU/RAM/Disk usage, and boot time.
- **Heartbeat Mechanism**: Sends data to a REST API at configurable intervals.
- **Resilient**: Auto-retries on connection failure and runs indefinitely.
- **Cross-Platform**: Designed for Windows but compatible with Linux/macOS.

## Installation

1.  **Install Python**: Ensure Python 3.8+ is installed.
2.  **Install Dependencies**:
    ```bash
    py -m pip install -r requirements.txt
    ```
3.  **Configuration**:
    - Edit `config.json` to set your backend `api_url` and `api_key`.
    - Adjust `interval_seconds` if needed (default is 300 seconds / 5 minutes).

## Usage

### Manual Run
Run the agent directly from the command line:

```bash
py agent.py
```

Press `Ctrl+C` to stop.

### Windows Background Service (Automated)

To install the agent as a background service running at startup:

1.  Open a terminal as **Administrator**.
2.  Run the setup script:
    ```bash
    py setup_service.py
    ```
3.  The agent will now run automatically on system boot.

### Windows Background Service (Manual)

To run the agent silently in the background on startup:

1.  Open **Task Scheduler** (taskschd.msc).
2.  Click **Create Task**.
3.  **General Tab**:
    - Name: `ICTInventoryAgent`
    - Check **Run whether user is logged on or not**.
    - Check **Hidden** (optional, to hide console window).
    - Check **Run with highest privileges** (required for some WMI/system calls).
4.  **Triggers Tab**:
    - New -> **At system startup**.
5.  **Actions Tab**:
    - New -> **Start a program**.
    - Program/script: `pythonw.exe` (Use full path, e.g., `C:\Python39\pythonw.exe` to avoid console window).
    - Add arguments: `c:\path\to\agent.py`
    - Start in: `c:\path\to\` (Directory containing `agent.py` and `config.json`).
6.  **Settings Tab**:
    - Uncheck "Stop the task if it runs longer than 3 days".
    - Check "If the task fails, restart every: 1 minute".
7.  Click **OK** and enter credentials if prompted.

### Logging
Check `agent.log` in the same directory for status updates and error messages.

## Deployment Workflow (How to rollout)

To obtain device details from multiple machines:

1.  **Host the Backend**:
    - Run the backend on a central server (e.g., a server with IP `192.168.1.50`).
    - Ensure the firewall allows traffic on port `8000` (or your chosen port).

2.  **Configure the Agent**:
    - Edit `config.json` on your computer.
    - Change `api_url` to your server's IP: `"http://192.168.1.50:8000/api/v1/heartbeat"`.

3.  **Distribute to Client PCs**:
    - Copy the `ict-inventory` folder (containing `agent.py`, `config.json`, `setup_service.py`, `requirements.txt`) to the target machine (e.g., via USB, Shared Drive, or GPO).

4.  **Install on Client**:
    - Install Python on the client machine.
    - Open CMD/Powershell as **Administrator**.
    - Install dependencies: `py -m pip install -r requirements.txt`
    - Run the setup script: `py setup_service.py`

5.  **View Data**:
    - One installed, the agent will send data every 5 minutes.
    - View the inventory at `http://192.168.1.50:8000/api/v1/devices` or connect a frontend dashboard to this API.
