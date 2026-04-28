"""
FULL DIAGNOSTIC - All Engineers vs Webfleet
This will check ALL your engineers and show you the match rate
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from salesforce_service import SalesforceService
from webfleet_api import WebfleetAPI
from requests.auth import HTTPBasicAuth
import requests


def main():
    print("\n" + "="*80)
    print("🚗 WEBFLEET DIAGNOSTIC - Full Analysis")
    print("="*80 + "\n")
    
    # Step 1: Get Salesforce Data
    print("📊 STEP 1: Fetching ALL engineers from Salesforce...")
    try:
        sf = SalesforceService()
        
        query = """
            SELECT Id, Name, Email__c
            FROM ServiceResource
            WHERE IsActive = true
            ORDER BY Name ASC
        """
        
        result = sf.sf.query(query)
        all_engineers = result.get('records', [])
        
        print(f"   ✅ Found {len(all_engineers)} active engineers in Salesforce")
        
        # Process engineers and handle None emails
        engineers_with_email = []
        engineers_without_email = []
        
        for eng in all_engineers:
            email_raw = eng.get('Email__c')
            email = email_raw.strip().lower() if email_raw else None
            
            name_raw = eng.get('Name')
            name = name_raw.strip() if name_raw else 'Unknown'
            
            eng_data = {
                'id': eng.get('Id'),
                'name': name,
                'email': email
            }
            
            if email:
                engineers_with_email.append(eng_data)
            else:
                engineers_without_email.append(eng_data)
        
        print(f"   ✅ Engineers WITH email: {len(engineers_with_email)}")
        print(f"   ⚠️  Engineers WITHOUT email: {len(engineers_without_email)}")
        
    except Exception as e:
        print(f"   ❌ Failed to fetch Salesforce data: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Step 2: Get Webfleet Data
    print(f"\n📊 STEP 2: Fetching ALL drivers from Webfleet...")
    try:
        webfleet = WebfleetAPI()
        
        driver_params = {
            'account': webfleet.account,
            'apikey': webfleet.api_key,
            'lang': 'en',
            'action': 'showDriverReportExtern',
            'outputformat': 'json',
            'useUTF8': 'true',
            'useISO8601': 'true'
        }
        
        driver_response = requests.get(
            webfleet.base_url,
            params=driver_params,
            auth=HTTPBasicAuth(webfleet.username, webfleet.password),
            timeout=30
        )
        
        if driver_response.status_code != 200:
            print(f"   ❌ Webfleet API error: Status {driver_response.status_code}")
            return
        
        driver_data = driver_response.json()
        
        if not driver_data or not isinstance(driver_data, list):
            print(f"   ⚠️ No valid driver data returned from Webfleet")
            return
        
        # Process Webfleet drivers
        webfleet_drivers = []
        for driver in driver_data:
            if isinstance(driver, dict):
                email_raw = driver.get('email', '').strip()
                if email_raw:
                    webfleet_drivers.append({
                        'name': driver.get('name1', '').strip(),
                        'email': email_raw.lower(),
                        'driver_id': driver.get('driverid', '')
                    })
        
        print(f"   ✅ Found {len(webfleet_drivers)} drivers in Webfleet")
        print(f"   ✅ Drivers WITH email: {len(webfleet_drivers)}")
        
    except Exception as e:
        print(f"   ❌ Failed to fetch Webfleet data: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Step 3: Compare and Match
    print(f"\n📊 STEP 3: Comparing emails between systems...")
    
    # Create lookup maps
    webfleet_email_map = {d['email']: d for d in webfleet_drivers}
    sf_email_map = {e['email']: e for e in engineers_with_email}
    
    # Find matches and mismatches
    matched = []
    sf_not_in_webfleet = []
    webfleet_not_in_sf = []
    
    for email, eng in sf_email_map.items():
        if email in webfleet_email_map:
            matched.append({
                'email': email,
                'sf_name': eng['name'],
                'wf_name': webfleet_email_map[email]['name']
            })
        else:
            sf_not_in_webfleet.append({
                'email': email,
                'name': eng['name']
            })
    
    for email, driver in webfleet_email_map.items():
        if email not in sf_email_map:
            webfleet_not_in_sf.append({
                'email': email,
                'name': driver['name']
            })
    
    # Print Results
    print("\n" + "="*80)
    print("📊 RESULTS")
    print("="*80)
    
    print(f"\n✅ MATCHED EMAILS: {len(matched)}")
    print(f"   These engineers WILL have driving scores in your app")
    if matched:
        print(f"\n   Showing first 10 matches:")
        for match in matched[:10]:
            print(f"   ✓ {match['sf_name']}")
            print(f"      Email: {match['email']}")
        if len(matched) > 10:
            print(f"   ... and {len(matched) - 10} more matches")
    
    print(f"\n⚠️  IN SALESFORCE BUT NOT IN WEBFLEET: {len(sf_not_in_webfleet)}")
    print(f"   These engineers will show score = 0")
    if sf_not_in_webfleet:
        print(f"\n   Showing first 20:")
        for eng in sf_not_in_webfleet[:20]:
            print(f"   ✗ {eng['name']} ({eng['email']})")
        if len(sf_not_in_webfleet) > 20:
            print(f"   ... and {len(sf_not_in_webfleet) - 20} more")
    
    print(f"\n⚠️  IN WEBFLEET BUT NOT IN SALESFORCE: {len(webfleet_not_in_sf)}")
    print(f"   These might be ex-employees or contractors")
    if webfleet_not_in_sf:
        print(f"\n   Showing first 10:")
        for driver in webfleet_not_in_sf[:10]:
            print(f"   ✗ {driver['name']} ({driver['email']})")
        if len(webfleet_not_in_sf) > 10:
            print(f"   ... and {len(webfleet_not_in_sf) - 10} more")
    
    print(f"\n❌ NO EMAIL IN SALESFORCE: {len(engineers_without_email)}")
    print(f"   These engineers CANNOT get driving scores")
    if engineers_without_email:
        print(f"\n   Showing first 20:")
        for eng in engineers_without_email[:20]:
            print(f"   ✗ {eng['name']} (ID: {eng['id']})")
        if len(engineers_without_email) > 20:
            print(f"   ... and {len(engineers_without_email) - 20} more")
    
    # Calculate Success Rate
    total_engineers = len(all_engineers)
    engineers_with_scores = len(matched)
    success_rate = (engineers_with_scores / total_engineers * 100) if total_engineers > 0 else 0
    
    print("\n" + "="*80)
    print("📈 SUCCESS RATE")
    print("="*80)
    print(f"\n   Total engineers in Salesforce: {total_engineers}")
    print(f"   ✅ Will have driving scores: {engineers_with_scores}")
    print(f"   ❌ Will NOT have scores: {total_engineers - engineers_with_scores}")
    print(f"   📊 Success Rate: {success_rate:.1f}%")
    
    if success_rate < 50:
        print(f"\n   ⚠️  LOW SUCCESS RATE! Needs attention.")
    elif success_rate < 80:
        print(f"\n   ⚠️  Moderate success rate. Can be improved.")
    else:
        print(f"\n   ✅ Good success rate!")
    
    print("\n" + "="*80)
    print("💡 WHAT TO DO NEXT")
    print("="*80)
    
    if engineers_without_email:
        print(f"\n1. Add emails in Salesforce for {len(engineers_without_email)} engineers without emails")
    
    if sf_not_in_webfleet:
        print(f"\n2. Set up {len(sf_not_in_webfleet)} engineers in Webfleet system")
        print(f"   OR verify their email addresses match between systems")
    
    print(f"\n3. Start your API server and test: http://localhost:8000/api/webfleet/engineers")
    
    print(f"\n4. Your React app will show driving scores for {engineers_with_scores} engineers!")
    
    print("\n" + "="*80 + "\n")


if __name__ == "__main__":
    main()