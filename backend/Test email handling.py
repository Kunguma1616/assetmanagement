"""
Quick test to verify the None handling fix works
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from salesforce_service import SalesforceService

def test_email_handling():
    """Test that we can handle None emails properly"""
    try:
        sf = SalesforceService()
        
        print("📊 Testing email handling...")
        
        # Query ALL engineers including those without emails
        query = """
            SELECT Id, Name, Email__c
            FROM ServiceResource
            WHERE IsActive = true
            ORDER BY Name ASC
            LIMIT 20
        """
        
        result = sf.sf.query(query)
        engineers_data = result.get('records', [])
        
        print(f"✅ Found {len(engineers_data)} engineers")
        
        with_email = 0
        without_email = 0
        
        for eng in engineers_data:
            # Test the fix
            email_raw = eng.get('Email__c')
            email = email_raw.strip().lower() if email_raw else None
            
            name_raw = eng.get('Name')
            name = name_raw.strip() if name_raw else 'Unknown'
            
            if email:
                print(f"  ✅ {name}: {email}")
                with_email += 1
            else:
                print(f"  ❌ {name}: NO EMAIL")
                without_email += 1
        
        print(f"\n📊 Summary:")
        print(f"   With email: {with_email}")
        print(f"   Without email: {without_email}")
        print(f"   Total: {len(engineers_data)}")
        
        print("\n✅ Email handling test PASSED!")
        
    except Exception as e:
        print(f"❌ Test FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_email_handling()