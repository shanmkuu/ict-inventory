import asyncio
import socket
import nmap
import json
import ipaddress
import struct
import platform
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

    def get_local_subnets(self):
        """
        Auto-detects active network interfaces and returns their subnets in CIDR notation.
        Uses only stdlib — no netifaces dependency.
        Excludes loopback (127.x) and link-local (169.254.x) addresses.
        Private /24 subnets are expanded to /22 so that ~1000 IPs are scanned
        (e.g. 10.10.6.0/22 covers 10.10.4.x through 10.10.7.x).
        """
        subnets = []
        
        try:
            if platform.system().lower() == "windows":
                subnets = self._get_subnets_windows()
            else:
                subnets = self._get_subnets_unix()
        except Exception as e:
            print(f"[AutoScan] Subnet detection failed: {e}")
        
        # Fallback: try the hostname-based approach
        if not subnets:
            try:
                hostname = socket.gethostname()
                local_ip = socket.gethostbyname(hostname)
                ip = ipaddress.IPv4Address(local_ip)
                if not ip.is_loopback and not ip.is_link_local:
                    network = ipaddress.IPv4Network(f"{local_ip}/24", strict=False)
                    subnets.append(str(network))
                    print(f"[AutoScan] Fallback subnet detection: {network}")
            except Exception as e:
                print(f"[AutoScan] Fallback detection also failed: {e}")

        # Expand private /24 (or tighter) subnets to /22 to cover ~1000 hosts.
        # This lets the scanner reach IPs past .254 by spanning adjacent blocks.
        expanded = []
        for subnet_str in subnets:
            try:
                net = ipaddress.IPv4Network(subnet_str, strict=False)
                if net.is_private and net.prefixlen >= 24:
                    wider = net.supernet(new_prefix=22)
                    expanded_str = str(wider)
                    if expanded_str not in expanded:
                        expanded.append(expanded_str)
                    print(f"[AutoScan] Expanded {subnet_str} → {expanded_str} (~{wider.num_addresses - 2} hosts)")
                else:
                    if subnet_str not in expanded:
                        expanded.append(subnet_str)
            except Exception:
                if subnet_str not in expanded:
                    expanded.append(subnet_str)

        print(f"[AutoScan] Final subnets to scan: {expanded}")
        return expanded

    def _get_subnets_windows(self):
        """Use ipconfig output to find subnets on Windows."""
        import subprocess
        import re
        subnets = []
        try:
            result = subprocess.run(
                ["ipconfig"],
                capture_output=True, text=True, timeout=10
            )
            output = result.stdout

            # Parse IPv4 Address + Subnet Mask pairs
            # Example:
            #   IPv4 Address. . . . . . . . . . . : 192.168.1.100
            #   Subnet Mask . . . . . . . . . . . : 255.255.255.0
            ip_pattern = re.compile(r"IPv4 Address[.\s]+:\s+([\d.]+)")
            mask_pattern = re.compile(r"Subnet Mask[.\s]+:\s+([\d.]+)")

            ips = ip_pattern.findall(output)
            masks = mask_pattern.findall(output)

            for ip_str, mask_str in zip(ips, masks):
                try:
                    ip = ipaddress.IPv4Address(ip_str)
                    if ip.is_loopback or ip.is_link_local:
                        continue
                    network = ipaddress.IPv4Network(f"{ip_str}/{mask_str}", strict=False)
                    subnet_cidr = str(network)
                    if subnet_cidr not in subnets:
                        subnets.append(subnet_cidr)
                except Exception:
                    pass
        except Exception as e:
            print(f"[AutoScan] Windows subnet detection error: {e}")
        return subnets

    def _get_subnets_unix(self):
        """Use 'ip addr' or 'ifconfig' to find subnets on Unix/Linux."""
        import subprocess
        import re
        subnets = []
        try:
            # Try 'ip addr show' first (modern Linux)
            try:
                result = subprocess.run(
                    ["ip", "addr", "show"],
                    capture_output=True, text=True, timeout=10
                )
                output = result.stdout
                # Match: inet 192.168.1.100/24
                for match in re.finditer(r"inet\s+([\d.]+/\d+)", output):
                    try:
                        network = ipaddress.IPv4Network(match.group(1), strict=False)
                        if not network.is_loopback and not network.is_link_local:
                            subnet_cidr = str(network)
                            if subnet_cidr not in subnets:
                                subnets.append(subnet_cidr)
                    except Exception:
                        pass
            except FileNotFoundError:
                # Fallback to ifconfig
                result = subprocess.run(
                    ["ifconfig"],
                    capture_output=True, text=True, timeout=10
                )
                output = result.stdout
                for match in re.finditer(r"inet\s+([\d.]+)\s+netmask\s+([\d.]+)", output):
                    try:
                        ip_str, mask_str = match.group(1), match.group(2)
                        ip = ipaddress.IPv4Address(ip_str)
                        if ip.is_loopback or ip.is_link_local:
                            continue
                        network = ipaddress.IPv4Network(f"{ip_str}/{mask_str}", strict=False)
                        subnet_cidr = str(network)
                        if subnet_cidr not in subnets:
                            subnets.append(subnet_cidr)
                    except Exception:
                        pass
        except Exception as e:
            print(f"[AutoScan] Unix subnet detection error: {e}")
        return subnets

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
        print(f"Running fallback ping scan on {subnet}")
        import ipaddress
        import platform
        
        try:
            network = ipaddress.ip_network(subnet, strict=False)
            hosts = [str(ip) for ip in network.hosts()]
            
            # Limit scan size for safety (1024 covers a full /22)
            if len(hosts) > 1024:
                print(f"Subnet too large for fallback scan ({len(hosts)} hosts). Limiting to first 1024.")
                hosts = hosts[:1024]

            # Use system ping
            # Windows: ping -n 1 -w 500 <ip>
            # Linux: ping -c 1 -W 1 <ip>
            
            param = '-n' if platform.system().lower() == 'windows' else '-c'
            wait_param = '-w' if platform.system().lower() == 'windows' else '-W'
            wait_val = '500' if platform.system().lower() == 'windows' else '1' # ms in windows, s in linux
            
            live_hosts = []
            
            sem = asyncio.Semaphore(50) # Limit concurrency

            async def ping_host(ip):
                async with sem:
                    try:
                        proc = await asyncio.create_subprocess_exec(
                            'ping', param, '1', wait_param, wait_val, ip,
                            stdout=asyncio.subprocess.DEVNULL,
                            stderr=asyncio.subprocess.DEVNULL
                        )
                        await proc.wait()
                        if proc.returncode == 0:
                            return ip
                    except Exception:
                        pass
                    return None

            tasks = [ping_host(ip) for ip in hosts]
            results = await asyncio.gather(*tasks)
            
            for res in results:
                if res:
                    live_hosts.append(res)
            
            print(f"Fallback ping scan found {len(live_hosts)} hosts.")
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
            "device_type": "unknown",
            "mac_address": None,
            "vendor": None,
            "hostname": None
        }
        
        # 1. ARP Lookup (Get MAC) - Essential for Vendor ID
        # Since we just pinged, ARP table should be fresh.
        info["mac_address"] = await self._get_mac_from_arp(ip)
        if info["mac_address"]:
            info["vendor"] = self._get_vendor(info["mac_address"])

        # 2. Port Scan (Lightweight)
        # Top interesting ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 161 (SNMP), 9100 (Printer), 135/445 (Windows), 554 (RTSP), 8080
        interesting_ports = [22, 80, 443, 161, 9100, 554, 135, 445, 8080, 8443]
        open_ports = await self._check_ports(ip, interesting_ports)
        info["open_ports"] = json.dumps(open_ports)
        
        # 3. DNS Lookup
        try:
            hostname, _, _ = await asyncio.get_event_loop().run_in_executor(None, socket.gethostbyaddr, ip)
            info["hostname"] = hostname
        except Exception:
            pass

        # 4. HTTP / HTTPS Fingerprinting (If port 80/443/8080 open)
        # Check for web interface title
        web_ports = [p for p in open_ports if p in [80, 443, 8080, 8443]]
        if web_ports:
             web_info = await self._get_http_info(ip, web_ports[0])
             if web_info:
                 if web_info.get("title"):
                     if not info["hostname"] or "ip-" in info.get("hostname", ""):
                         info["hostname"] = web_info["title"]
                     else:
                         info["hostname"] = f"{info['hostname']} ({web_info['title']})"
                 
                 # Refine type based on web info
                 title_lower = web_info.get("title", "").lower()
                 server_lower = web_info.get("server", "").lower()
                 
                 if "printer" in title_lower or "jetdirect" in server_lower:
                     info["device_type"] = "printer"
                 elif "camera" in title_lower or "ipcam" in title_lower or "netcam" in server_lower:
                     info["device_type"] = "camera"
                 elif "router" in title_lower or "gateway" in title_lower or "openwrt" in title_lower:
                     info["device_type"] = "router"
                 elif "chromecast" in server_lower:
                     info["device_type"] = "media_player"
        
        # 4.5 NetBIOS Lookup (Windows Names)
        # If hostname is still generic or empty, try NetBIOS
        if not info["hostname"] or info["hostname"] == ip:
             nb_name = await self._get_netbios_name(ip)
             if nb_name:
                 info["hostname"] = nb_name
                 # If we found a NetBIOS name, it's likely a specific type of device
                 if info["device_type"] == "unknown":
                     # NetBIOS usually means Windows, Samba (Linux), or Printers
                     if "workstation" in str(nb_name).lower(): # sometimes names hint
                         pass 
                     # We can't be sure it's a workstation just from NetBIOS, but it's a strong hint for "computer-like"
                     
        # 5. SNMP Poll (If 161 open)
        if 161 in open_ports:
            for community in communities:
                snmp_data = await self.snmp_service.poll_device(ip, community)
                if snmp_data:
                    info["raw_snmp_data"] = json.dumps(snmp_data)
                    if "hostname" in snmp_data:
                        info["sys_name"] = snmp_data["hostname"]
                    if "description" in snmp_data:
                         desc = snmp_data["description"].lower()
                         if "windows" in desc: info["device_type"] = "server"
                         elif "linux" in desc: info["device_type"] = "server"
                         elif "cisco" in desc or "switch" in desc: info["device_type"] = "switch"
                         elif "printer" in desc or "canon" in desc or "hp" in desc: info["device_type"] = "printer"
                    break
        
        # 6. Classification Logic (Refined)
        # Use Vendor Hints first if type is unknown
        if info["device_type"] == "unknown" and info["vendor"]:
             v = info["vendor"].lower()
             if "apple" in v: info["device_type"] = "workstation" # or mobile
             elif "dell" in v or "lenovo" in v: info["device_type"] = "workstation"
             elif "hp" in v and 9100 in open_ports: info["device_type"] = "printer"
             elif "epson" in v or "brother" in v or "xerox" in v: info["device_type"] = "printer"
             elif "sony" in v or "samsung" in v or "lg" in v: info["device_type"] = "smart_tv"
             elif "ubiquiti" in v or "cisco" in v or "netgear" in v: info["device_type"] = "network_appliance" # switch/ap


        # Fallback Classification based on hostname keywords
        hostname = str(info.get("hostname", "")).lower()
        if hostname:
            if any(x in hostname for x in ["iphone", "android", "galaxy", "ipad", "phone", "mobile"]):
                info["device_type"] = "mobile"
            elif any(x in hostname for x in ["macbook", "imac", "desktop", "laptop", "pc", "windows", "computer"]):
                info["device_type"] = "workstation"
            elif any(x in hostname for x in ["printer", "xerox", "brother", "canon", "hp", "epson"]) and info["device_type"] == "unknown":
                 if "projector" in hostname: info["device_type"] = "projector"
                 else: info["device_type"] = "printer"
            elif "projector" in hostname or "benq" in hostname or "sony" in hostname:
                info["device_type"] = "projector"
            elif "switch" in hostname or "ubiquiti" in hostname or "unifi" in hostname or "cisco" in hostname:
                info["device_type"] = "switch"
            elif "tv" in hostname or "bravia" in hostname or "samsung" in hostname or "lg" in hostname:
                info["device_type"] = "smart_tv"

        if info["device_type"] == "unknown":
            if 9100 in open_ports:
                info["device_type"] = "printer"
            elif 554 in open_ports:
                info["device_type"] = "camera"
            elif 135 in open_ports or 445 in open_ports:
                 info["device_type"] = "workstation" 
            elif 80 in open_ports or 443 in open_ports:
                 if 135 not in open_ports and 445 not in open_ports:
                     info["device_type"] = "network_appliance"
                 
        return info

    async def _check_ports(self, ip, ports):
        open_ports = []
        for port in ports:
            if await self._is_port_open(ip, port):
                open_ports.append(port)
        return open_ports

    async def _is_port_open(self, ip, port, timeout=1.5):
        try:
            _, writer = await asyncio.wait_for(asyncio.open_connection(ip, port), timeout=timeout)
            writer.close()
            await writer.wait_closed()
            return True
        except:
            return False

    async def _get_mac_from_arp(self, ip):
        """
        Retrieves MAC address from ARP cache using command line.
        Works best after pinging the IP.
        """
        import subprocess
        import re
        
        try:
            # Refresh ARP cache by pinging once quickly
            # This ensures the entry exists before we look for it
            # We don't care about the result, just side effect
            cmd = ['ping', '-n', '1', '-w', '100', ip] # Windows specific
            # For Linux use -c 1 -W 1. We should ideally detect OS.
            # But the service already imports platform in _fallback_ping_scan.
            # Let's just blindly try or rely on the recent scan. 
            # Actually, doing it here makes this function standalone robust.
            
            proc_ping = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL
            )
            await proc_ping.wait()

            # Create subprocess args
            # Windows: arp -a {ip}
            # Linux: arp -n {ip} (or ip neigh show {ip})
            # We stick to arp -a <ip> which usually works on Windows
            
            proc = await asyncio.create_subprocess_exec(
                'arp', '-a', ip,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL
            )
            stdout, _ = await proc.communicate()
            output = stdout.decode('utf-8', errors='ignore')
            
            # Regex to find MAC for specific IP
            # Windows Output: 192.168.1.50   00-11-22-33-44-55   dynamic
            # We loosen the regex to just look for ANY mac address on the line causing fewer issues
            
            # Look for pattern: XX-XX-XX-XX-XX-XX or XX:XX:XX:XX:XX:XX
            mac_pattern = r"([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})"
            match = re.search(mac_pattern, output)
            
            if match:
                mac = match.group(0).replace('-', ':').upper()
                return mac
            return None
        except Exception:
            return None

    async def _get_netbios_name(self, ip):
        """
        Try to get NetBIOS name using nbtstat (Windows only).
        """
        import shutil
        if not shutil.which("nbtstat"):
            return None
            
        try:
            proc = await asyncio.create_subprocess_exec(
                'nbtstat', '-A', ip,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL
            )
            stdout, _ = await proc.communicate()
            output = stdout.decode('utf-8', errors='ignore')
            
            # Look for lines like:   ADMIN-PC       <00>  UNIQUE
            # We want the first UNIQUE name usually
            import re
            # Match: name followed by <00>
            match = re.search(r"\s+(\S+)\s+<00>\s+UNIQUE", output)
            if match:
                return match.group(1)
            return None
        except Exception:
            return None

    def _get_vendor(self, mac):
        """
        Simple OUI lookup. 
        """
        if not mac: return None
        prefix = mac.replace(':', '').upper()[:6]
        
        # Mini OUI Database (Expand as needed or use API/File)
        # 3 bytes = 6 hex chars
        VENDORS = {
            "001C42": "Parallels",
            "005056": "VMware",
            "000C29": "VMware",
            "00155D": "Microsoft (Hyper-V)",
            "B827EB": "Raspberry Pi",
            "DCA632": "Raspberry Pi",
            "E45F01": "Raspberry Pi",
            "001132": "Synology",
            "0011D9": "TiVo",
            "0014A4": "Hon Hai (Foxconn)",
            "001BD0": "Cisco",
            "00000C": "Cisco",
            "1866DA": "Cisco",
            "F4F26D": "TP-Link",
            "50C7BF": "TP-Link",
            "18E829": "Ubiquiti",
            "24A43C": "Ubiquiti",
            "7483C2": "Ubiquiti",
            "802AA8": "Ubiquiti",
            "001A11": "Google",
            "D850E6": "Google (Nest)",
            "001E52": "Sony",
            "F0F61C": "Apple",
            "BC926B": "Apple",
            "7C6DF8": "Apple", # Many Apple OUIs...
            "C869CD": "Apple",
            "A483E7": "Apple",
            "AC87A3": "Apple",
            "D4DC29": "Apple",
            "0025D3": "AzureWave (often in IoT)",
            "B88D12": "Apple",
            "7085C2": "Apple",
            "D05099": "ASRock",
            "902B34": "Giga-Byte",
            "049226": "ASUSTek",
            "2C4D54": "ASUSTek",
            "100000": "Private",
            "001B21": "Intel",
            "14DAE9": "ASUSTek",
            "C85B76": "Lenovo",
            "606720": "Intel",
            "54E1AD": "Sony (TV)",
            "300ED5": "Sony (PlayStation)",
            "00249B": "Samsung",
            "5C6199": "Samsung",
            "F07959": "Samsung",
            "842519": "Samsung",
            "8C7967": "Espressif (IoT)",
            "BCDD7F": "Espressif (IoT)",
            "18FE34": "Espressif (IoT)",
            "00089B": "HP",
            "D4C9EF": "HP",
            "3C5282": "HP"
        }
        return VENDORS.get(prefix, None) # Or return generic from API if we want to call one

    async def _get_http_info(self, ip, port):
        """
        Attempts to fetch title via HTTP/HTTPS.
        Handles 401 Auth and Legacy SSL.
        """
        import urllib.request
        from urllib.error import HTTPError, URLError
        from html.parser import HTMLParser
        import ssl

        # Basic HTML Parser for Title
        class TitleParser(HTMLParser):
            def __init__(self):
                super().__init__()
                self.title = None
                self.in_title = False
            def handle_starttag(self, tag, attrs):
                if tag.lower() == 'title':
                    self.in_title = True
            def handle_endtag(self, tag):
                if tag.lower() == 'title':
                    self.in_title = False
            def handle_data(self, data):
                if self.in_title and not self.title:
                    self.title = data.strip()
        
        try:
            protocol = "https" if port == 443 or port == 8443 else "http"
            url = f"{protocol}://{ip}:{port}/"
            
            def fetch_title():
                try:
                    # Create unverified context for self-signed certs + Legacy SSL
                    ctx = ssl.create_default_context()
                    ctx.check_hostname = False
                    ctx.verify_mode = ssl.CERT_NONE
                    
                    # Enable legacy renegotiation and protocols if possible
                    # (Python 3.10+ disables TLS 1.0/1.1 by default in some distros, we try to re-enable)
                    try:
                        ctx.options &= ~ssl.OP_NO_TLSv1
                        ctx.options &= ~ssl.OP_NO_TLSv1_1
                    except:
                        pass
                        
                    try:
                        # Lower security level to allow weak ciphers (often needed for old embedded devices)
                        ctx.set_ciphers('DEFAULT:@SECLEVEL=0')
                    except:
                        try:
                            ctx.set_ciphers('DEFAULT')
                        except:
                            pass

                    # Timeout is critical
                    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req, context=ctx, timeout=5) as response:
                        html = response.read(4096).decode('utf-8', errors='ignore') # Read first 4KB
                        server = response.getheader('Server')
                        
                        parser = TitleParser()
                        parser.feed(html)
                        return {"title": parser.title, "server": server}
                
                except HTTPError as e:
                    # Handle 401 Unauthorized - Capture Realm or Server
                    # This often contains the device name (e.g. Realm="Hikvision")
                    server = e.headers.get('Server')
                    auth_header = e.headers.get('Www-Authenticate', '')
                    title = None
                    
                    # Extract Realm
                    if 'realm="' in auth_header:
                        try:
                             # Simple parse: realm="Value"
                             start = auth_header.find('realm="') + 7
                             end = auth_header.find('"', start)
                             if start > 6 and end > start:
                                 title = auth_header[start:end]
                        except:
                            pass
                    
                    if not title and 'realm=' in auth_header:
                         # Try unquoted
                         try:
                             start = auth_header.find('realm=') + 6
                             end = auth_header.find(' ', start)
                             if end == -1: end = len(auth_header)
                             title = auth_header[start:end].replace(',', '')
                         except:
                             pass
                             
                    return {"title": title, "server": server, "status": e.code}

                except Exception:
                    return None
            
            return await asyncio.get_event_loop().run_in_executor(None, fetch_title)

        except Exception:
            return None
