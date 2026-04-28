#!/usr/bin/env python
import sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()

print("Debugging Webfleet driver structure...")
try:
    from webfleet_api import WebfleetService
    wf = WebfleetService()
    
    # Get the raw data
    data = wf._make_request('showDriverReportExtern')
    
    if isinstance(data, list) and len(data) > 0:
        print(f"Response is a LIST with {len(data)} items")
        first_driver = data[0]
    elif isinstance(data, dict) and 'data' in data:
        print(f"Response is a DICT with 'data' key")
        first_driver = data['data'][0] if data['data'] else None
    else:
        print(f"Response format: {type(data)}")
        first_driver = None
    
    if first_driver:
        print(f"\nFirst driver fields:")
        for key, value in first_driver.items():
            print(f"  {key}: {value}")
        
        print(f"\nLooking for email field...")
        email_fields = [k for k in first_driver.keys() if 'email' in k.lower()]
        print(f"Email-related fields: {email_fields}")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
