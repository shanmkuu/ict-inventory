import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath('backend'))

from services.discovery_service import DiscoveryService

async def main():
    ds = DiscoveryService()
    subnets = ds.get_local_subnets()
    print("Detected subnets:", subnets)
    
    if subnets:
        print("Scanning first subnet:", subnets[0])
        results = await ds.scan_subnet(subnets[0])
        print("Results:")
        for r in results:
            print(f"IP: {r['ip_address']} - MAC: {r['mac_address']} - Type: {r['device_type']} - Name: {r['hostname']}")
    else:
        print("No subnets found.")

if __name__ == "__main__":
    asyncio.run(main())
