from backend import database
from datetime import datetime

print("Initializing DB...")
database.init_db()

session = database.SessionLocal()

# Check count
count = session.query(database.NetworkDevice).count()
print(f"Current NetworkDevice count: {count}")

if count == 0:
    print("Seeding valid test device...")
    test_device = database.NetworkDevice(
        ip_address="192.168.1.99",
        mac_address="00:11:22:33:44:55",
        device_type="Switch",
        vendor="Cisco",
        model="Catalyst 2960",
        hostname="corpswitch01",
        system_status="online",
        last_seen=datetime.utcnow(),
        open_ports='[22, 161, 443]',
        raw_snmp_data='{"uptime": "100 days"}'
    )
    session.add(test_device)
    session.commit()
    print("Seeded 1 device.")
else:
    print("Devices already exist.")

session.close()
