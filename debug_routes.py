from backend.main import app
import sys

print("Registered Routes:")
for route in app.routes:
    if hasattr(route, "path"):
        methods = ", ".join(route.methods) if hasattr(route, "methods") else "ANY"
        print(f"{methods} {route.path}")
