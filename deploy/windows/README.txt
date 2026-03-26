ICT INVENTORY SYSTEM - DEPLOYMENT INSTRUCTIONS
==============================================

SERVER INSTALLATION (One Machine)
---------------------------------
1. Folder: Ensure `backend` and `frontend` folders are present.
2. Start Server:
   Run `backend/start_server.bat` (Create this if needed, or run `py -m uvicorn main:app --host 0.0.0.0`)
   
   The Dashboard will be available at: http://YOUR_SERVER_IP:8000

CLIENT AGENT INSTALLATION (Many Machines)
-----------------------------------------
1. Edit `config.json`:
   Change "api_url" to point to your server IP.
   Example: "http://192.168.1.50:8000/api/v1/heartbeat"

2. Install:
   - Run `agent.exe --install` as Administrator.
   - This sets up a background service that runs on startup.

3. Verify:
   - Check the Dashboard. The device should appear within 5 minutes.
