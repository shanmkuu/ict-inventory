# Realtime ICT Inventory System

A lightweight system to track hardware inventory across your network. It features a central server with a modern dashboard and standalone agents for client machines.

## Features

- **Realtime Dashboard**: View all devices, online status, and hardware specs in a sleek dark-mode UI.
- **Detailed Hardware Info**: Captures Hostname, IP, OS, CPU, GPU, RAM, Disk, and System Type (Laptop/Desktop).
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

4.  **Access Dashboard**: Open `http://localhost:8000` (or `http://YOUR_SERVER_IP:8000`).

---

### 2. Client Deployment (The Devices to Track)
You do **NOT** need to install Python on client machines.

1.  **Prepare the Package**:
    - Locate the `deploy` folder on your server machine.
    - Edit `deploy/config.json`:
      ```json
      {
        "api_url": "http://YOUR_SERVER_IP:8000/api/v1/heartbeat",
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
