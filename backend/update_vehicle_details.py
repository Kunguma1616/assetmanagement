"""
Script to update vehicle details in Salesforce with all the missing fields
This adds Trade Group, Make & Model, Transmission, MOT dates, Road Tax dates, etc.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from salesforce_service import SalesforceService
from datetime import datetime, timedelta

def update_vehicle_details():
    """Add sample vehicle details for demonstration"""
    sf = SalesforceService()
    
    print("\n" + "="*80)
    print("🚗 UPDATING VEHICLE DETAILS IN SALESFORCE")
    print("="*80 + "\n")
    
    try:
        # First, get all vehicles
        vehicle_query = """
            SELECT 
                Id, 
                Name,
                Van_Number__c
            FROM Vehicle__c
            LIMIT 100
        """
        
        result = sf.sf.query_all(vehicle_query)
        vehicles = result.get('records', [])
        
        if not vehicles:
            print("⚠️ No vehicles found in Salesforce")
            return
        
        print(f"✅ Found {len(vehicles)} vehicles to update\n")
        
        # Sample data for vehicles - ONLY using writable fields
        # Note: Next_MOT_Date__c, Next_Road_Tax__c, Next_Service_Date__c are formula fields (read-only)
        # Use the editable versions instead: Next_MOT_Date_Editable__c, etc.
        sample_data = [
            {
                'Trade_Group__c': 'Commercial Vehicles',
                'Make_Model__c': 'Ford Transit Custom',
                'Transmission__c': 'Manual',
                'Last_MOT_Date__c': (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'),
                'Next_MOT_Date_Editable__c': (datetime.now() + timedelta(days=335)).strftime('%Y-%m-%d'),
                'Last_Road_Tax__c': (datetime.now() - timedelta(days=15)).strftime('%Y-%m-%d'),
                'Next_Road_Tax_Editable__c': (datetime.now() + timedelta(days=350)).strftime('%Y-%m-%d'),
                'Last_Service_Date__c': (datetime.now() - timedelta(days=45)).strftime('%Y-%m-%d'),
                'Next_Service_Date_Editable__c': (datetime.now() + timedelta(days=275)).strftime('%Y-%m-%d'),
                'Vehicle_Ownership__c': 'Owned'
            },
            {
                'Trade_Group__c': 'Electrical',
                'Make_Model__c': 'Ford Transit',
                'Transmission__c': 'Automatic',
                'Last_MOT_Date__c': (datetime.now() - timedelta(days=60)).strftime('%Y-%m-%d'),
                'Next_MOT_Date_Editable__c': (datetime.now() + timedelta(days=305)).strftime('%Y-%m-%d'),
                'Last_Road_Tax__c': (datetime.now() - timedelta(days=45)).strftime('%Y-%m-%d'),
                'Next_Road_Tax_Editable__c': (datetime.now() + timedelta(days=320)).strftime('%Y-%m-%d'),
                'Last_Service_Date__c': (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d'),
                'Next_Service_Date_Editable__c': (datetime.now() + timedelta(days=230)).strftime('%Y-%m-%d'),
                'Vehicle_Ownership__c': 'Leased'
            },
            {
                'Trade_Group__c': 'HVAC',
                'Make_Model__c': 'Mercedes Sprinter',
                'Transmission__c': 'Automatic',
                'Last_MOT_Date__c': (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d'),
                'Next_MOT_Date_Editable__c': (datetime.now() + timedelta(days=275)).strftime('%Y-%m-%d'),
                'Last_Road_Tax__c': (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'),
                'Next_Road_Tax_Editable__c': (datetime.now() + timedelta(days=335)).strftime('%Y-%m-%d'),
                'Last_Service_Date__c': (datetime.now() - timedelta(days=60)).strftime('%Y-%m-%d'),
                'Next_Service_Date_Editable__c': (datetime.now() + timedelta(days=260)).strftime('%Y-%m-%d'),
                'Vehicle_Ownership__c': 'Owned'
            },
            {
                'Trade_Group__c': 'Plumbing',
                'Make_Model__c': 'Citroen Relay',
                'Transmission__c': 'Manual',
                'Last_MOT_Date__c': (datetime.now() - timedelta(days=120)).strftime('%Y-%m-%d'),
                'Next_MOT_Date_Editable__c': (datetime.now() + timedelta(days=245)).strftime('%Y-%m-%d'),
                'Last_Road_Tax__c': (datetime.now() - timedelta(days=100)).strftime('%Y-%m-%d'),
                'Next_Road_Tax_Editable__c': (datetime.now() + timedelta(days=265)).strftime('%Y-%m-%d'),
                'Last_Service_Date__c': (datetime.now() - timedelta(days=150)).strftime('%Y-%m-%d'),
                'Next_Service_Date_Editable__c': (datetime.now() + timedelta(days=160)).strftime('%Y-%m-%d'),
                'Vehicle_Ownership__c': 'Leased'
            }
        ]
        
        # Update each vehicle
        updated_count = 0
        for idx, vehicle in enumerate(vehicles):
            vehicle_id = vehicle.get('Id')
            van_number = vehicle.get('Van_Number__c', f'VEH-{idx:05d}')
            
            # Rotate through sample data
            sample = sample_data[idx % len(sample_data)]
            
            try:
                # Update the vehicle record
                sf.sf.Vehicle__c.update(vehicle_id, sample)
                updated_count += 1
                
                print(f"✅ Updated {van_number}:")
                print(f"   Trade Group: {sample['Trade_Group__c']}")
                print(f"   Make & Model: {sample['Make_Model__c']}")
                print(f"   Transmission: {sample['Transmission__c']}")
                print(f"   Next MOT: {sample['Next_MOT_Date__c']}")
                print(f"   Vehicle Ownership: {sample['Vehicle_Ownership__c']}\n")
                
            except Exception as e:
                print(f"❌ Error updating {van_number}: {e}\n")
        
        print("="*80)
        print(f"✅ COMPLETE! Updated {updated_count}/{len(vehicles)} vehicles")
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    update_vehicle_details()
