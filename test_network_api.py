import urllib.request
import sys

url = "http://localhost:8001/api/v1/network/devices"

try:
    print(f"Testing GET {url}...")
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        status = response.getcode()
        print(f"Status Code: {status}")
        
        data = response.read()
        print(f"Data received ({len(data)} bytes):")
        print(data.decode('utf-8')[:500])  # Print first 500 chars

except Exception as e:
    print(f"Error: {e}")
