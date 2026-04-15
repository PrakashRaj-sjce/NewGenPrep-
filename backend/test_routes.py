"""Quick test: verify all routes load correctly."""
import sys
sys.path.insert(0, ".")

try:
    from interview_api import app
    print("APP LOADED SUCCESSFULLY")
    print("")
    print("REGISTERED ROUTES:")
    count = 0
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            methods = list(route.methods)
            print(f"  {methods} {route.path}")
            count += 1
    print(f"\nTotal: {count} endpoints")
    print("\nAll modules imported OK!")
except Exception as e:
    print(f"IMPORT ERROR: {e}")
    import traceback
    traceback.print_exc()
