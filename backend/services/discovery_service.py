import asyncio
import socket
import nmap
import json
from concurrent.futures import ThreadPoolExecutor
from .snmp_service import SnmpService

class DiscoveryService:
    def __init__(self):
        self.snmp_service = SnmpService()
        try:
            self.nm = nmap.PortScanner()
        except nmap.PortScannerError:
            print("Warning: nmap not found. Scanning capabilities will be limited.")
            self.nm = None
        except Exception as e:
            print(f"Warning: nmap init failed: {e}")
            self.nm = None

    async def scan_subnet(self, subnet, communities=["public"]):
        """
        Scans a subnet for live hosts and tries to identify them.
        """
        print(f"Starting scan on {subnet}")
        
        # 1. Ping Scan (using nmap for speed if available, else socket connect)
        # Nmap is best for discovery
        live_hosts = await self._nmap_ping_scan(subnet)
        
        results = []
        for host in live_hosts:
            device_info = await self._analyze_host(host, communities)
            results.append(device_info)
            
        print(f"Scan complete. Found {len(results)} devices.")
        return results

    async def _nmap_ping_scan(self, subnet):
        loop = asyncio.get_event_loop()
        try:
            # Check if nmap is available
            if self.nm:
                # -sn: Ping Scan - disable port scan
                # -PE: ICMP Echo
                return await loop.run_in_executor(None, self._run_nmap, subnet, "-sn -PE")
            else:
                return await self._fallback_ping_scan(subnet)
        except Exception as e:
            print(f"Nmap scan failed: {e}")
            return await self._fallback_ping_scan(subnet)

    async def _fallback_ping_scan(self, subnet):
        print(f"Running fallback scan on {subnet}")
        import ipaddress
        try:
            network = ipaddress.ip_network(subnet, strict=False)
            hosts = [str(ip) for ip in network.hosts()]
            
            # Limit scan size for safety
            if len(hosts) > 512:
                print(f"Subnet too large for fallback scan ({len(hosts)} hosts). Limiting to first 256.")
                hosts = hosts[:256]

            # Try to connect to common ports to check if host is up
            # We use 80, 443, 22, 135 (Windows RPC), 445 (SMB), 161 (SNMP)
            # Just one open port is enough to say it's alive
            
            check_ports = [80, 443, 135, 445, 22, 161]
            live_hosts = []

            async def check_host(ip):
                for port in check_ports:
                    if await self._is_port_open(ip, port, timeout=0.2):
                         return ip
                return None

            # Run in batches to avoid too many open files/sockets
            batch_size = 50
            for i in range(0, len(hosts), batch_size):
                batch = hosts[i:i+batch_size]
                tasks = [check_host(ip) for ip in batch]
                results = await asyncio.gather(*tasks)
                for res in results:
                    if res:
                        live_hosts.append(res)
            
            print(f"Fallback scan found {len(live_hosts)} hosts.")
            return live_hosts

        except Exception as e:
            print(f"Fallback scan failed: {e}")
            return []

    def _run_nmap(self, subnet, args):
        if not self.nm:
            return []
        try:
            self.nm.scan(hosts=subnet, arguments=args)
            return self.nm.all_hosts()
        except nmap.PortScannerError:
            return []
        except Exception:
            return []

    async def _analyze_host(self, ip, communities):
        info = {
            "ip_address": ip,
            "status": "online",
            "open_ports": [],
            "device_type": "unknown"
        }
        
        # 2. Port Scan (Lightweight)
        # Top interesting ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 161 (SNMP), 9100 (Printer), 135/445 (Windows)
        interesting_ports = [22, 80, 443, 161, 9100, 554, 135, 445]
        open_ports = await self._check_ports(ip, interesting_ports)
        info["open_ports"] = json.dumps(open_ports)
        
        # 3. DNS Lookup
        try:
            hostname, _, _ = await asyncio.get_event_loop().run_in_executor(None, socket.gethostbyaddr, ip)
            info["hostname"] = hostname
        except Exception:
            pass

        # 4. SNMP Poll
        if 161 in open_ports:
            for community in communities:
                snmp_data = await self.snmp_service.poll_device(ip, community)
                if snmp_data:
                    info["raw_snmp_data"] = json.dumps(snmp_data)
                    if "hostname" in snmp_data:
                        info["sys_name"] = snmp_data["hostname"] # SNMP Helper
                    if "description" in snmp_data:
                        desc = snmp_data["description"].lower()
                        if "windows" in desc:
                             info["device_type"] = "server" # or workstation
                        elif "linux" in desc:
                             info["device_type"] = "server"
                        elif "cisco" in desc or "switch" in desc:
                             info["device_type"] = "switch"
                        elif "printer" in desc or "canon" in desc or "hp" in desc:
                             info["device_type"] = "printer"
                    break
        
        # Fallback Classification
        if info["device_type"] == "unknown":
            if 9100 in open_ports:
                info["device_type"] = "printer"
            elif 554 in open_ports:
                info["device_type"] = "camera"
            elif 135 in open_ports or 445 in open_ports:
                 # Likely a Windows workstation/server
                 info["device_type"] = "workstation" 
            elif 22 in open_ports and 80 not in open_ports and 443 not in open_ports:
                 # SSH only - could be linux server or network device. 
                 # Without SNMP/OUI it's hard to tell. detailed scan would help.
                 # Let's assume server/workstation for now to be safe if user wants "networking devices"
                 pass
            elif 80 in open_ports or 443 in open_ports:
                 # Web UI present. Could be router, AP, or Server.
                 # If 135/445 NOT present, more likely to be network device/appliance.
                 if 135 not in open_ports and 445 not in open_ports:
                     info["device_type"] = "network_appliance" # Generic network device
                 
        return info

    async def _check_ports(self, ip, ports):
        open_ports = []
        for port in ports:
            if await self._is_port_open(ip, port):
                open_ports.append(port)
        return open_ports

    async def _is_port_open(self, ip, port, timeout=0.5):
        try:
            _, writer = await asyncio.wait_for(asyncio.open_connection(ip, port), timeout=timeout)
            writer.close()
            await writer.wait_closed()
            return True
        except:
            return False
