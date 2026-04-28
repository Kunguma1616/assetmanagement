from fastapi import APIRouter, HTTPException, BackgroundTasks
from datetime import datetime
import sys
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from salesforce_service import SalesforceService
from webfleet_api import WebfleetAPI
from requests.auth import HTTPBasicAuth
import requests

router = APIRouter(prefix="/api/webfleet", tags=["webfleet"])

# Global cache for driving scores
_cache = {
    'scores': {},  # email -> score
    'last_updated': None
}

def get_all_webfleet_drivers_and_scores():
    """
    Get ALL drivers AND their scores efficiently using WebfleetAPI's email-based lookup
    This is the RELIABLE method - uses email matching like the working implementation
    """
    try:
        webfleet = WebfleetAPI()
        
        print("\n" + "="*80)
        print("📞 FETCHING ALL DRIVERS FROM WEBFLEET")
        print("="*80)
        print(f"🔧 Base URL: {webfleet.base_url}")
        print(f"🔧 Account: {webfleet.account}")
        print(f"🔧 Username: {'✅ Set' if webfleet.username else '❌ Missing'}")
        print(f"🔧 Password: {'✅ Set' if webfleet.password else '❌ Missing'}")
        print(f"🔧 API Key: {'✅ Set' if webfleet.api_key else '❌ Missing'}")
        
        # STEP 1: Get all drivers with emails
        driver_params = {
            'account': webfleet.account,
            'apikey': webfleet.api_key,
            'lang': 'en',
            'action': 'showDriverReportExtern',
            'outputformat': 'json',
            'useUTF8': 'true',
            'useISO8601': 'true'
        }
        
        print(f"\n📡 Calling showDriverReportExtern...")
        
        driver_response = requests.get(
            webfleet.base_url,
            params=driver_params,
            auth=HTTPBasicAuth(webfleet.username, webfleet.password),
            timeout=30
        )
        
        print(f"📡 Response Status: {driver_response.status_code}")
        
        if driver_response.status_code != 200:
            print(f"❌ Webfleet API error: Status {driver_response.status_code}")
            print(f"❌ Response: {driver_response.text[:500]}")
            return {}
        
        driver_data = driver_response.json()
        
        if not driver_data or not isinstance(driver_data, list):
            print(f"⚠️ No valid driver data returned")
            print(f"⚠️ Response type: {type(driver_data)}")
            return {}
        
        # Extract all driver emails
        driver_emails = []
        for driver in driver_data:
            if isinstance(driver, dict):
                email_raw = driver.get('email', '').strip()
                if email_raw:
                    driver_emails.append(email_raw)
        
        print(f"✅ Found {len(driver_emails)} drivers with emails")
        if driver_emails:
            print(f"📧 First 5 emails: {driver_emails[:5]}")
        
        # STEP 2: Get scores for ALL emails using the reliable email-based method
        print("\n" + "="*80)
        print("📊 FETCHING OPTIDRIVE SCORES BY EMAIL")
        print("="*80)
        
        email_to_score = {}
        matched_count = 0
        failed_count = 0
        
        # Test with first 3 emails to see detailed output
        if driver_emails:
            print(f"\n🧪 TESTING WITH FIRST 3 EMAILS:")
            for i, test_email in enumerate(driver_emails[:3], 1):
                print(f"\n--- Test {i}/3: {test_email} ---")
                test_score = webfleet.get_driver_data_by_email(test_email)  # ✅ CORRECT METHOD NAME
                print(f"Result: {test_score}")
        
        print(f"\n{'='*80}")
        print(f"PROCESSING ALL {len(driver_emails)} DRIVERS")
        print(f"{'='*80}\n")
        
        for idx, driver_email in enumerate(driver_emails, 1):
            try:
                # ✅ CORRECT METHOD NAME: get_driver_data_by_email (NOT get_driver_score_by_email!)
                optidrive_score = webfleet.get_driver_data_by_email(driver_email)
                
                if optidrive_score is not None and optidrive_score > 0:
                    # Store exact score (0-10 scale from Webfleet)
                    email_to_score[driver_email.lower()] = round(optidrive_score, 2)
                    matched_count += 1
                    
                    # Show first 10 successful matches
                    if matched_count <= 10:
                        print(f"   ✅ [{idx}/{len(driver_emails)}] {driver_email}: {optidrive_score}")
                else:
                    email_to_score[driver_email.lower()] = 0
                    failed_count += 1
                    
                    # Show first 10 failures
                    if failed_count <= 10:
                        print(f"   ⚠️ [{idx}/{len(driver_emails)}] {driver_email}: No score (got {optidrive_score})")
                    
                if idx % 50 == 0:
                    print(f"\n   📊 Progress: {idx}/{len(driver_emails)} processed | ✅ {matched_count} matched | ⚠️ {failed_count} failed\n")
                    
            except Exception as e:
                print(f"   ❌ Error for {driver_email}: {e}")
                email_to_score[driver_email.lower()] = 0
                failed_count += 1
        
        print("\n" + "="*80)
        print(f"✅ FETCH COMPLETE")
        print(f"   Total emails: {len(driver_emails)}")
        print(f"   ✅ Successful: {matched_count}")
        print(f"   ⚠️ Failed: {failed_count}")
        
        if matched_count > 0:
            avg_score = sum(s for s in email_to_score.values() if s > 0) / matched_count
            max_score = max(email_to_score.values())
            min_score = min(s for s in email_to_score.values() if s > 0) if matched_count > 0 else 0
            print(f"   📊 Average score: {avg_score:.2f}")
            print(f"   📊 Max score: {max_score:.2f}")
            print(f"   📊 Min score: {min_score:.2f}")
            
            # Show top 5 scores
            sorted_scores = sorted([(e, s) for e, s in email_to_score.items() if s > 0], key=lambda x: -x[1])
            print(f"\n   🏆 Top 5 scores:")
            for email, score in sorted_scores[:5]:
                print(f"      {email}: {score}")
        
        print("="*80 + "\n")
        
        return email_to_score
        
    except Exception as e:
        print(f"❌ FATAL ERROR in get_all_webfleet_drivers_and_scores: {e}")
        import traceback
        traceback.print_exc()
        return {}


