from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import database, schemas
from ..services.discovery_service import DiscoveryService
import json
import asyncio
from datetime import datetime, timezone

router = APIRouter()
discovery_service = DiscoveryService()

# ---------------------------------------------------------------------------
# Scan State — tracks whether a scan is currently running and its progress
# ---------------------------------------------------------------------------
scan_state = {
    "running": False,
    "subnets": [],
    "started_at": None,
    "finished_at": None,
    "devices_found": 0,
    "error": None,
}

# Background periodic scan task handle (so we can cancel on shutdown if needed)
_periodic_task = None

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Periodic auto-scan launcher (called once at startup from main.py)
# ---------------------------------------------------------------------------
async def start_periodic_scan(interval_seconds: int = 300):
    """
    Runs an automatic network scan every `interval_seconds` (default 5 min).
    Meant to be launched as a background asyncio task from the app lifespan.
    """
    # Wait a few seconds after startup before the first scan
    await asyncio.sleep(5)
    while True:
        await _run_auto_scan()
        await asyncio.sleep(interval_seconds)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/scan-status")
def get_scan_status():
    """Returns the current state of the network scan."""
    return {
        "running": scan_state["running"],
        "subnets": scan_state["subnets"],
        "started_at": scan_state["started_at"].isoformat() if scan_state["started_at"] else None,
        "finished_at": scan_state["finished_at"].isoformat() if scan_state["finished_at"] else None,
        "devices_found": scan_state["devices_found"],
        "error": scan_state["error"],
    }


@router.get("/devices", response_model=List[schemas.NetworkDevice])
def list_network_devices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    devices = db.query(database.NetworkDevice).offset(skip).limit(limit).all()
    return devices


@router.get("/devices/{device_id}", response_model=schemas.NetworkDevice)
def read_network_device(device_id: int, db: Session = Depends(get_db)):
    db_device = db.query(database.NetworkDevice).filter(database.NetworkDevice.id == device_id).first()
    if db_device is None:
        raise HTTPException(status_code=404, detail="Network Device not found")
    return db_device


@router.delete("/devices/{device_id}", status_code=204)
def delete_network_device(device_id: int, db: Session = Depends(get_db)):
    db_device = db.query(database.NetworkDevice).filter(database.NetworkDevice.id == device_id).first()
    if db_device is None:
        raise HTTPException(status_code=404, detail="Network Device not found")
    db.delete(db_device)
    db.commit()
    return None


@router.delete("/clear", status_code=204)
def clear_all_network_devices(db: Session = Depends(get_db)):
    """Deletes all records from the network_devices table."""
    try:
        db.query(database.NetworkDevice).delete()
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return None


@router.post("/scan")
async def start_network_scan(background_tasks: BackgroundTasks, subnet: Optional[str] = None):
    """
    Starts a background scan.
    - If `subnet` is provided (CIDR), scan only that subnet (backward-compatible).
    - If `subnet` is omitted, auto-detect local network interfaces and scan them.
    """
    if scan_state["running"]:
        return {"message": "A scan is already in progress.", "subnets": scan_state["subnets"]}

    if subnet:
        if "/" not in subnet:
            raise HTTPException(status_code=400, detail="Invalid subnet format. Use CIDR notation (e.g. 192.168.1.0/24)")
        subnets = [subnet]
    else:
        subnets = discovery_service.get_local_subnets()
        if not subnets:
            raise HTTPException(status_code=500, detail="Could not auto-detect any local subnets. Try specifying a subnet manually.")

    background_tasks.add_task(run_scan_task, subnets)
    return {"message": f"Scan started for: {', '.join(subnets)}", "subnets": subnets}


# ---------------------------------------------------------------------------
# Internal scan runner
# ---------------------------------------------------------------------------

async def _run_auto_scan():
    """Runs an automatic scan of all detected local subnets."""
    subnets = discovery_service.get_local_subnets()
    if subnets:
        await run_scan_task(subnets)
    else:
        print("[AutoScan] No subnets detected, skipping periodic scan.")


