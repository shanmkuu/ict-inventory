import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone
import sys
import os

# Add parent directory to path to import backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import database, schemas, main

class TestDeviceUniqueness(unittest.TestCase):
    def setUp(self):
        # Use in-memory database for testing
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        database.Base.metadata.create_all(bind=self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db = self.SessionLocal()
        
        # Override main.get_db to use our test db if needed, 
        # but we call the function directly passing the db instance.
        main.API_KEY = "test_key"

    def tearDown(self):
        self.db.close()

    def test_user_change_tracking(self):
        # 1. First heartbeat from User A
        device_id = "test-device-uuid-123"
        data_a = schemas.DeviceCreate(
            device_id=device_id,
            hostname="TEST-PC",
            current_user="UserA",
            serial_number="SN123",
            ip_address="192.168.1.10",
            mac_address="AA:BB:CC:DD:EE:FF"
        )
        
        # Call receive_heartbeat directly
        res1 = main.receive_heartbeat(data_a, self.db, "test_key")
        
        self.assertEqual(res1.current_user, "UserA")
        
        # Verify one device in DB
        devices = self.db.query(database.Device).all()
        self.assertEqual(len(devices), 1)
        self.assertEqual(devices[0].current_user, "UserA")
        self.assertEqual(devices[0].device_id, device_id)
        
        # 2. Second heartbeat from User B on same device_id
        data_b = schemas.DeviceCreate(
            device_id=device_id,
            hostname="TEST-PC",
            current_user="UserB",
            serial_number="SN123",
            ip_address="192.168.1.10",
            mac_address="AA:BB:CC:DD:EE:FF"
        )
        
        res2 = main.receive_heartbeat(data_b, self.db, "test_key")
        
        self.assertEqual(res2.current_user, "UserB")
        
        # Verify STILL only one device in DB
        devices = self.db.query(database.Device).all()
        self.assertEqual(len(devices), 1)
        self.assertEqual(devices[0].current_user, "UserB")
        self.assertEqual(devices[0].device_id, device_id)
        
        # 3. Check Audit Logs
        audit_logs = self.db.query(database.AuditLog).order_by(database.AuditLog.timestamp.asc()).all()
        # Should have DEVICE_ADDED and USER_LOGON
        actions = [a.action for a in audit_logs]
        self.assertEqual(actions[0], "DEVICE_ADDED")
        self.assertEqual(actions[1], "USER_LOGON")
        self.assertIn("User changed from 'UserA' to 'UserB'", audit_logs[1].detail)
        
        # 4. Check Assignment History
        history = self.db.query(database.AssignmentHistory).all()
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0].previous_user, "UserA")
        self.assertEqual(history[0].new_user, "UserB")
        self.assertEqual(history[0].record_type, "USER_LOGON")
        self.assertEqual(history[0].serial_number, "SN123")

if __name__ == "__main__":
    unittest.main()