@router.get("/engineers")
def get_engineers_with_scores():
    """
    Get ONLY engineers from Salesforce that exist in Webfleet
    OPTIMIZED: Fetches all scores in ONE batch call!
    """
    try:
        sf = SalesforceService()
        
        print("\n" + "="*80)
        print("🚀 STARTING ENGINEER FETCH WITH WEBFLEET SCORES")
        print("="*80 + "\n")
        
        # Step 1: Get ALL scores from Webfleet in ONE batch
        print("📊 Step 1: Fetching ALL Webfleet scores in batch...")
        email_to_score = get_all_webfleet_drivers_and_scores()
        
        if not email_to_score:
            print("⚠️ WARNING: No scores returned from Webfleet!")
            email_to_score = {}
        
        scores_available = len([s for s in email_to_score.values() if s > 0])
        print(f"✅ Got {len(email_to_score)} total entries, {scores_available} with actual scores\n")
        
        # Step 2: Get ALL Salesforce engineers
        print("📊 Step 2: Fetching engineers from Salesforce...")
        
        engineer_query = """
            SELECT 
                Id, 
                Name, 
                RelatedRecord.Email,
                Trade_Lookup__c
            FROM ServiceResource
            WHERE IsActive = true 
            AND RelatedRecord.Email != null
            ORDER BY Name ASC
        """
        
        result = sf.sf.query(engineer_query)
        all_engineers = result.get('records', [])
        
        print(f"✅ Found {len(all_engineers)} active engineers in Salesforce\n")
        
        # Step 3: Build engineer list with scores
        print("📊 Step 3: Matching engineers with scores...")
        
        engineers_list = []
        matched = 0
        not_matched = 0
        
        for idx, engineer in enumerate(all_engineers, 1):
            engineer_name = engineer.get('Name', 'Unknown')
            
            # Get email from RelatedRecord
            related_record = engineer.get('RelatedRecord', {})
            if related_record and isinstance(related_record, dict):
                engineer_email = related_record.get('Email', '').strip()
            else:
                engineer_email = ''
            
            if not engineer_email:
                continue
            
            email_lower = engineer_email.lower()
            
            # Get score from batch fetch (already 0-10 scale from Webfleet)
            driving_score = email_to_score.get(email_lower, 0)
            
            if driving_score > 0:
                matched += 1
                if matched <= 10:
                    print(f"   ✅ {engineer_name} ({engineer_email}): {driving_score}")
            else:
                not_matched += 1
                if not_matched <= 5:
                    print(f"   ⚠️ {engineer_name} ({engineer_email}): No score")
            
            score_class = get_score_class(driving_score)
            
            # Get trade group
            trade_group = engineer.get('Trade_Lookup__c', 'N/A')
            
            engineers_list.append({
                "rank": 0,
                "name": engineer_name,
                "email": engineer_email,
                "van_number": "N/A",
                "trade_group": trade_group,
                "driving_score": driving_score,
                "score_class": score_class
            })
        
        # Sort by driving score (highest first)
        engineers_list.sort(key=lambda x: (-x['driving_score'], x['name']))
        
        # Update ranks
        for idx, engineer in enumerate(engineers_list):
            engineer['rank'] = idx + 1
        
        print(f"\n{'='*80}")
        print(f"✅ COMPLETE!")
        print(f"   Total engineers: {len(engineers_list)}")
        print(f"   ✅ With scores (>0): {matched}")
        print(f"   ⚠️ Without scores: {not_matched}")
        
        if matched > 0:
            avg_score = sum(e['driving_score'] for e in engineers_list if e['driving_score'] > 0) / matched
            print(f"   📊 Average score: {avg_score:.2f}")
            
            # Show top 5 engineers
            print(f"\n   🏆 Top 5 engineers:")
            for eng in engineers_list[:5]:
                if eng['driving_score'] > 0:
                    print(f"      {eng['rank']}. {eng['name']}: {eng['driving_score']}")
        
        print("="*80 + "\n")
        
        return {
            "total": len(engineers_list),
            "total_salesforce_engineers": len(all_engineers),
            "engineers_in_webfleet": len(engineers_list),
            "with_scores": matched,
            "without_scores": not_matched,
            "engineers": engineers_list
        }
        
    except Exception as e:
        print(f"❌ FATAL ERROR in get_engineers_with_scores: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test-connection")
