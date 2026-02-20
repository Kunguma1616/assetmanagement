#!/usr/bin/env python3
"""Debug script to inspect Vehicle_Allocation__c fields"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from salesforce_service import SalesforceService

try:
    sf = SalesforceService()
    
    print("[OK] Querying valid Vehicle_Allocation__c fields...")
    print("=" * 70)
    
    # Query only the fields that exist
    allocation_query = """
        SELECT 
            Id, 
            Name,
            Start_date__c,
            End_date__c,
            Contact_Number__c,
            Reserved_For__c,
            Service_Resource__r.Name,
            Service_Resource__r.ResourceType,
            Service_Resource__c
        FROM Vehicle_Allocation__c
        LIMIT 1
    """
    
    result = sf.sf.query_all(allocation_query)
    records = result.get("records", [])
    
    if records:
        record = records[0]
        print("\n[OK] Sample allocation record:")
        print("-" * 70)
        for key, value in record.items():
            if key != 'attributes':
                if isinstance(value, dict):
                    print(f"  {key}:")
                    for k2, v2 in value.items():
                        if k2 != 'attributes':
                            print(f"    {k2}: {v2}")
                else:
                    print(f"  {key}: {value}")
        
        # Now query ServiceResource with minimal fields
        sr_id = record.get('Service_Resource__c')
        if sr_id:
            print(f"\n\n[OK] Querying ServiceResource (ID: {sr_id})...")
            print("-" * 70)
            
            sr_query = f"""
                SELECT 
                    Id,
                    Name,
                    ResourceType
                FROM ServiceResource
                WHERE Id = '{sr_id}'
            """
            
            sr_result = sf.sf.query_all(sr_query)
            sr_records = sr_result.get("records", [])
            
            if sr_records:
                sr = sr_records[0]
                print("[OK] ServiceResource record:")
                for key, value in sr.items():
                    if key != 'attributes':
                        print(f"  {key}: {value}")
    
    print("\n\n[*] Now checking what fields exist on Vehicle_Allocation__c...")
    print("-" * 70)
    
    # Use describe to list all available fields
    try:
        describe = sf.sf.Vehicle_Allocation__c.metadata()
        print("[OK] All available fields on Vehicle_Allocation__c:")
        field_names = [f['name'] for f in describe.get('fields', [])]
        
        # Group by type
        custom_fields = [f for f in field_names if f.endswith('__c')]
        standard_fields = [f for f in field_names if not f.endswith('__c')]
        
        print("\nStandard fields:")
        for f in sorted(standard_fields)[:20]:
            print(f"  - {f}")
        
        print("\nCustom fields (first 20):")
        for f in sorted(custom_fields)[:20]:
            print(f"  - {f}")
            
    except Exception as e:
        print(f"[WARNING] Could not get field list: {e}")
    
    print("\n[OK] Debug complete!")
    
except Exception as e:
    print(f"[ERROR] {e}")
    import traceback
    traceback.print_exc()