async def run_scan_task(subnets: list):
    """
    Background task to run scans across one or more subnets and update the DB.
    Updates scan_state throughout for frontend polling.
    """
    global scan_state

    if scan_state["running"]:
        print("[Scan] Already running, skipping duplicate scan request.")
        return

    scan_state["running"] = True
    scan_state["subnets"] = subnets
    scan_state["started_at"] = datetime.now(timezone.utc)
    scan_state["finished_at"] = None
    scan_state["devices_found"] = 0
    scan_state["error"] = None

    scan_db = database.SessionLocal()
    total_found = 0

    try:
        print(f"[Scan] Starting scan on subnets: {subnets}")

        for subnet in subnets:
            print(f"[Scan] Scanning subnet: {subnet}")
            results = await discovery_service.scan_subnet(subnet)

            for device_info in results:
                # Filtering: keep networking/peripheral devices, exclude personal computers/phones
                d_type = device_info.get("device_type", "unknown")
                excluded_types = ["workstation", "server", "computer", "mobile", "phone", "tablet", "laptop", "desktop"]
                if d_type in excluded_types:
                    # Update actual MAC in Devices table if found
                    mac = device_info.get("mac_address")
                    ip = device_info.get("ip_address")
                    if mac and ip:
                        db_device = scan_db.query(database.Device).filter(
                            database.Device.ip_address == ip
                        ).first()
                        if db_device and db_device.mac_address != mac:
                            print(f"[Scan] Correcting MAC address for {db_device.hostname} from {db_device.mac_address} to {mac}")
                            db_device.mac_address = mac
                    continue

                # Look up by MAC first, then IP
                existing_dev = None
                if device_info.get("mac_address"):
                    existing_dev = scan_db.query(database.NetworkDevice).filter(
                        database.NetworkDevice.mac_address == device_info["mac_address"]
                    ).first()

                if not existing_dev:
                    existing_dev = scan_db.query(database.NetworkDevice).filter(
                        database.NetworkDevice.ip_address == device_info["ip_address"]
                    ).first()

                if existing_dev:
                    # Update existing record
                    existing_dev.last_seen = datetime.now(timezone.utc)
                    existing_dev.system_status = "online"

                    if device_info.get("mac_address"):
                        existing_dev.mac_address = device_info["mac_address"]

                    if device_info.get("hostname"):
                        # Don't overwrite a good hostname with a generic IP-based one
                        if existing_dev.hostname and "ip-" not in existing_dev.hostname and "ip-" in device_info["hostname"]:
                            pass
                        else:
                            existing_dev.hostname = device_info["hostname"]

                    if device_info.get("device_type") and device_info["device_type"] != "unknown":
                        # If existing is generic, and new is specific, upgrade it
                        networking_types = ["switch", "router", "access_point", "firewall", "printer", "camera", "media_player", "projector", "smart_tv"]
                        if existing_dev.device_type not in networking_types and device_info["device_type"] in networking_types:
                            existing_dev.device_type = device_info["device_type"]
                        elif existing_dev.device_type == "unknown":
                            existing_dev.device_type = device_info["device_type"]

                    if "open_ports" in device_info:
                        existing_dev.open_ports = device_info["open_ports"]
                    if device_info.get("vendor"):
                        existing_dev.vendor = device_info["vendor"]
                    if device_info.get("sys_name"):
                        existing_dev.hostname = device_info["sys_name"]
                else:
                    # Create new record
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

                total_found += 1
                scan_state["devices_found"] = total_found

        # Mark devices not seen in this scan cycle as offline
        # (only if they were previously online and last_seen > 15 min ago)
        cutoff_ts = datetime.now(timezone.utc).timestamp() - 900  # 15 minutes
        all_devices = scan_db.query(database.NetworkDevice).all()
        for dev in all_devices:
            if dev.system_status == "online" and dev.last_seen:
                # SQLite stores naive datetimes; treat them as UTC
                ls = dev.last_seen
                if ls.tzinfo is None:
                    ls = ls.replace(tzinfo=timezone.utc)
                if ls.timestamp() < cutoff_ts:
                    dev.system_status = "offline"

        scan_db.commit()
        print(f"[Scan] Completed. {total_found} devices processed across {len(subnets)} subnet(s).")

    except Exception as e:
        scan_state["error"] = str(e)
        print(f"[Scan] Task failed: {e}")
    finally:
        scan_db.close()
        scan_state["running"] = False
        scan_state["finished_at"] = datetime.now(timezone.utc)
