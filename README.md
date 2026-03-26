# 🖥️ Realtime ICT Inventory System

![GitHub License](https://img.shields.io/github/license/username/repo)
![Python Version](https://img.shields.io/badge/python-3.8%2B-blue)
![Node Version](https://img.shields.io/badge/node-%3E%3D14.0.0-green)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)
![React](https://img.shields.io/badge/Frontend-React%20%2F%20Vite-61DAFB)
![Status](https://img.shields.io/badge/Status-Active-brightgreen)

A lightweight system to track hardware inventory across your network. It features a central server with a modern dashboard and standalone agents for client machines.

---

## ✨ Features

| Feature | Description |
| :--- | :--- |
| **Realtime Dashboard** | View all devices, online status, and hardware specs in a sleek dark-mode UI. |
| **Detailed Hardware Info** | Captures Hostname, IP, OS, CPU, GPU, RAM, Disk, and System Type. |
| **Asset Lifecycle** | Track status (Available, Assigned, Under Repair, Retired), purchase dates, and warranty. |
| **Audit Logs** | Comprehensive history of device reassignments and department changes with export capabilities. |
| **Network Discovery** | Nornir-powered discovery and enrichment for infrastructure devices. |
| **Standalone Agent** | No need to install Python on client machines. Just run the EXE. |
| **Automatic Startup** | Agents and Server can be configured to run automatically on system boot. |

---

## 🚀 Deployment Guide

### 1. Server Installation (The Central Machine)
This machine will host the database and the dashboard.

1.  **Prerequisites**:
    * **Python 3.8+** (Add to PATH during installation).
    * **Nmap** (Required for network discovery; ensure it's in your system PATH).
    * **Node.js & npm** (Required to build/run the frontend dashboard).
    * **Microsoft C++ Build Tools** (Optional but recommended if `pip install` fails on Windows).

2.  **Install Dependencies**:
    * **Backend**:
        ```bash
        py -m pip install -r backend/requirements.txt
        ```
    * **Frontend**:
        ```bash
        cd frontend
        npm install
        ```

3.  **Start Automatically**:
    * Navigate to the `backend` folder.
    * Right-click `install_server_service.bat` and **Run as Administrator**.
    * This registers the server to start automatically when the computer turns on.

> [!TIP]
> **Manual Start**: Alternatively, run `uvicorn backend.main:app --reload --port 8000` inside the backend folder.

4.  **Access Dashboard**: Open `http://blackhat-x.local:8000` (or `http://YOUR_SERVER_IP:8000`).

---

### 2. Client Deployment (The Devices to Track)
You do **NOT** need to install Python on client machines.

1.  **Prepare the Package**:
    * Locate the `deploy` folder on your server machine.
    * Edit `deploy/config.json`:
        ```json
        {
          "api_url": "http://YOUR_SERVER_IP:8000/api/v1/heartbeat",
          "interval_seconds": 300
        }
        ```
        *(Replace `YOUR_SERVER_IP` with the IP address of your server).*

2.  **Install on Clients**:
    * Copy the `deploy` folder to the client machine (e.g., via USB or Network Share).
    * Inside the folder, right-click `install_agent.bat` and **Run as Administrator**.
    * **That's it!** The agent is now installed as a background service.

3.  **Verification**:
    * The agent will start immediately and effectively "call home" to the server.
    * It will also restart automatically whenever the computer is powered on.
    * Check the Dashboard to see the new device appear.

---

## 🛠️ Development

If you want to modify the code:

* **Backend**: FastAPI app in `backend/main.py`.
* **Frontend**: React (Vite) app in `frontend/`.
* **Agent**: Python script in `agent.py`.
* **Rebuild Agent**: To rebuild the standalone EXE after changes:
    ```bash
    py build_agent.py
    ```

---

## 🔄 Server Migration / IP Change

If you are moving the system to a new server or changing its IP address, follow these steps:

### 0. Find Your New Server Address
Before you start, note the address of your new server. You can use either the **Hostname** or the **IP Address**.
* **CMD/PowerShell**: Run `hostname` for the name or `ipconfig` for the IP.
* **Local DNS**: You can often use `COMPUTERNAME.local` for a more stable connection (recommended).

### 1. Server Prerequisites
1.  **Install Required Software** on the new server:
    * **Python 3.8+**, **Nmap**, and **Node.js & npm**.
2.  **Install Dependencies**:
    * Navigate to `backend` and run: `pip install -r requirements.txt`
    * Navigate to `frontend` and run: `npm install`
3.  **Firewall Rules**: Ensure ports **8000** (Backend API) and **5173** (Frontend UI) are allowed.

### 2. Move the Database
The system uses a SQLite database stored in the project root.
* **File**: `inventory.db`
* **Action**: Copy this file from the old server to the root folder of the new server.

### 3. Update New Deployments
* **Files**: `deploy/config.json` and root `config.json`.
* **Action**: Update the `api_url` or `api_urls` list with the new server's address.

### 4. Update Existing Agents
1.  Navigate to the agent installation folder on the client.
2.  Open `config.json` and update the `api_url`.
3.  Restart the machine (or kill/restart `agent.exe`).

### 5. Update Frontend Display
1.  Edit `frontend/src/components/Settings.jsx` (line 68) and update the server address.
2.  If backend/frontend are on different machines, update `target` in `frontend/vite.config.js`.
3.  Rebuild: `cd frontend && npm run build`.
4.  Restart the backend server.

---

## ⚡ Easy Startup

To launch the entire system (Backend Server + Frontend Dashboard) with a single click:

1.  Locate `start_all.bat` in the project root folder.
2.  **Double-click** it.
3.  The script will:
    * Launch the **Backend Server** (FastAPI).
    * Launch the **Frontend Dashboard** (Vite) in `--host` mode.
    * Open your browser to `http://blackhat-x.local:5173`.

---

## 🗑️ Removing Devices

### 1. Via Dashboard
* Navigate to "All Devices".
* Click the **Delete** button in the "Actions" column.

> [!IMPORTANT]
> For safety, deletion is disabled for **Network Devices**. Please retire them via status update instead.

### 2. Via Command Line (Cleanup Script)
Use the `remove_device.py` script to remove a device by IP, Hostname, or ID.

```bash
# Example: Remove by IP
python remove_device.py 192.168.1.50

# Example: Remove by Hostname
python remove_device.py old-laptop-name
```

---

## 🐧 ICT Inventory Agent — Unix Deployment

Cross-platform Bash agent that collects system inventory data and sends it to the ICT Inventory backend. Compatible with **Linux** and **macOS**.

### Files

| File | Purpose |
|---|---|
| `ict_agent.sh` | Main agent script |
| `config.json` | Server URL, API key, and interval settings |
| `install.sh` | Automated installer (systemd / launchd / cron) |

### 1. Configure

Edit `deploy/unix/config.json` and set your server URL:

```json
{
    "api_urls": ["http://YOUR_SERVER_IP:8000/api/v1/heartbeat"],
    "api_key": "YOUR_API_KEY_HERE",
    "interval_seconds": 300
}
```

### 2. Test (optional)

Run a dry-run to see what data will be collected:

```bash
chmod +x deploy/unix/ict_agent.sh
./deploy/unix/ict_agent.sh --test
```

### 3. Install

Install as a background service (requires root):

```bash
sudo bash deploy/unix/install.sh
```

This will:
- Copy files to `/opt/ict-agent/`
- **Linux (systemd):** Create and enable `ict-agent.service`
- **Linux (no systemd):** Add a `@reboot` cron job
- **macOS:** Install a `launchd` daemon

### 4. Verify

Check that the device appears in your ICT Inventory dashboard within a few minutes.

**Linux (systemd):**
```bash
sudo systemctl status ict-agent.service
sudo journalctl -u ict-agent.service -f
```

**macOS:**
```bash
sudo launchctl list | grep ict
tail -f /opt/ict-agent/agent.log
```

### Manual Run Modes

```bash
# Run once and exit
./ict_agent.sh --once

# Run in continuous loop (foreground)
./ict_agent.sh

# Test / dry-run (print JSON, don't send)
./ict_agent.sh --test
```

### Uninstall

```bash
sudo bash install.sh --remove
```

### Requirements

- **Bash** 4+
- **curl** (pre-installed on most systems; `wget` used as fallback)
- Standard Unix utilities (`uname`, `awk`, `sed`, `grep`, `df`, `who`)
- Root access recommended for hardware serial/UUID collection

> [!NOTE]
> The agent collects **only** basic system inventory data (hostname, IP, OS, CPU, RAM, disk, user). No personal files or sensitive data are accessed. The JSON payload matches the same schema as the Windows agent, so both can report to the same backend.
