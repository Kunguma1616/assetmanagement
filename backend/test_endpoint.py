#!/usr/bin/env python
import sys
sys.path.insert(0, '.')

print("Testing the endpoint...")
try:
    from routes.dashboard import get_drivers_from_excel
    result = get_drivers_from_excel()
    print(f"✅ Success! Total drivers: {result.get('total')}")
    print(f"Source: {result.get('source')}")
    if result.get('drivers'):
        driver = result['drivers'][0]
        print(f"First driver: {driver['name']} - Score: {driver['score']}")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
