from fastapi import FastAPI, Depends, HTTPException, Header, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from . import database, schemas
import os

app = FastAPI(title="ICT Inventory API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Initialize DB on startup
# In a real app we might use alembic, but for this simple agent DB init here is fine.
database.init_db()

API_KEY = "YOUR_API_KEY_HERE"

def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return x_api_key

@app.post("/api/v1/heartbeat", response_model=schemas.Device)
def receive_heartbeat(
    device_data: schemas.DeviceCreate, 
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    # Check if device exists
    db_device = db.query(database.Device).filter(database.Device.device_id == device_data.device_id).first()
    
    if db_device:
        # Update existing
        for key, value in device_data.dict().items():
            if key != "timestamp": # We don't store the agent sent timestamp in DB model directly as 'timestamp', we use last_seen
                setattr(db_device, key, value)
        db_device.last_seen = datetime.now(timezone.utc)
    else:
        # Create new
        db_device = database.Device(**device_data.dict(exclude={"timestamp"}))
        db_device.last_seen = datetime.now(timezone.utc)
        db.add(db_device)
    
    db.commit()
    db.refresh(db_device)
    
    # Calculate status for response
    # (Though usually status is calculated on read, returning it here confirms checks)
    return enrich_device_status(db_device)

@app.get("/api/v1/devices", response_model=List[schemas.Device])
def list_devices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    devices = db.query(database.Device).offset(skip).limit(limit).all()
    return [enrich_device_status(d) for d in devices]

@app.get("/api/v1/devices/{device_id}", response_model=schemas.Device)
def read_device(device_id: str, db: Session = Depends(get_db)):
    db_device = db.query(database.Device).filter(database.Device.device_id == device_id).first()
    if db_device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return enrich_device_status(db_device)

def enrich_device_status(device: database.Device) -> schemas.Device:
    """Helper to attach status based on last_seen."""
    # Convert SQLAlchemy model to Pydantic model compatible dict first? 
    # Or just attach attribute if compatible. Pydantic from_orm handles reading attributes.
    # But 'status' is not in DB. We can wrap it.
    
    now = datetime.now(timezone.utc)
    
    # helper: ensure last_seen is timezone aware (treat existing naive times as UTC)
    if device.last_seen and device.last_seen.tzinfo is None:
        device.last_seen = device.last_seen.replace(tzinfo=timezone.utc)
        
    diff = now - device.last_seen
    
    status = "online"
    if diff > timedelta(days=14):
        status = "unused"
    elif diff > timedelta(minutes=10):
        status = "offline"
    
    # Create a copy or a new object with status
    # This is a bit hacky for the response model which expects 'status' field.
    # Pydantic orm_mode will look for .status on the object.
    setattr(device, "status", status) 
    return device

# Serve Frontend
# Mount the assets folder (CSS, JS, Images etc.) at /assets
# But Vite puts assets in /assets, so we mount the root dist folder to serve everything?
# No, let's mount /assets specifically if needed, or just mount "/" to static files BUT
# we need API routes to take precedence.
# Strategy:
# 1. API routes are already defined (FastAPI checks them first).
# 2. Mount static files.
# 3. Catch-all route for index.html (SPA).

# Assuming backend is running from `backend/` directory, and frontend is in `../frontend/dist`
# We need to construct the absolute path or relative from where main.py is run.
# If running as `py -m uvicorn backend.main:app`, cwd is root.
# If running as `cd backend && py -m uvicorn main:app`, cwd is backend.
# Let's try to find it relative to this file.
ALLOWED_EXTENSIONS = {'.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.json', '.txt', '.html', '.woff', '.woff2', '.ttf'}

base_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dist = os.path.join(base_dir, "..", "frontend", "dist")

if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # API routes are already handled above.
        # Check if file exists in dist
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
             return FileResponse(file_path)
        
        # Otherwise return index.html for SPA routing
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    print(f"Warning: Frontend build not found at {frontend_dist}")

