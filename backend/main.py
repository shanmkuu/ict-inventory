from fastapi import FastAPI, Depends, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from . import database, schemas
from .routes import network_devices
import os
import csv
import io

app = FastAPI(title="ICT Inventory API")

app.include_router(network_devices.router, prefix="/api/v1/network", tags=["Network Devices"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


database.init_db()

API_KEY = "YOUR_API_KEY_HERE"


def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return x_api_key


# ── Heartbeat ─────────────────────────────────────────────────────────────────

@app.post("/api/v1/heartbeat", response_model=schemas.Device)
def receive_heartbeat(
    device_data: schemas.DeviceCreate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    db_device = db.query(database.Device).filter(database.Device.device_id == device_data.device_id).first()

    if db_device:
        for key, value in device_data.dict().items():
            if key != "timestamp":
                setattr(db_device, key, value)
        db_device.last_seen = datetime.now(timezone.utc)
    else:
        db_device = database.Device(**device_data.dict(exclude={"timestamp"}))
        db_device.last_seen = datetime.now(timezone.utc)
        db.add(db_device)
        # Audit: new device
        _write_audit(db, "DEVICE_ADDED", db_device.device_id, db_device.hostname, "agent", f"New device registered: {db_device.hostname}")

    db.commit()
    db.refresh(db_device)
    return enrich_device_status(db_device)


# ── Devices ───────────────────────────────────────────────────────────────────

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


@app.patch("/api/v1/devices/{device_id}", response_model=schemas.Device)
def update_device(
    device_id: str,
    patch: schemas.DevicePatch,
    admin: str = Query(..., description="Admin performing the update"),
    db: Session = Depends(get_db)
):
    """Update lifecycle fields (status, department, serial number, etc.)"""
    db_device = db.query(database.Device).filter(database.Device.device_id == device_id).first()
    if db_device is None:
        raise HTTPException(status_code=404, detail="Device not found")

    changes = []
    old_department = db_device.department  # capture before applying patch
    for field, value in patch.dict(exclude_none=True).items():
        old = getattr(db_device, field, None)
        if old != value:
            changes.append(f"{field}: {old!r} → {value!r}")
            setattr(db_device, field, value)

    if changes:
        _write_audit(db, "DEVICE_UPDATED", db_device.device_id, db_device.hostname, admin, "; ".join(changes))

    # Write to AssignmentHistory if department specifically changed
    new_department = patch.dict(exclude_none=True).get('department')
    if new_department is not None and new_department != old_department:
        dept_record = database.AssignmentHistory(
            device_id=db_device.device_id,
            hostname=db_device.hostname,
            serial_number=db_device.serial_number,
            previous_user=old_department or '(none)',
            new_user=new_department,
            reassigned_at=datetime.now(timezone.utc),
            admin_user=admin,
            department=new_department,
            reason=f"Department changed from '{old_department or 'none'}' to '{new_department}'",
            record_type='DEPT_CHANGE',
        )
        db.add(dept_record)

    db.commit()
    db.refresh(db_device)
    return enrich_device_status(db_device)


# Kept for backward compatibility but soft-disabled
@app.delete("/api/v1/devices/{device_id}", status_code=410)
def delete_device(device_id: str, db: Session = Depends(get_db)):
    raise HTTPException(
        status_code=410,
        detail="Hard delete is disabled. Use PATCH to set asset_status='Retired' or POST /reassign."
    )


# ── Reassign ─────────────────────────────────────────────────────────────────

@app.post("/api/v1/devices/{device_id}/reassign", response_model=schemas.AssignmentHistoryOut)
def reassign_device(
    device_id: str,
    payload: schemas.ReassignRequest,
    db: Session = Depends(get_db)
):
    db_device = db.query(database.Device).filter(database.Device.device_id == device_id).first()
    if db_device is None:
        raise HTTPException(status_code=404, detail="Device not found")

    previous_user = db_device.current_user

    # Create history record
    record = database.AssignmentHistory(
        device_id=db_device.device_id,
        hostname=db_device.hostname,
        serial_number=db_device.serial_number,
        previous_user=previous_user,
        new_user=payload.new_user,
        reassigned_at=datetime.now(timezone.utc),
        admin_user=payload.admin_user,
        department=db_device.department,
        reason=payload.reason,
    )
    db.add(record)

    # Update device owner
    db_device.current_user = payload.new_user
    db_device.asset_status = "Assigned"

    # Audit entry
    _write_audit(
        db, "REASSIGN", db_device.device_id, db_device.hostname, payload.admin_user,
        f"Reassigned from '{previous_user}' to '{payload.new_user}'. Reason: {payload.reason or 'N/A'}"
    )

    db.commit()
    db.refresh(record)
    return record


# ── Records (Assignment History) ──────────────────────────────────────────────

@app.get("/api/v1/records", response_model=List[schemas.AssignmentHistoryOut])
def list_records(
    device_id: Optional[str] = None,
    user: Optional[str] = None,
    department: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db)
):
    q = db.query(database.AssignmentHistory)
    if device_id:
        q = q.filter(database.AssignmentHistory.device_id == device_id)
    if user:
        q = q.filter(
            (database.AssignmentHistory.previous_user.ilike(f"%{user}%")) |
            (database.AssignmentHistory.new_user.ilike(f"%{user}%"))
        )
    if department:
        q = q.filter(database.AssignmentHistory.department.ilike(f"%{department}%"))
    if date_from:
        try:
            q = q.filter(database.AssignmentHistory.reassigned_at >= datetime.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            q = q.filter(database.AssignmentHistory.reassigned_at <= datetime.fromisoformat(date_to))
        except ValueError:
            pass

    records = q.order_by(database.AssignmentHistory.reassigned_at.desc()).offset(skip).limit(limit).all()
    return records


@app.get("/api/v1/records/export")
def export_records_csv(
    device_id: Optional[str] = None,
    user: Optional[str] = None,
    department: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Export assignment history as CSV."""
    records = list_records(
        device_id=device_id, user=user, department=department,
        date_from=date_from, date_to=date_to, db=db
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Device ID", "Hostname", "Serial Number", "Previous User",
                     "New User", "Reassigned At", "Admin", "Department", "Reason"])
    for r in records:
        writer.writerow([
            r.id, r.device_id, r.hostname, r.serial_number or "",
            r.previous_user or "", r.new_user,
            r.reassigned_at.isoformat() if r.reassigned_at else "",
            r.admin_user, r.department or "", r.reason or ""
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=assignment_history.csv"}
    )


# ── Audit Log ─────────────────────────────────────────────────────────────────

@app.get("/api/v1/audit", response_model=List[schemas.AuditLogOut])
def list_audit(
    device_id: Optional[str] = None,
    action: Optional[str] = None,
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db)
):
    q = db.query(database.AuditLog)
    if device_id:
        q = q.filter(database.AuditLog.device_id == device_id)
    if action:
        q = q.filter(database.AuditLog.action == action)
    return q.order_by(database.AuditLog.timestamp.desc()).offset(skip).limit(limit).all()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _write_audit(db: Session, action: str, device_id: str, hostname: str, performed_by: str, detail: str = None):
    entry = database.AuditLog(
        action=action,
        device_id=device_id,
        hostname=hostname,
        performed_by=performed_by,
        timestamp=datetime.now(timezone.utc),
        detail=detail,
    )
    db.add(entry)


def enrich_device_status(device: database.Device) -> schemas.Device:
    now = datetime.now(timezone.utc)
    if device.last_seen and device.last_seen.tzinfo is None:
        device.last_seen = device.last_seen.replace(tzinfo=timezone.utc)
    diff = now - device.last_seen
    if diff > timedelta(days=14):
        status = "unused"
    elif diff > timedelta(minutes=10):
        status = "offline"
    else:
        status = "online"
    setattr(device, "status", status)
    return device


# ── Serve Frontend ────────────────────────────────────────────────────────────

base_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dist = os.path.join(base_dir, "..", "frontend", "dist")

if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API Endpoint not found")
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    print(f"Warning: Frontend build not found at {frontend_dist}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
