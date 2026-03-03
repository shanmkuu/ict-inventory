import sqlite3
import os

db_path = os.path.join('backend', 'inventory.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, hostname, ip_address, device_type FROM network_devices")
rows = cursor.fetchall()

print("ID | Hostname | IP Address | Type")
print("-" * 40)
for row in rows:
    print(f"{row[0]} | {row[1]} | {row[2]} | {row[3]}")

conn.close()
