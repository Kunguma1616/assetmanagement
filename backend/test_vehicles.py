#!/usr/bin/env python3
"""Test script to verify vehicles exist in Salesforce"""

from salesforce_service import SalesforceService

try:
    print("🔗 Connecting to Salesforce...")
    sf = SalesforceService()
    
    print("\n📋 Querying all vehicles...")
    vehicles = sf.get_all_vehicles()
    
    print(f"\n✅ Total vehicles in Salesforce: {len(vehicles)}")
    
    if len(vehicles) > 0:
        print('\n📍 First 10 vehicles:')
        for i, v in enumerate(vehicles[:10], 1):
            van = v.get("Van_Number__c", "N/A")
            name = v.get("Name", "N/A")
            reg = v.get("Reg_No__c", "N/A")
            status = v.get("Status__c", "N/A")
            print(f"  {i}. Van: {van:15} | Name: {name:20} | Reg: {reg:10} | Status: {status}")
        
        # Test lookup with first van number
        if vehicles[0].get("Van_Number__c"):
            test_van = vehicles[0].get("Van_Number__c")
            print(f"\n🔍 Testing lookup with van number: {test_van}")
            result = sf.get_vehicle_by_identifier(test_van)
            if result:
                print(f"✅ Lookup successful: {result.get('Name')}")
            else:
                print(f"❌ Lookup failed for {test_van}")
    else:
        print('❌ No vehicles found in Salesforce')
        
except Exception as e:
    print(f'❌ Error: {e}')
    import traceback
    traceback.print_exc()
