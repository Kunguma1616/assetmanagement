#!/usr/bin/env python3
"""
Quick test to verify API endpoints work
"""
import requests
import json
import time
import sys

BASE_URL = "http://localhost:8000"

def test_vehicle_lookup():
    """Test vehicle lookup endpoint"""
    print("\n🧪 Testing Vehicle Lookup Endpoint")
    print("=" * 50)
    
    # Test with a common van number
    van_number = "VEH-00001"  # Start with a test van
    
    url = f"{BASE_URL}/api/vehicles/lookup/{van_number}"
    print(f"📍 URL: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        print(f"📊 Status Code: {response.status_code}")
        print(f"📋 Content-Type: {response.headers.get('content-type')}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS! Got vehicle data:")
            print(json.dumps(data, indent=2))
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to backend")
        print(f"   Make sure backend is running on {BASE_URL}")
        return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_vehicles_list():
    """Test vehicles list endpoint"""
    print("\n🧪 Testing Vehicles List Endpoint")
    print("=" * 50)
    
    url = f"{BASE_URL}/api/vehicles/list"
    print(f"📍 URL: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS! Got {len(data)} vehicles")
            if data:
                print(f"First vehicle: {json.dumps(data[0], indent=2)}")
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def main():
    print("\n" + "=" * 50)
    print("🚀 FLEET HEALTH MONITOR API TEST")
    print("=" * 50)
    print(f"Testing API at: {BASE_URL}")
    
    # Give user time to start backend if needed
    print("\nMake sure the backend is running:")
    print("  cd backend")
    print("  python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload")
    print("\nConnecting in 3 seconds...")
    time.sleep(3)
    
    # Run tests
    results = []
    results.append(("Vehicles List", test_vehicles_list()))
    results.append(("Vehicle Lookup", test_vehicle_lookup()))
    
    # Summary
    print("\n" + "=" * 50)
    print("📈 TEST SUMMARY")
    print("=" * 50)
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")
    
    all_passed = all(p for _, p in results)
    print("\n" + ("🎉 All tests passed!" if all_passed else "⚠️  Some tests failed"))
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
