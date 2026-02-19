import argparse
import sys
from sqlalchemy.orm import Session
from backend.database import SessionLocal, Device, NetworkDevice

def remove_device(identifier):
    db: Session = SessionLocal()
    try:
        deleted = False
        
        # 1. Try to find/delete in 'devices' table (Agents)
        # Check by device_id
        device = db.query(Device).filter(Device.device_id == identifier).first()
        if not device:
            # Check by hostname
            device = db.query(Device).filter(Device.hostname == identifier).first()
        if not device:
            # Check by IP
            device = db.query(Device).filter(Device.ip_address == identifier).first()
            
        if device:
            print(f"Found device in 'devices' table: {device.hostname} ({device.ip_address})")
            db.delete(device)
            deleted = True

        # 2. Try to find/delete in 'network_devices' table (Scanned)
        # Check by IP
        net_device = db.query(NetworkDevice).filter(NetworkDevice.ip_address == identifier).first()
        if not net_device:
            # Check by hostname
            net_device = db.query(NetworkDevice).filter(NetworkDevice.hostname == identifier).first()
        
        # Check by ID (if identifier is numeric)
        if not net_device and identifier.isdigit():
             net_device = db.query(NetworkDevice).filter(NetworkDevice.id == int(identifier)).first()

        if net_device:
            print(f"Found device in 'network_devices' table: {net_device.hostname} ({net_device.ip_address})")
            db.delete(net_device)
            deleted = True

        if deleted:
            db.commit()
            print(f"Successfully removed device(s) matching '{identifier}'.")
        else:
            print(f"No device found matching '{identifier}'.")

    except Exception as e:
        print(f"Error removing device: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Remove a device from the inventory database.")
    parser.add_argument("identifier", help="IP address, Hostname, or Device ID of the device to remove")
    
    args = parser.parse_args()
    
    remove_device(args.identifier)
