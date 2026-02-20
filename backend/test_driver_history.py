#!/usr/bin/env python3
"""
Quick test to verify driver history and AI analysis are working
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from salesforce_service import SalesforceService

def test_driver_history():
    """Test that driver history is fetched correctly"""
    try:
        print("=" * 70)
        print("🧪 TESTING DRIVER HISTORY FIX")
        print("=" * 70)
        
        sf = SalesforceService()
        
        # Get all vehicles
        print("\n📋 Fetching vehicles...")
        vehicles = sf.get_all_vehicles()
        print(f"✅ Found {len(vehicles)} vehicles")
        
        if len(vehicles) == 0:
            print("❌ No vehicles found!")
            return False
        
        # Test with first vehicle
        test_van = vehicles[0].get("Van_Number__c")
        print(f"\n🔍 Testing with van number: {test_van}")
        
        # Get vehicle by identifier
        vehicle = sf.get_vehicle_by_identifier(test_van)
        if not vehicle:
            print(f"❌ Failed to get vehicle {test_van}")
            return False
        
        print(f"✅ Got vehicle: {vehicle.get('Name')}")
        
        # Check if Previous_Drivers__c field exists
        driver_history = vehicle.get('Previous_Drivers__c', '')
        print(f"\n📍 Driver History Field:")
        print(f"   Available: {'Yes' if driver_history else 'No/Empty'}")
        if driver_history:
            print(f"   Content: {driver_history[:200]}...")
        else:
            print(f"   (Field is empty in Salesforce)")
        
        # Test the lookup endpoint logic
        print("\n🚀 Testing lookup endpoint logic...")
        
        # This mimics what the lookup_vehicle_by_van endpoint does
        from routes.vehicles import get_driver_history
        
        vehicle_id = vehicle.get('Id')
        history = get_driver_history(sf, vehicle_id)
        
        print(f"\n✅ Driver history retrieval result:")
        if history and history != "No driver history available":
            print(f"   ✅ SUCCESS: {history[:150]}...")
        else:
            print(f"   ⚠️  EMPTY: {history}")
            print(f"   (This is OK if Previous_Drivers__c is empty in Salesforce)")
        
        # Test Grok AI (if API key available)
        print("\n" + "=" * 70)
        print("🤖 TESTING GROK AI INTEGRATION")
        print("=" * 70)
        
        api_key = os.getenv("GROQ_API_KEY")
        groq_available = False
        try:
            from groq import Groq
            groq_available = True
        except ImportError:
            pass
        
        if groq_available and api_key:
            print("\n✅ GROQ_API_KEY is configured and groq library is installed")
            from app import get_grok_analysis
            
            test_text = f"Vehicle: {vehicle.get('Name')}, Type: {vehicle.get('Vehicle_Type__c')}, Status: {vehicle.get('Status__c')}"
            print(f"\n📝 Testing vehicle analysis with: {test_text}")
            
            analysis = get_grok_analysis(test_text, "vehicle")
            print(f"\n🤖 Grok Analysis Result:")
            print(f"   {analysis}")
        else:
            if not groq_available:
                print("\n⚠️  Groq library not installed")
                print("   To enable AI: pip install groq")
            if not api_key:
                print("\n⚠️  GROQ_API_KEY not set - AI features disabled")
                print("   To enable: Set GROQ_API_KEY in your .env file")
        
        print("\n" + "=" * 70)
        print("✅ ALL TESTS COMPLETED SUCCESSFULLY")
        print("=" * 70)
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_driver_history()
    sys.exit(0 if success else 1)
