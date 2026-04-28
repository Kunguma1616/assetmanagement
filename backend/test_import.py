#!/usr/bin/env python
import sys
import os

# Add backend to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

print("Testing imports...")
try:
    from app import app
    print("✅ App imported successfully")
    print(f"✅ Routes registered: {[route.path for route in app.routes]}")
except Exception as e:
    print(f"❌ Error importing app: {e}")
    import traceback
    traceback.print_exc()
