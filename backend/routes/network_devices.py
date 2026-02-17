from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from .. import database, schemas
from ..services.discovery_service import DiscoveryService
import json
import asyncio
from datetime import datetime, timezone

router = APIRouter()
discovery_service = DiscoveryService()

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/devices", response_model=List[schemas.NetworkDevice])
def list_network_devices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    devices = db.query(database.NetworkDevice).offset(skip).limit(limit).all()
    # Ensure JSON fields are parsed if stored as strings (actually Pydantic might handle string->dict if defined, 
    # but here we defined them as strings in DB and Pydantic. 
    # Wait, in schemas.py I defined them as STRINGS for simplicity in this iteration).
    return devices

@router.get("/devices/{device_id}", response_model=schemas.NetworkDevice)
def read_network_device(device_id: int, db: Session = Depends(get_db)):
    db_device = db.query(database.NetworkDevice).filter(database.NetworkDevice.id == device_id).first()
    if db_device is None:
        raise HTTPException(status_code=404, detail="Network Device not found")
    return db_device

@router.post("/scan")
async def start_network_scan(subnet: str, background_tasks: BackgroundTasks):
    """
    Starts a background scan of the specified subnet.
    """
    # Verify subnet format loosely
    if "/" not in subnet:
        raise HTTPException(status_code=400, detail="Invalid subnet format. Use CIDR notation (e.g. 192.168.1.0/24)")
    
    background_tasks.add_task(run_scan_task, subnet)
    return {"message": f"Scan started for {subnet}"}

async def run_scan_task(subnet: str):
    """
    Background task to run scan and update DB.
    """
    # Create a new session for the background task
    scan_db = database.SessionLocal()
    try:
        print(f"Background Scan Started: {subnet}")
        results = await discovery_service.scan_subnet(subnet)
        
        for device_info in results:
            # Check if exists by IP or MAC
            existing_dev = None
            if "mac_address" in device_info and device_info["mac_address"]:
                existing_dev = scan_db.query(database.NetworkDevice).filter(database.NetworkDevice.mac_address == device_info["mac_address"]).first()
            
            if not existing_dev:
                 existing_dev = scan_db.query(database.NetworkDevice).filter(database.NetworkDevice.ip_address == device_info["ip_address"]).first()

            # FILTERING: User wants "networking devices only".
            # We exclude "workstation" and "server" (unless user wants servers? usually 'networking devices' implies infra).
            # We keep: switch, router, printer, camera, network_appliance.
            # We exclude: workstation, unknown (unless it has SNMP data).
            
            d_type = device_info.get("device_type", "unknown")
            if d_type in ["workstation", "server"]:
                # specific excludes
                continue
            
            # If unknown, we might want to skip if no interesting ports
            if d_type == "unknown" and not device_info.get("raw_snmp_data"):
                 # Skip purely unknown devices to reduce noise
                 continue

            if existing_dev:
                # Update
                existing_dev.last_seen = datetime.now(timezone.utc)
                existing_dev.system_status = "online"
                if "hostname" in device_info: existing_dev.hostname = device_info["hostname"]
                if "device_type" in device_info and device_info["device_type"] != "unknown": existing_dev.device_type = device_info["device_type"]
                if "open_ports" in device_info: existing_dev.open_ports = device_info["open_ports"]
                if "sys_name" in device_info: existing_dev.hostname = device_info["sys_name"]
            else:
                # Create
                new_dev = database.NetworkDevice(
                    ip_address=device_info["ip_address"],
                    mac_address=device_info.get("mac_address"),
                    hostname=device_info.get("hostname"),
                    device_type=device_info.get("device_type", "unknown"),
                    system_status="online",
                    open_ports=device_info.get("open_ports", "[]"),
                    raw_snmp_data=device_info.get("raw_snmp_data", "{}"),
                    last_seen=datetime.now(timezone.utc)
                )
                scan_db.add(new_dev)
        
        scan_db.commit()
        print(f"Background Scan Completed: {len(results)} devices processed.")
        
    except Exception as e:
        print(f"Scan Task Failed: {e}")
    finally:
        scan_db.close()
