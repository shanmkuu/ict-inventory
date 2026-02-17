from pydantic import BaseModel
from typing import Optional
from datetime import datetime

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

class DeviceCreate(DeviceBase):
    pass

class Device(DeviceBase):
    id: int
    last_seen: datetime
    status: str = "offline" # Computed field

    class Config:
        from_attributes = True

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
    open_ports: Optional[str] = "[]" # JSON string
    raw_snmp_data: Optional[str] = "{}" # JSON string

class NetworkDeviceCreate(NetworkDeviceBase):
    pass

class NetworkDevice(NetworkDeviceBase):
    id: int
    last_seen: datetime

    class Config:
        from_attributes = True
