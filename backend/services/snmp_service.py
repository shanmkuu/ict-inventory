from pysnmp.hlapi import *
import asyncio
import json

class SnmpService:
    def __init__(self):
        pass

    async def poll_device(self, ip_address: str, community: str = "public"):
        """
        Polls a device for basic info using SNMP v2c.
        Returns a dict with gathered info.
        """
        # System Description (sysDescr) .1.3.6.1.2.1.1.1.0
        # System Uptime (sysUpTime) .1.3.6.1.2.1.1.3.0
        # System Name (sysName) .1.3.6.1.2.1.1.5.0
        
        # This is a blocking call in pysnmp < 5, but we run it in a thread executor
        # or use async pysnmp if available. Standard pysnmp is sync-ish or callback based.
        # For simplicity in this agent environment, we will use run_in_executor with sync cmdGen.
        
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, self._snmp_get, ip_address, community)
        return result

    def _snmp_get(self, ip, community):
        data = {}
        
        try:
            iterator = getCmd(
                SnmpEngine(),
                CommunityData(community, mpModel=1), # v2c
                UdpTransportTarget((ip, 161), timeout=1.0, retries=1),
                ContextData(),
                ObjectType(ObjectIdentity('1.3.6.1.2.1.1.1.0')), # sysDescr
                ObjectType(ObjectIdentity('1.3.6.1.2.1.1.3.0')), # sysUpTime
                ObjectType(ObjectIdentity('1.3.6.1.2.1.1.5.0')), # sysName
            )
            
            errorIndication, errorStatus, errorIndex, varBinds = next(iterator)
            
            if errorIndication:
                print(f"SNMP Error: {errorIndication}")
                return None
            elif errorStatus:
                print(f"SNMP Error Status: {errorStatus.prettyPrint()}")
                return None
            else:
                for varBind in varBinds:
                    oid = str(varBind[0])
                    val = str(varBind[1])
                    if "1.3.6.1.2.1.1.1.0" in oid:
                        data["description"] = val
                    elif "1.3.6.1.2.1.1.3.0" in oid:
                        data["uptime"] = val
                    elif "1.3.6.1.2.1.1.5.0" in oid:
                        data["hostname"] = val
                        
        except Exception as e:
            print(f"SNMP Exception: {e}")
            return None

        # Try to get interfaces count? (optional, heavy)
        return data
