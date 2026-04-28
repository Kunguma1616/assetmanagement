#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from salesforce_service import SalesforceService
from datetime import datetime

try:
    print("Testing asset create logic...")
    sf = SalesforceService()
    
    # Test data
    van_number = "330"
    
    # Check if vehicle exists
    existing_vehicle_query = f"""
        SELECT Id FROM Vehicle__c 
        WHERE Van_Number__c = '{van_number}'
        LIMIT 1
    """
    
    print(f"Querying for van {van_number}...")
    result = sf.sf.query_all(existing_vehicle_query)
    existing_records = result.get('records', [])
    
    if existing_records:
        print(f"✅ Found existing vehicle: {existing_records[0]['Id']}")
        
        # Prepare update data
        vehicle_data = {
            "Van_Number__c": "330",
            "Reg_No__c": "BT70XMO",
            "Tracking_Number__c": "TEST123",
            "Name": "VEH-00330",
            "Vehicle_Type__c": "Van"
        }
        
        print(f"Attempting update with: {vehicle_data}")
        sf.sf.Vehicle__c.update(existing_records[0]['Id'], vehicle_data)
        print("✅ Update successful!")
    else:
        print("❌ Vehicle not found")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
