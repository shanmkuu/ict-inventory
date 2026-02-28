from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Device ────────────────────────────────────────────────────────────────────

class DeviceBase(BaseModel):
    device_id: str
    hostname: str
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    os_release: Optional[str] = None
    architecture: Optional[str] = None
    system_type: Optional[str] = None
    cpu_model: Optional[str] = None
    gpu_model: Optional[str] = None
    cpu_cores_logical: Optional[int] = None
    cpu_cores_physical: Optional[int] = None
    ram_total_gb: Optional[float] = None
    disk_total_gb: Optional[float] = None
    boot_time: Optional[str] = None
    current_user: Optional[str] = None
    timestamp: Optional[str] = None
    # Lifecycle fields
    serial_number: Optional[str] = None
    asset_tag: Optional[str] = None
    department: Optional[str] = None
    asset_status: Optional[str] = "Assigned"
    condition: Optional[str] = "Functioning"
    purchase_date: Optional[str] = None
    warranty_expiry: Optional[str] = None


class DeviceCreate(DeviceBase):
    pass


class DevicePatch(BaseModel):
    """For PATCH /devices/{id} – all fields optional."""
    serial_number: Optional[str] = None
    asset_tag: Optional[str] = None
    department: Optional[str] = None
    asset_status: Optional[str] = None   # Available / Assigned / Under Repair / Retired
    condition: Optional[str] = None      # Faulty / Functioning / Decommissioned
    purchase_date: Optional[str] = None
    warranty_expiry: Optional[str] = None
    current_user: Optional[str] = None


class Device(DeviceBase):
    id: int
    last_seen: datetime
    status: str = "offline"  # Computed field (online/offline/unused)

    class Config:
        from_attributes = True


# ── Reassign ──────────────────────────────────────────────────────────────────

class ReassignRequest(BaseModel):
    new_user: str
    admin_user: str
    reason: Optional[str] = None


# ── Assignment History ────────────────────────────────────────────────────────

class AssignmentHistoryOut(BaseModel):
    id: int
    device_id: str
    hostname: Optional[str] = None
    serial_number: Optional[str] = None
    previous_user: Optional[str] = None
    new_user: str
    reassigned_at: datetime
    admin_user: str
    department: Optional[str] = None
    reason: Optional[str] = None
    condition: Optional[str] = None
    record_type: str = 'REASSIGN'  # REASSIGN | DEPT_CHANGE

    class Config:
        from_attributes = True


# ── Audit Log ────────────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: int
    action: str
    device_id: Optional[str] = None
    hostname: Optional[str] = None
    performed_by: str
    timestamp: datetime
    detail: Optional[str] = None

    class Config:
        from_attributes = True


# ── Network Device ────────────────────────────────────────────────────────────

class NetworkDeviceBase(BaseModel):
    ip_address: str
    mac_address: Optional[str] = None
    device_type: Optional[str] = "unknown"
    vendor: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    hostname: Optional[str] = None
    dns_name: Optional[str] = None
    uptime: Optional[str] = None
    firmware_version: Optional[str] = None
    system_status: Optional[str] = "offline"
    open_ports: Optional[str] = "[]"
    raw_snmp_data: Optional[str] = "{}"


class NetworkDeviceCreate(NetworkDeviceBase):
    pass


class NetworkDevice(NetworkDeviceBase):
    id: int
    last_seen: datetime

    class Config:
        from_attributes = True
