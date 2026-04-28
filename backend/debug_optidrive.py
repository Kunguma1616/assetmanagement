#!/usr/bin/env python
import sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()

print("Debugging OptiDrive response...")
try:
    from webfleet_api import WebfleetService
    wf = WebfleetService()
    
    # Get the raw OptiDrive data
    data = wf._make_request('showOptiDriveIndicator')
    
    print(f"Response type: {type(data)}")
    print(f"Response: {data}")
    
    if isinstance(data, list):
        print(f"It's a list with {len(data)} items")
        if len(data) > 0:
            print(f"First item: {data[0]}")
    elif isinstance(data, dict):
        print(f"It's a dict with keys: {data.keys()}")
        if 'data' in data:
            print(f"data field has {len(data['data'])} items")
            if data['data']:
                print(f"First item in data: {data['data'][0]}")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
