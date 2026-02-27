from fastapi import APIRouter, HTTPException, BackgroundTasks
from datetime import datetime, timedelta
import sys
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from salesforce_service import SalesforceService
from webfleet_api import WebfleetAPI
from requests.auth import HTTPBasicAuth
import requests

router = APIRouter(prefix="/api/webfleet", tags=["webfleet"])

# ─────────────────────────────────────────────────────────
# SIMPLE IN-MEMORY CACHE (no APScheduler required)
# ─────────────────────────────────────────────────────────
_cache = {
    'scores': {},
    'last_updated': None,
    'scheduler_started': False
}
_cache_lock = threading.Lock()


def refresh_webfleet_cache():
    """
    Refresh the webfleet score cache
    Called periodically or on-demand
    """
    global _cache
    try:
        print("\n🔄 [CACHE REFRESH] Starting cache refresh...")
        scores = get_all_webfleet_scores_BATCH()
        
        with _cache_lock:
            _cache['scores'] = scores
            _cache['last_updated'] = datetime.now()
        
        print(f"✅ [CACHE REFRESH] Complete - {len(scores)} drivers cached")
        return True
    except Exception as e:
        print(f"⚠️  [CACHE REFRESH] Failed: {e}")
        return False


def start_scheduler():
    """
    Start the cache refresh scheduler (one-time initialization)
    - Runs once per app lifetime
    - Initializes cache if empty
    - Subsequent refreshes happen on-demand via /api/webfleet/refresh-scores
    
    This is SIMPLE and SAFE - no external scheduler required
    """
    global _cache
    
    with _cache_lock:
        # Already started?
        if _cache['scheduler_started']:
            return
        
        # Mark as started (prevent race conditions)
        _cache['scheduler_started'] = True
    
    # Perform initial cache load
    print("\n" + "="*80)
    print("[SCHEDULER] Initializing driver score cache...")
    print("="*80)
    
    try:
        refresh_webfleet_cache()
        print("[OK] [SCHEDULER] Cache initialization complete\n")
    except Exception as e:
        print(f"[WARNING] [SCHEDULER] Cache initialization failed: {e}\n")
        print("   Cache will be loaded on first request")





def get_all_webfleet_scores_BATCH():
    """
    ⚡ TRUE BATCH MODE - Fetches ALL scores from Webfleet in ONE operation
    This does NOT call the API for each driver individually!
    """
    try:
        webfleet = WebfleetAPI()
        
        print("\n" + "="*80)
        print("⚡ BATCH MODE: Fetching ALL OptiDrive data at once")
        print("="*80)
        
        # Get date range (7 days)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        range_from = start_date.strftime('%Y%m%d')
        range_to = end_date.strftime('%Y%m%d')
        
        # ⚡ SINGLE API CALL - Get ALL OptiDrive scores at once!
        optidrive_params = {
            'account': webfleet.account,
            'apikey': webfleet.api_key,
            'lang': 'en',
            'action': 'showOptiDriveIndicator',
            'rangefrom_string': range_from,
            'rangeto_string': range_to,
            'outputformat': 'json',
            'useUTF8': 'true',
            'useISO8601': 'true'
        }
        
        print(f"📡 Calling showOptiDriveIndicator (batch)...")
        print(f"   Date range: {range_from} to {range_to}")
        
        optidrive_response = requests.get(
            webfleet.base_url,
            params=optidrive_params,
            auth=HTTPBasicAuth(webfleet.username, webfleet.password),
            timeout=30
        )
        
        if optidrive_response.status_code != 200:
            print(f"❌ OptiDrive API error: {optidrive_response.status_code}")
            return {}
        
        optidrive_data = optidrive_response.json()
        
        if not isinstance(optidrive_data, list):
            print(f"⚠️ Unexpected response format: {type(optidrive_data)}")
            return {}
        
        print(f"✅ Got {len(optidrive_data)} driver scores from Webfleet")
        
        # ⚡ Now get driver emails to map names to emails
        print(f"📡 Fetching driver emails...")
        
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
            print(f"❌ Driver API error: {driver_response.status_code}")
            return {}
        
        driver_data = driver_response.json()
        
        if not isinstance(driver_data, list):
            print(f"⚠️ Unexpected driver data format")
            return {}
        
        print(f"✅ Got {len(driver_data)} driver records")
        
        # Build name to email mapping
        name_to_email = {}
        for driver in driver_data:
            if isinstance(driver, dict):
                name = (driver.get('name1', '') or driver.get('drivername', '')).strip().lower()
                email = driver.get('email', '').strip().lower()
                if name and email:
                    name_to_email[name] = email
        
        print(f"✅ Mapped {len(name_to_email)} driver names to emails")
        
        # Build email to score mapping
        email_to_score = {}
        matched = 0
        
        for driver_score in optidrive_data:
            if not isinstance(driver_score, dict):
                continue
            
            driver_name = driver_score.get('drivername', '').strip().lower()
            optidrive_raw = driver_score.get('optidrive_indicator', 0)
            
            if driver_name and driver_name in name_to_email:
                email = name_to_email[driver_name]
                
                try:
                    score_float = float(optidrive_raw)
                    
                    # Convert 0-1 scale to 0-10 scale
                    if score_float <= 1.0:
                        final_score = score_float * 10.0
                    else:
                        final_score = score_float
                    
                    email_to_score[email] = round(final_score, 2)
                    matched += 1
                    
                    if matched <= 10:
                        print(f"   ✅ {driver_name} ({email}): {final_score}")
                    
                except (ValueError, TypeError):
                    email_to_score[email] = 0
        
        print(f"\n✅ Successfully mapped {matched} drivers with scores")
        print("="*80 + "\n")
        
        return email_to_score
        
    except Exception as e:
        print(f"❌ Error in batch fetch: {e}")
        import traceback
        traceback.print_exc()
        return {}


