from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

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

def init_db():
    Base.metadata.create_all(bind=engine)
