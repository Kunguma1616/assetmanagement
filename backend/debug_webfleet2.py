#!/usr/bin/env python
import sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()

print("Debugging Webfleet response structure...")
try:
    from webfleet_api import WebfleetService
    wf = WebfleetService()
    
    # Get the raw data
    data = wf._make_request('showDriverReportExtern')
    
    print(f"Response type: {type(data)}")
    
    if isinstance(data, dict):
        print(f"Dict keys: {data.keys()}")
        if 'data' in data:
            print(f"'data' field exists with {len(data.get('data', []))} items")
            print(f"data type: {type(data['data'])}")
            drivers = data.get('data', [])
            if drivers:
                print(f"\nFirst driver from data[0]:")
                for k, v in drivers[0].items():
                    print(f"  {k}: {v}")
        else:
            print("No 'data' key in response!")
            print(f"All keys: {list(data.keys())}")
            if isinstance(list(data.values())[0], list):
                first_list = list(data.values())[0]
                print(f"First value is a list with {len(first_list)} items")
                if first_list:
                    print(f"First item: {first_list[0]}")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