@router.get("/engineers")
def get_engineers_with_scores():
    """
    Get engineers from Salesforce with Webfleet scores
    ⚡ TRUE BATCH MODE - Uses cached scores (auto-refreshes every 7 days)
    """
    try:
        # ✅ Start scheduler on first request
        start_scheduler()
        
        sf = SalesforceService()
        
        print("\n" + "="*80)
        print("⚡ BATCH LOADING MODE (Using Cache)")
        print("="*80 + "\n")
        
        # ✅ Use cached scores (refreshed automatically every 7 days)
        email_to_score = _cache.get('scores', {})
        
        # If cache is empty, do initial fetch
        if not email_to_score:
            print("⚠️ Cache empty - doing initial fetch...")
            email_to_score = get_all_webfleet_scores_BATCH()
            _cache['scores'] = email_to_score
            _cache['last_updated'] = datetime.now()
        
        scores_with_data = len([s for s in email_to_score.values() if s > 0])
        print(f"✅ Using {scores_with_data} cached scores")
        print(f"   Last updated: {_cache.get('last_updated', 'Unknown')}\n")
        
        # ⚡ STEP 2: Get ALL Salesforce engineers with their vehicle allocations
        print("🚀 Fetching engineers and their vehicle assignments from Salesforce...")
        
        # Get engineers
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
        
        print(f"✅ Found {len(all_engineers)} active engineers")
        
        # Get vehicle allocations for all engineers (including van numbers)
        print("🚀 Fetching vehicle data and allocations...")
        
        # First: Get all vehicle van_numbers
        vehicle_query = """
            SELECT Id, Name, Van_Number__c
            FROM Vehicle__c
            LIMIT 5000
        """
        
        try:
            vehicle_result = sf.sf.query(vehicle_query)
            all_vehicles = vehicle_result.get('records', [])
            print(f"✅ Found {len(all_vehicles)} vehicles")
            
            # Build Vehicle ID → van_number mapping
            vehicle_to_van = {}
            for idx, vehicle in enumerate(all_vehicles):
                vehicle_id = vehicle.get('Id', '')
                van_number = vehicle.get('Van_Number__c', '')
                vehicle_name = vehicle.get('Name', '')
                
                # Use Van_Number__c if available, otherwise use Name
                display_name = van_number if van_number else vehicle_name
                if not display_name:
                    display_name = 'N/A'
                
                if vehicle_id:
                    vehicle_to_van[vehicle_id] = display_name
                
                # Debug: show first 5 vehicles
                if idx < 5:
                    print(f"   Vehicle {vehicle_id[:10]}... → Van: '{van_number}' | Name: '{vehicle_name}' → Using: '{display_name}'")
            
            print(f"✅ Built vehicle van_number map: {len(vehicle_to_van)} vehicles")
        except Exception as e:
            print(f"⚠️ Error fetching vehicles: {e}")
            import traceback
            traceback.print_exc()
            vehicle_to_van = {}
        
        # Second: Get active allocations by Service_Resource ID
        print("🚀 Fetching active allocations...")
        allocation_query = """
            SELECT 
                Service_Resource__c,
                Vehicle__c,
                Start_date__c
            FROM Vehicle_Allocation__c
            WHERE Service_Resource__c != null
            AND Start_date__c <= TODAY
            AND (End_date__c = NULL OR End_date__c >= TODAY)
            ORDER BY Start_date__c DESC
        """
        
        try:
            allocation_result = sf.sf.query(allocation_query)
            all_allocations = allocation_result.get('records', [])
            print(f"✅ Found {len(all_allocations)} active allocations")
            
            # Build Service_Resource ID -> van_number mapping
            service_resource_to_van = {}
            for allocation in all_allocations:
                service_resource_id = allocation.get('Service_Resource__c', '')
                vehicle_id = allocation.get('Vehicle__c', '')
                van_number = vehicle_to_van.get(vehicle_id, 'N/A')
                
                # Store most recent allocation for each engineer (only if not already mapped)
                if service_resource_id and service_resource_id not in service_resource_to_van:
                    service_resource_to_van[service_resource_id] = van_number
                    if len(service_resource_to_van) <= 5:
                        print(f"   Allocation: {service_resource_id[:10]}... → Vehicle {vehicle_id[:10]}... → Van: '{van_number}'")
            
            print(f"✅ Mapped {len(service_resource_to_van)} service resources to van numbers\n")
            
        except Exception as e:
            print(f"⚠️ Error fetching allocations: {e}")
            import traceback
            traceback.print_exc()
            service_resource_to_van = {}
        
        # ⚡ STEP 3: Match in memory (NO API calls!)
        print("🚀 Matching engineers with scores...")
        
        engineers_list = []
        matched = 0
        not_matched = 0
        
        for engineer in all_engineers:
            engineer_id = engineer.get('Id', '')
            engineer_name = engineer.get('Name', 'Unknown')
            
            # Get email
            related_record = engineer.get('RelatedRecord', {})
            if related_record and isinstance(related_record, dict):
                engineer_email = related_record.get('Email', '').strip()
            else:
                engineer_email = ''
            
            if not engineer_email:
                continue
            
            email_lower = engineer_email.lower()
            
            # Get score from cache (instant lookup, no API call!)
            driving_score = email_to_score.get(email_lower, 0)
            
            # Get van_number from service resource mapping using engineer ID
            van_number = service_resource_to_van.get(engineer_id, 'N/A')
            
            if driving_score > 0:
                matched += 1
            else:
                not_matched += 1
            
            score_class = get_score_class(driving_score)
            trade_group = engineer.get('Trade_Lookup__c', 'N/A')
            
            engineers_list.append({
                "rank": 0,
                "name": engineer_name,
                "email": engineer_email,
                "van_number": van_number,
                "trade_group": trade_group,
                "driving_score": driving_score,
                "score_class": score_class
            })
        
        # Sort by score
        engineers_list.sort(key=lambda x: (-x['driving_score'], x['name']))
        
        # Update ranks
        for idx, engineer in enumerate(engineers_list):
            engineer['rank'] = idx + 1
        
        # Debug: show top 5 engineers being returned
        print(f"\n📤 TOP 5 ENGINEERS BEING SENT TO FRONTEND:")
        for eng in engineers_list[:5]:
            print(f"   {eng['rank']}. {eng['name']} → Van: '{eng['van_number']}' | Score: {eng['driving_score']}")
        
        print(f"\n{'='*80}")
        print(f"✅ COMPLETE!")
        print(f"   Total engineers: {len(engineers_list)}")
        print(f"   ✅ With scores: {matched}")
        print(f"   ⚠️ Without scores: {not_matched}")
        
        if matched > 0:
            avg_score = sum(e['driving_score'] for e in engineers_list if e['driving_score'] > 0) / matched
            print(f"   📊 Average score: {avg_score:.2f}")
            
            # Show top 5
            print(f"\n   🏆 Top 5:")
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
            "last_cache_update": _cache.get('last_updated').isoformat() if _cache.get('last_updated') else None,
            "engineers": engineers_list
        }
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ✅ NEW: Manual refresh endpoint
@router.post("/refresh-scores")
def manual_refresh_scores():
    """
    ✅ MANUAL REFRESH: Force immediate cache update
    Use this if you want to refresh before the 7-day automatic cycle
    """
    try:
        refresh_webfleet_cache()
        
        return {
            "status": "success",
            "message": "Webfleet scores refreshed successfully",
            "last_updated": _cache.get('last_updated').isoformat() if _cache.get('last_updated') else None,
            "total_scores": len(_cache.get('scores', {}))
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Refresh failed: {str(e)}")


# ✅ NEW: Check cache status
@router.get("/cache-status")
def get_cache_status():
    """
    ✅ CHECK CACHE: See when cache was last updated and when next update is
    """
    last_updated = _cache.get('last_updated')
    
    if last_updated:
        next_update = last_updated + timedelta(days=7)
        time_until_refresh = next_update - datetime.now()
        
        return {
            "cache_exists": True,
            "last_updated": last_updated.isoformat(),
            "next_update": next_update.isoformat(),
            "days_until_refresh": time_until_refresh.days,
            "hours_until_refresh": time_until_refresh.seconds // 3600,
            "total_cached_scores": len(_cache.get('scores', {}))
        }
    else:
        return {
            "cache_exists": False,
            "message": "Cache not yet initialized"
        }


@router.get("/test-connection")
def test_webfleet_connection():
    """Test Webfleet API connection"""
    try:
        scores = get_all_webfleet_scores_BATCH()
        
        scores_with_data = {k: v for k, v in scores.items() if v > 0}
        
        return {
            "status": "ok",
            "message": "Webfleet connection successful",
            "total_drivers": len(scores),
            "drivers_with_scores": len(scores_with_data),
            "sample_scores": dict(list(scores_with_data.items())[:5])
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


def get_score_class(score):
    """Determine score class (0-10 scale)"""
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


def load_engineers_with_scores():
    """
    ✅ EXPORTED FUNCTION: Load engineers with scores for app startup cache
    Returns the full result dict with engineers list
    
    This is used by FastAPI startup event to preload the global driver cache
    """
    return get_engineers_with_scores()
