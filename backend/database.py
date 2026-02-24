from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DATABASE_URL = "sqlite:///./inventory.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, unique=True, index=True)
    hostname = Column(String, index=True)
    ip_address = Column(String)
    mac_address = Column(String)
    os_name = Column(String)
    os_version = Column(String)
    os_release = Column(String)
    architecture = Column(String)
    system_type = Column(String)
    cpu_model = Column(String)
    gpu_model = Column(String)
    cpu_cores_logical = Column(Integer)
    cpu_cores_physical = Column(Integer)
    ram_total_gb = Column(Float)
    disk_total_gb = Column(Float)
    boot_time = Column(String)
    current_user = Column(String)
    last_seen = Column(DateTime, default=datetime.utcnow)
    # --- New lifecycle fields ---
    serial_number = Column(String, nullable=True)
    asset_tag = Column(String, nullable=True)
    department = Column(String, nullable=True)
    asset_status = Column(String, default="Assigned")  # Available/Assigned/Under Repair/Retired
    purchase_date = Column(String, nullable=True)
    warranty_expiry = Column(String, nullable=True)


class AssignmentHistory(Base):
    __tablename__ = "assignment_history"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True)
    hostname = Column(String)
    serial_number = Column(String, nullable=True)
    previous_user = Column(String, nullable=True)
    new_user = Column(String)
    reassigned_at = Column(DateTime, default=datetime.utcnow)
    admin_user = Column(String)
    department = Column(String, nullable=True)
    reason = Column(Text, nullable=True)
    record_type = Column(String, default='REASSIGN')  # REASSIGN | DEPT_CHANGE


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String)          # e.g. "REASSIGN", "STATUS_CHANGE", "DEVICE_ADDED"
    device_id = Column(String, index=True, nullable=True)
    hostname = Column(String, nullable=True)
    performed_by = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    detail = Column(Text, nullable=True)


class NetworkDevice(Base):
    __tablename__ = "network_devices"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String, index=True)
    mac_address = Column(String, index=True)
    device_type = Column(String)
    vendor = Column(String)
    model = Column(String)
    serial_number = Column(String)
    hostname = Column(String)
    dns_name = Column(String)
    uptime = Column(String)
    firmware_version = Column(String)
    system_status = Column(String)
    open_ports = Column(String)
    raw_snmp_data = Column(String)
    last_seen = Column(DateTime, default=datetime.utcnow)


def _migrate_add_columns(connection):
    """Non-destructively add new columns to the devices table if they don't exist."""
    new_cols_devices = [
        ("serial_number", "VARCHAR"),
        ("asset_tag", "VARCHAR"),
        ("department", "VARCHAR"),
        ("asset_status", "VARCHAR DEFAULT 'Assigned'"),
        ("purchase_date", "VARCHAR"),
        ("warranty_expiry", "VARCHAR"),
    ]
    for col_name, col_type in new_cols_devices:
        try:
            connection.execute(
                __import__('sqlalchemy').text(
                    f"ALTER TABLE devices ADD COLUMN {col_name} {col_type}"
                )
            )
        except Exception:
            pass  # Column already exists

    # Migrate assignment_history table
    new_cols_history = [
        ("record_type", "VARCHAR DEFAULT 'REASSIGN'"),
    ]
    for col_name, col_type in new_cols_history:
        try:
            connection.execute(
                __import__('sqlalchemy').text(
                    f"ALTER TABLE assignment_history ADD COLUMN {col_name} {col_type}"
                )
            )
        except Exception:
            pass  # Column already exists


def init_db():
    # Create all tables (non-destructive)
    Base.metadata.create_all(bind=engine)
    # Run migration for new columns on existing devices table
    with engine.begin() as conn:
        _migrate_add_columns(conn)
