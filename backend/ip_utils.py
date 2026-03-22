"""
ip_utils.py
-----------
IP-to-Department routing logic based on subnet CIDR definitions.

Routing table:
  10.10.9.0/24   → Marketing
  10.10.8.0/24   → Administration
  10.10.7.0/24   → Audio Library
  10.10.10.0/24  → Finance
  10.10.3.0/24   → Radio Services
  10.10.4.0/24   → Television Broadcasting
  10.10.5.0/24   → Studios
  10.10.11.0/24  → CAR
  10.10.6.0/24   → ICT
  172.16.0.0/16  → Vlan1
"""

import ipaddress
from typing import Optional

# ── Routing Table ──────────────────────────────────────────────────────────────

SUBNET_DEPARTMENT_MAP: list[tuple[ipaddress.IPv4Network, str]] = [
    (ipaddress.IPv4Network("10.10.9.0/24"),   "Marketing"),
    (ipaddress.IPv4Network("10.10.8.0/24"),   "Administration"),
    (ipaddress.IPv4Network("10.10.7.0/24"),   "Audio Library"),
    (ipaddress.IPv4Network("10.10.10.0/24"),  "Finance"),
    (ipaddress.IPv4Network("10.10.3.0/24"),   "Radio Services"),
    (ipaddress.IPv4Network("10.10.4.0/24"),   "Television Broadcasting"),
    (ipaddress.IPv4Network("10.10.5.0/24"),   "Studios"),
    (ipaddress.IPv4Network("10.10.11.0/24"),  "CAR"),
    (ipaddress.IPv4Network("10.10.6.0/24"),   "ICT"),
    (ipaddress.IPv4Network("172.16.0.0/16"),  "Vlan1"),
]

FALLBACK_DEPARTMENT = "Unassigned / Guest Network"


# ── Public API ─────────────────────────────────────────────────────────────────

def resolve_department(ip_address: Optional[str]) -> str:
    """
    Return the department name for the given IPv4 address string.

    Performs a CIDR range check against the routing table.
    Returns FALLBACK_DEPARTMENT if the IP is absent, malformed,
    or does not fall within any defined subnet.
    """
    if not ip_address:
        return FALLBACK_DEPARTMENT

    try:
        addr = ipaddress.IPv4Address(ip_address)
    except ValueError:
        return FALLBACK_DEPARTMENT

    for network, department in SUBNET_DEPARTMENT_MAP:
        if addr in network:
            return department

    return FALLBACK_DEPARTMENT