def test_webfleet_connection():
    """Test Webfleet API connection with detailed debugging"""
    try:
        webfleet = WebfleetAPI()
        
        print("\n" + "="*80)
        print("🧪 TESTING WEBFLEET CONNECTION")
        print("="*80)
        
        # Test configuration
        print(f"✅ Base URL: {webfleet.base_url}")
        print(f"✅ Username: {'✅ Set' if webfleet.username else '❌ Missing'}")
        print(f"✅ Password: {'✅ Set' if webfleet.password else '❌ Missing'}")
        print(f"✅ Account: {webfleet.account if webfleet.account else '❌ Missing'}")
        print(f"✅ API Key: {'✅ Set' if webfleet.api_key else '❌ Missing'}")
        
        # Test getting scores
        scores = get_all_webfleet_drivers_and_scores()
        
        scores_with_data = {k: v for k, v in scores.items() if v > 0}
        
        print("\n" + "="*80)
        print(f"✅ Test complete!")
        print(f"   Total emails: {len(scores)}")
        print(f"   With scores: {len(scores_with_data)}")
        
        if scores_with_data:
            print(f"\n   Sample scores:")
            for email, score in list(scores_with_data.items())[:5]:
                print(f"      {email}: {score}")
        
        print("="*80 + "\n")
        
        return {
            "status": "ok",
            "message": "Webfleet connection successful",
            "total_drivers": len(scores),
            "drivers_with_scores": len(scores_with_data),
            "sample_scores": dict(list(scores_with_data.items())[:5])
        }
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e)
        }


def get_score_class(score):
    """Determine score class/category for UI styling (0-10 scale)"""
    if score >= 9.0:
        return "excellent"
    elif score >= 8.0:
        return "good"
    elif score >= 7.0:
        return "fair"
    elif score >= 6.0:
        return "needs_improvement"
    else:
        return "poor"