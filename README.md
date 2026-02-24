# Realtime ICT Inventory System

A lightweight system to track hardware inventory across your network. It features a central server with a modern dashboard and standalone agents for client machines.

## Features

- **Realtime Dashboard**: View all devices, online status, and hardware specs in a sleek dark-mode UI.
- **Detailed Hardware Info**: Captures Hostname, IP, OS, CPU, GPU, RAM, Disk, and System Type.
- **Asset Lifecycle Management**: Track status (Available, Assigned, Under Repair, Retired), purchase dates, and warranty info.
- **Records & Audit Logs**: Comprehensive history of device reassignments and department changes with export capabilities.
- **Network Device Enrichment**: Nornir-powered discovery and enrichment for infrastructure devices.
- **Standalone Agent**: No need to install Python on client machines. Just run the EXE.
- **Automatic Startup**: Agents and Server can be configured to run automatically on system boot.

## 🚀 Deployment Guide

### 1. Server Installation (The Central Machine)
This machine will host the database and the dashboard.

1.  **Prerequisites**: Ensure Python 3.8+ is installed on the server.
2.  **Install Dependencies**:
    ```bash
    py -m pip install -r backend/requirements.txt
    ```
3.  **Start Automtically**:
    - Navigate to the `backend` folder.
    - Right-click `install_server_service.bat` and **Run as Administrator**.
    - This registers the server to start automatically when the computer turns on.
    
    *Alternatively, run manually: `py -m uvicorn main:app --host 0.0.0.0 --port 8000` inside the backend folder.*

4.  **Access Dashboard**: Open `http://blackhat-x.local:8000` (or `http://YOUR_SERVER_IP:8000`).

---

### 2. Client Deployment (The Devices to Track)
You do **NOT** need to install Python on client machines.

1.  **Prepare the Package**:
    - Locate the `deploy` folder on your server machine.
    - Edit `deploy/config.json`:
      ```json
      {
        "api_url": "cd frontend
        /api/v1/heartbeat",
        "interval_seconds": 300
      }
      ```
      *(Replace `YOUR_SERVER_IP` with the IP address of your server).*

2.  **Install on Clients**:
    - Copy the `deploy` folder to the client machine (e.g., via USB or Network Share).
    - Inside the folder, right-click `install_agent.bat` and **Run as Administrator**.
    - **That's it!** The agent is now installed as a background service.

3.  **Verification**:
    - The agent will start immediately and effectively "call home" to the server.
    - It will also restart automatically whenever the computer is powered on.
    - Check the Dashboard to see the new device appear.

## Development

If you want to modify the code:

- **Backend**: FastAPI app in `backend/main.py`.
- **Frontend**: React (Vite) app in `frontend/`.
- **Agent**: Python script in `agent.py`.
  - To rebuild the standalone EXE after changes:
    ```bash
    py build_agent.py
    ```

## Server Migration / IP Change

If the server's IP address changes (e.g. from `10.10.6.56` to `10.10.6.127`), follow these steps:

### 1. Update New Deployments
Modify `deploy/config.json` on the server so future installations use the new IP.

### 2. Update Existing Agents
On each client machine:
1. Open `config.json` in the agent installation folder.
2. Update `"api_url"` with the new IP address.
3. Restart the machine (or kill/restart `agent.exe`).

### 3. Update Frontend Display
To update the "Server Address" shown in the Dashboard Settings:
1. Edit `frontend/src/components/Settings.jsx`.
2. Locate the server IP and update it.
3. Rebuild the frontend:
   ```bash
   cd frontend
   npm run build
   ```
4. Restart the backend server.

## 🚀 Easy Startup

To launch the entire system (Backend Server + Frontend Dashboard) with a single click:

1.  Locate `start_all.bat` in the project root folder.
2.  **Double-click** it.
3.  The script will automatically:
    - Launch the **Backend Server** (FastAPI) in a new window.
    - Wait 5 seconds for initialization.
    - Launch the **Frontend Dashboard** (Vite) in another window using `--host` mode.
    - Wait another 5 seconds for the server to be ready.
    - Automatically open your default browser to `http://blackhat-x.local:5173`.

## 🗑️ Removing Devices

You can remove devices that are no longer active in two ways:

### 1. Via Dashboard
-   Navigate to "All Devices".
-   Click the **Delete** button in the "Actions" column.
-   Confirm the deletion.

> [!NOTE]
> For safety, deletion is disabled for **Network Devices**. Please retire them via status update instead.

### 2. Via Command Line (Cleanup Script)
Use the `remove_device.py` script to remove a device by IP, Hostname, or ID.

```bash
# Example: Remove by IP
python remove_device.py 192.168.1.50

# Example: Remove by Hostname
python remove_device.py old-laptop-name
```


