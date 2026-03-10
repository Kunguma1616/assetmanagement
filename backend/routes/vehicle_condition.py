from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import httpx
import os
import sys
import traceback
from datetime import datetime, timedelta, timezone
import base64
import sys



sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from salesforce_service import SalesforceService
from groq_service import GroqService

# ─── Trade mapping ────────────────────────────────────────────────────────────
# Source of truth: get_manager_mapping()
# SOQL excludes: Key, Utilities, PM, Test Ops — NOT mapped here.
#
# james.parkinson  → Gas, HVAC & Electrical  (Gas, HVAC, Electrical ONLY)
# lee.merryweather → Building Fabric          (Roofing, Multi, Decoration, Carpentry,
#                                              General Builders, Vent Hygiene, Building Fabric)
#                  + Environmental Services   (Pest Control, Sanitisation, Waste Clearance)
# gavin.petty      → LDR                      (Damp, Mould, Drying, Restoration)
# martin/sam/george/ryan → Drainage & Plumbing
# marjan/neil      → LDR                      (Leak Detection)
# paul.mcgee       → Fire Safety

TRADE_TO_CATEGORY = {
    # Building Fabric (lee.merryweather)
    'Bathroom Refurbishment':  'Building Fabric',
    'bathroom refurbishment':  'Building Fabric',
    'Building':                'Building Fabric',
    'building':                'Building Fabric',
    'Building and Fabric':     'Building Fabric',
    'building and fabric':     'Building Fabric',
    'Building Fabric':         'Building Fabric',
    'Building n fabric':       'Building Fabric',
    'BUILDING n fabric':       'Building Fabric',
    'Building and fabric':     'Building Fabric',
    'buiding and fabric':      'Building Fabric',
    'Carpentry':               'Building Fabric',
    'carpentry':               'Building Fabric',
    'Carpenter':               'Building Fabric',
    'carpenter':               'Building Fabric',
    'CARPTERNER':              'Building Fabric',
    'Decoration':              'Building Fabric',
    'decoration':              'Building Fabric',
    'Decorating':              'Building Fabric',
    'decorating':              'Building Fabric',
    'General Builders':        'Building Fabric',
    'general builders':        'Building Fabric',
    'Multi':                   'Building Fabric',
    'multi':                   'Building Fabric',
    'Project Manager':         'Building Fabric',
    'project manager':         'Building Fabric',
    'Roofing':                 'Building Fabric',
    'roofing':                 'Building Fabric',
    'Vent Hygiene':            'Building Fabric',
    'vent hygiene':            'Building Fabric',

    # Drainage & Plumbing (martin/sam/george/ryan)
    'Drainage':                'Drainage & Plumbing',
    'drainage':                'Drainage & Plumbing',
    'Plumbing':                'Drainage & Plumbing',
    'plumbing':                'Drainage & Plumbing',
    'plumbling':               'Drainage & Plumbing',

    # Environmental Services (lee.merryweather subset)
    'Environmental Services':             'Environmental Services',
    'environmental services':             'Environmental Services',
    'Gardening':                          'Environmental Services',
    'gardening':                          'Environmental Services',
    'Pest Control':                       'Environmental Services',
    'pest control':                       'Environmental Services',
    'Pest Proofing':                      'Environmental Services',
    'pest proofing':                      'Environmental Services',
    'Rubbish Removal':                    'Environmental Services',
    'rubbish removal':                    'Environmental Services',
    'Sanitisation':                       'Environmental Services',
    'sanitisation':                       'Environmental Services',
    'Sanitisation & specialist cleaning': 'Environmental Services',
    'sanitisation & specialist cleaning': 'Environmental Services',
    'Waste Clearance':                    'Environmental Services',
    'waste clearance':                    'Environmental Services',

    # Fire Safety (paul.mcgee)
    'Fire Safety':             'Fire Safety',
    'fire safety':             'Fire Safety',

    # Gas, HVAC & Electrical (james.parkinson: Gas, HVAC, Electrical ONLY)
    'Air Conditioning':        'Gas, HVAC & Electrical',
    'air conditioning':        'Gas, HVAC & Electrical',
    'Doors':                   'Gas, HVAC & Electrical',
    'doors':                   'Gas, HVAC & Electrical',
    'Electrical':              'Gas, HVAC & Electrical',
    'electrical':              'Gas, HVAC & Electrical',
    'Gas':                     'Gas, HVAC & Electrical',
    'gas':                     'Gas, HVAC & Electrical',
    'Heating':                 'Gas, HVAC & Electrical',
    'heating':                 'Gas, HVAC & Electrical',
    'HVAC':                    'Gas, HVAC & Electrical',
    'hvac':                    'Gas, HVAC & Electrical',
    'Ventilation':             'Gas, HVAC & Electrical',
    'ventilation':             'Gas, HVAC & Electrical',
    'Windows':                 'Gas, HVAC & Electrical',
    'windows':                 'Gas, HVAC & Electrical',
    'Windows & Doors':         'Gas, HVAC & Electrical',
    'Windows and Doors':       'Gas, HVAC & Electrical',
    'windows and doors':       'Gas, HVAC & Electrical',
    'windows and dors':        'Gas, HVAC & Electrical',

    # LDR (marjan/neil: Leak Detection + gavin.petty: Damp/Mould/Drying/Restoration)
    'Damp':                    'LDR',
    'damp':                    'LDR',
    'Damp & Mould':            'LDR',
    'Damp and Mould':          'LDR',
    'Damp and mould':          'LDR',
    'damp and mould':          'LDR',
    'damp mould':              'LDR',
    'Drying':                  'LDR',
    'drying':                  'LDR',
    'Leak Detection':          'LDR',
    'leak detection':          'LDR',
    'Leak detection':          'LDR',
    'Mould':                   'LDR',
    'mould':                   'LDR',
    'Restoration':             'LDR',
    'restoration':             'LDR',
}

# ─── Final SOQL for engineers ─────────────────────────────────────────────────
# Excludes: FSM accounts, test records, Key/Utilities/PM/Test Ops trades
ENGINEERS_SOQL = """
    SELECT Name, Trade_Lookup__c
    FROM ServiceResource
    WHERE Is_User_Active__c = true
      AND IsActive = true
      AND Trade_Lookup__c != null
      AND FSM__c = false
      AND Account.Chumley_Test_Record__c = false
      AND RelatedRecord.Profile_Name__c = 'Engineer Partner Community'
      AND Trade_Lookup__c NOT IN ('Key', 'Utilities', 'PM', 'Test Ops')
    ORDER BY Name
"""


def map_trade_to_category(trade: str) -> str:
    """Map any trade value to one of the 6 clean categories"""
    if not trade:
        return 'N/A'

    trade_trimmed = trade.strip()

    # Exact match (fastest)
    if trade_trimmed in TRADE_TO_CATEGORY:
        mapped = TRADE_TO_CATEGORY[trade_trimmed]
        print(f"[TRADE_MAP] Exact match: '{trade_trimmed}' → '{mapped}'")
        return mapped

    # Case-insensitive match
    for key, value in TRADE_TO_CATEGORY.items():
        if key.lower() == trade_trimmed.lower():
            print(f"[TRADE_MAP] Case match: '{trade_trimmed}' → '{value}'")
            return value

    print(f"[TRADE_MAP] ⚠️ NO MATCH for '{trade_trimmed}' - returning as-is")
    return trade_trimmed


router = APIRouter(prefix="/api/vehicle-condition", tags=["vehicle_condition"])
sf_service = SalesforceService()
groq_service = GroqService()

_http_client: httpx.AsyncClient | None = None

async def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(90.0, connect=30.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
            follow_redirects=True,
        )
    return _http_client


def parse_salesforce_datetime(date_str: str) -> datetime:
    """Convert Salesforce datetime string to Python datetime, handling timezone."""
    if not date_str:
        return None
    try:
        date_str = date_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception as e:
        print(f"[PARSE] Error parsing datetime: {date_str} - {e}")
        return None


@router.get("/submission-status/{vehicle_input}")
def check_vcr_submission_status(vehicle_input: str):
    """
    📋 STEP 1: VCR Submission Status Checker
    """
    try:
        print(f"[COMPLIANCE] Step 1: Finding vehicle '{vehicle_input}'")
        vehicle_query = f"""
            SELECT Id,
                   Name,
                   Van_Number__c,
                   Reg_No__c
            FROM Vehicle__c
            WHERE Name = '{vehicle_input}'
            OR Reg_No__c = '{vehicle_input}'
            OR Van_Number__c = '{vehicle_input}'
            LIMIT 1
        """
        vehicle_result = sf_service.execute_soql(vehicle_query)

        if not vehicle_result:
            raise HTTPException(status_code=404, detail=f"Vehicle not found: {vehicle_input}")

        vehicle_data = vehicle_result[0]
        vehicle_id = vehicle_data["Id"]
        vehicle_name = vehicle_data.get("Name", vehicle_input)
        print(f"[COMPLIANCE] ✓ Found vehicle: {vehicle_name} (ID: {vehicle_id})")

        print(f"[COMPLIANCE] Step 2: Getting latest allocation for {vehicle_name}")
        allocation_query = f"""
            SELECT Start_date__c,
                   Service_Resource__r.Name
            FROM Vehicle_Allocation__c
            WHERE Vehicle__c = '{vehicle_id}'
            ORDER BY Start_date__c DESC
            LIMIT 1
        """
        allocation_result = sf_service.execute_soql(allocation_query)

        if not allocation_result:
            raise HTTPException(status_code=404, detail=f"No allocation found for vehicle: {vehicle_name}")

        allocation_data = allocation_result[0]
        allocation_start_str = allocation_data.get("Start_date__c")
        engineer_name = allocation_data.get("Service_Resource__r", {})
        engineer_name = engineer_name.get("Name", "Unassigned") if engineer_name else "Unassigned"

        allocation_start_date = parse_salesforce_datetime(allocation_start_str)
        if not allocation_start_date:
            raise HTTPException(status_code=500, detail="Failed to parse allocation start date")

        print(f"[COMPLIANCE] ✓ Latest allocation start: {allocation_start_date} | Engineer: {engineer_name}")

        print(f"[COMPLIANCE] Step 3: Getting latest VCR for {vehicle_name}")
        vcr_query = f"""
            SELECT Id,
                   Name,
                   LastModifiedDate,
                   LastModifiedBy.Name,
                   CreatedDate,
                   CreatedBy.Name
            FROM Vehicle_Condition_Form__c
            WHERE Vehicle__c = '{vehicle_id}'
            ORDER BY LastModifiedDate DESC
            LIMIT 1
        """
        vcr_result = sf_service.execute_soql(vcr_query)

        if not vcr_result:
            print(f"[COMPLIANCE] [WARN] No VCR exists for {vehicle_name}")
            return {
                "vehicle": vehicle_name,
                "engineer": engineer_name,
                "allocation_start_date": allocation_start_date.date().isoformat(),
                "latest_vcr_id": None,
                "latest_vcr_last_modified_date": None,
                "latest_vcr_last_modified_by": None,
                "submitted": False,
                "flag": "RED",
                "reason": "No VCR exists"
            }

        vcr_data = vcr_result[0]
        vcr_id = vcr_data.get("Id")
        vcr_name = vcr_data.get("Name")
        vcr_last_modified_str = vcr_data.get("LastModifiedDate")
        vcr_last_modified_by = vcr_data.get("LastModifiedBy", {})
        vcr_last_modified_by = vcr_last_modified_by.get("Name", "Unknown") if vcr_last_modified_by else "Unknown"

        last_modified_date = parse_salesforce_datetime(vcr_last_modified_str)
        if not last_modified_date:
            raise HTTPException(status_code=500, detail="Failed to parse VCR last modified date")

        print(f"[COMPLIANCE] ✓ Latest VCR: {vcr_name} | Last Modified: {last_modified_date}")

        print(f"[COMPLIANCE] Step 4: Running compliance check")
        window_start = allocation_start_date - timedelta(days=14)
        window_end   = allocation_start_date + timedelta(days=14)
        is_within_window = window_start <= last_modified_date <= window_end
        submitted = is_within_window
        flag = "GREEN" if is_within_window else "RED"

        print(f"[COMPLIANCE] Window: {window_start} to {window_end}")
        print(f"[COMPLIANCE] VCR Modified: {last_modified_date}")
        print(f"[COMPLIANCE] Result: {flag} (submitted={submitted})")

        return {
            "vehicle": vehicle_name,
            "engineer": engineer_name,
            "allocation_start_date": allocation_start_date.date().isoformat(),
            "latest_vcr_id": vcr_id,
            "latest_vcr_last_modified_date": last_modified_date.date().isoformat(),
            "latest_vcr_last_modified_by": vcr_last_modified_by,
            "submitted": submitted,
            "flag": flag
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[COMPLIANCE] [ERROR] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compliance/dashboard/all-allocated")
def get_compliance_dashboard_all_allocated():
    """
    📊 VCR COMPLIANCE DASHBOARD - All Allocated Vehicles
    Only includes vehicles assigned to active engineers with valid Trade_Lookup__c
    """
    try:
        print(f"[VCR_DASHBOARD] Starting VCR Compliance Dashboard")

        today = datetime.now(timezone.utc)

        # STEP 1: Get ONLY active engineers using the final SOQL
        # Excludes: FSM accounts, test records, Key/Utilities/PM/Test Ops
        print(f"[VCR_DASHBOARD] Fetching active engineers with trade assignments...")
        engineers_data = sf_service.execute_soql(ENGINEERS_SOQL)

        if not engineers_data:
            print(f"[VCR_DASHBOARD] [WARN] No active engineers with trades found")
            return {
                "totalAllocated": 0,
                "submittedCount": 0,
                "notSubmittedCount": 0,
                "submitted": [],
                "notSubmitted": []
            }

        # Build engineers_map: engineer_name -> mapped_trade
        engineers_map = {}
        for engineer in engineers_data:
            eng_name = engineer.get("Name", "").strip()
            raw_trade = engineer.get("Trade_Lookup__c", "")
            mapped_trade = map_trade_to_category(raw_trade)
            engineers_map[eng_name] = mapped_trade

        print(f"[VCR_DASHBOARD] ✓ Found {len(engineers_map)} active engineers with trades")

        # STEP 2: Get vehicle allocations
        allocation_query = f"""
            SELECT Vehicle__c,
                   Vehicle__r.Name,
                   Vehicle__r.Reg_No__c,
                   Service_Resource__r.Name
            FROM Vehicle_Allocation__c
            WHERE Start_date__c <= TODAY
              AND (End_date__c = NULL OR End_date__c >= TODAY)
            ORDER BY Vehicle__c, Start_date__c DESC
        """
        print(f"[VCR_DASHBOARD] Fetching allocated vehicles...")
        allocated_vehicles = sf_service.execute_soql(allocation_query)

        if not allocated_vehicles:
            print(f"[VCR_DASHBOARD] [WARN] No allocated vehicles found")
            return {
                "totalAllocated": 0,
                "submittedCount": 0,
                "notSubmittedCount": 0,
                "submitted": [],
                "notSubmitted": []
            }

        # Filter allocations to ONLY include engineers in engineers_map
        filtered_allocations = []
        for allocation in allocated_vehicles:
            eng_name = (allocation.get("Service_Resource__r") or {}).get("Name", "").strip()
            if eng_name in engineers_map:
                filtered_allocations.append(allocation)

        print(f"[VCR_DASHBOARD] ✓ Filtered from {len(allocated_vehicles)} to {len(filtered_allocations)} valid allocations")

        # De-duplicate vehicles (keep first allocation per vehicle)
        seen_vehicles = {}
        for allocation in filtered_allocations:
            vehicle_id = allocation["Vehicle__c"]
            if vehicle_id not in seen_vehicles:
                seen_vehicles[vehicle_id] = allocation

        allocated_vehicles = list(seen_vehicles.values())
        total_allocated = len(allocated_vehicles)
        print(f"[VCR_DASHBOARD] ✓ Deduplicated to {total_allocated} unique vehicles")

        vehicle_ids = [v["Vehicle__c"] for v in allocated_vehicles]
        vehicle_ids_str = "', '".join(vehicle_ids)

        vcr_query = f"""
            SELECT Id,
                   Vehicle__c,
                   Vehicle__r.Name,
                   Vehicle__r.Reg_No__c,
                   Current_Engineer_Assigned_to_Vehicle__r.Name,
                   CreatedDate,
                   LastModifiedDate
            FROM Vehicle_Condition_Form__c
            WHERE Vehicle__c IN ('{vehicle_ids_str}')
            ORDER BY Vehicle__c, CreatedDate DESC
        """
        print(f"[VCR_DASHBOARD] Fetching VCR records...")
        vcr_records = sf_service.execute_soql(vcr_query)

        # Keep ONLY the latest VCR per vehicle
        latest_vcr_map = {}
        if vcr_records:
            for vcr in vcr_records:
                vehicle_id = vcr["Vehicle__c"]
                if vehicle_id not in latest_vcr_map:
                    latest_vcr_map[vehicle_id] = vcr

        print(f"[VCR_DASHBOARD] ✓ Found {len(vcr_records)} total VCRs, {len(latest_vcr_map)} latest")

        submitted_list = []
        not_submitted_list = []

        for vehicle in allocated_vehicles:
            vehicle_id    = vehicle["Vehicle__c"]
            vehicle_name  = (vehicle.get("Vehicle__r") or {}).get("Name", "Unknown")
            vehicle_reg   = (vehicle.get("Vehicle__r") or {}).get("Reg_No__c", "")
            engineer_name = (vehicle.get("Service_Resource__r") or {}).get("Name", "Unassigned")
            mapped_trade  = engineers_map.get(engineer_name, "Unknown")

            if vehicle_id in latest_vcr_map:
                latest_vcr   = latest_vcr_map[vehicle_id]
                vcr_date_str = latest_vcr.get("CreatedDate")
                vcr_date     = parse_salesforce_datetime(vcr_date_str)

                if vcr_date:
                    days_since = (today - vcr_date).days

                    if days_since <= 14:
                        print(f"[VCR_DASHBOARD] [OK] {vehicle_name}: SUBMITTED ({days_since} days ago) | Trade: {mapped_trade}")
                        submitted_list.append({
                            "vehicleId":     vehicle_id,
                            "vanName":       vehicle_name,
                            "regNo":         vehicle_reg or "N/A",
                            "engineerName":  engineer_name,
                            "trade":         mapped_trade,
                            "latestVcrDate": vcr_date.date().isoformat(),
                            "daysSince":     days_since,
                            "status":        "Submitted"
                        })
                    else:
                        print(f"[VCR_DASHBOARD] [WARN] {vehicle_name}: OVERDUE ({days_since} days ago) | Trade: {mapped_trade}")
                        not_submitted_list.append({
                            "vehicleId":     vehicle_id,
                            "vanName":       vehicle_name,
                            "regNo":         vehicle_reg or "N/A",
                            "engineerName":  engineer_name,
                            "trade":         mapped_trade,
                            "latestVcrDate": vcr_date.date().isoformat(),
                            "daysSince":     days_since,
                            "status":        "Overdue"
                        })
            else:
                print(f"[VCR_DASHBOARD] [WARN] {vehicle_name}: MISSING (no report) | Trade: {mapped_trade}")
                not_submitted_list.append({
                    "vehicleId":     vehicle_id,
                    "vanName":       vehicle_name,
                    "regNo":         vehicle_reg or "N/A",
                    "engineerName":  engineer_name,
                    "trade":         mapped_trade,
                    "latestVcrDate": None,
                    "daysSince":     None,
                    "status":        "Missing"
                })

        submitted_count     = len(submitted_list)
        not_submitted_count = len(not_submitted_list)

        print(f"[VCR_DASHBOARD] Summary: {total_allocated} total | {submitted_count} submitted | {not_submitted_count} not submitted")

        return {
            "totalAllocated":    total_allocated,
            "submittedCount":    submitted_count,
            "notSubmittedCount": not_submitted_count,
            "submitted":         submitted_list,
            "notSubmitted":      not_submitted_list,
            "asOfDate":          today.date().isoformat()
        }

    except Exception as e:
        print(f"[VCR_DASHBOARD] [ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compliance/search/{van_number_or_reg}")
def search_vcr_by_van(van_number_or_reg: str):
    """
    🔍 Search VCR Reports by Van Number or Registration Number
    """
    try:
        print(f"[VCR_SEARCH] Searching for: {van_number_or_reg}")

        vehicle_query = f"""
            SELECT Id, Name, Van_Number__c, Reg_No__c
            FROM Vehicle__c
            WHERE Name = '{van_number_or_reg}'
               OR Van_Number__c = '{van_number_or_reg}'
               OR Reg_No__c = '{van_number_or_reg}'
            LIMIT 1
        """
        vehicle_result = sf_service.execute_soql(vehicle_query)

        if not vehicle_result:
            raise HTTPException(status_code=404, detail="Vehicle not found")

        vehicle      = vehicle_result[0]
        vehicle_id   = vehicle["Id"]
        vehicle_name = vehicle.get("Name", van_number_or_reg)

        vcr_query = f"""
            SELECT Id,
                   Name,
                   Current_Engineer_Assigned_to_Vehicle__r.Name,
                   CreatedDate,
                   LastModifiedDate,
                   Description__c
            FROM Vehicle_Condition_Form__c
            WHERE Vehicle__c = '{vehicle_id}'
            ORDER BY CreatedDate DESC
            LIMIT 1
        """
        vcr_result = sf_service.execute_soql(vcr_query)

        if not vcr_result:
            return {"vehicle": vehicle_name, "latestVcr": None, "images": []}

        vcr    = vcr_result[0]
        vcr_id = vcr["Id"]

        doc_link_query = f"""
            SELECT ContentDocumentId FROM ContentDocumentLink
            WHERE LinkedEntityId = '{vcr_id}'
        """
        doc_links = sf_service.execute_soql(doc_link_query)

        images = []
        if doc_links:
            doc_ids     = [link["ContentDocumentId"] for link in doc_links]
            doc_ids_str = "', '".join(doc_ids)

            image_query = f"""
                SELECT Id, Title, FileExtension, ContentSize
                FROM ContentVersion
                WHERE ContentDocumentId IN ('{doc_ids_str}')
                AND IsLatest = true
            """
            image_results = sf_service.execute_soql(image_query)

            if image_results:
                for img in image_results:
                    images.append({
                        "id":            img["Id"],
                        "title":         img.get("Title", "Image"),
                        "fileExtension": img.get("FileExtension", ""),
                        "imageUrl":      f"/api/vehicle-condition/image/{img['Id']}"
                    })

        return {
            "vehicle": vehicle_name,
            "latestVcr": {
                "id":          vcr_id,
                "name":        vcr.get("Name"),
                "createdDate": vcr.get("CreatedDate"),
                "engineer":    (vcr.get("Current_Engineer_Assigned_to_Vehicle__r") or {}).get("Name", "Unknown"),
                "description": vcr.get("Description__c")
            },
            "images": images
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[VCR_SEARCH] [ERROR] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/image/{version_id}")
async def proxy_image(version_id: str):
    if sf_service.mock_mode or not sf_service.sf:
        raise HTTPException(status_code=503, detail="Salesforce not connected")

    access_token = sf_service.sf.session_id
    instance_url = f"https://{sf_service.sf.sf_instance}"
    rest_url     = f"{instance_url}/services/data/v60.0/sobjects/ContentVersion/{version_id}/VersionData"

    print(f"[IMAGE] Fetching via REST API: {version_id}")
    print(f"[IMAGE] URL: {rest_url}")
    print(f"[IMAGE] Using token: {access_token[:20]}...")
    print(f"[IMAGE] Instance: {instance_url}")

    try:
        client   = await get_http_client()
        response = await client.get(
            rest_url,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30.0,
        )

        print(f"[IMAGE] {version_id} → status={response.status_code}, size={len(response.content)} bytes, type={response.headers.get('content-type', '?')}")

        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="Salesforce token expired")
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Image not found: {version_id}")
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"Error fetching image: HTTP {response.status_code}")
        if len(response.content) == 0:
            raise HTTPException(status_code=500, detail="Empty image")

        content_type = response.headers.get("content-type", "image/jpeg")

        if "text/html" in content_type or "text/plain" in content_type:
            raise HTTPException(status_code=403, detail="Got HTML/text instead of image")

        print(f"[IMAGE] [OK] Success {version_id} - {len(response.content)} bytes of {content_type}")

        return Response(
            content=response.content,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=86400",
                "Access-Control-Allow-Origin": "*",
                "Content-Length": str(len(response.content)),
            }
        )

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[IMAGE] [ERROR] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/form/{form_id}")
def get_single_form_with_images(form_id: str):
    form_query = f"""
        SELECT Id, Name, Owner.Name, Description__c,
               Current_Engineer_Assigned_to_Vehicle__r.Name,
               Inspection_Result__c, CreatedDate
        FROM Vehicle_Condition_Form__c
        WHERE Id = '{form_id}'
        LIMIT 1
    """
    form_result = sf_service.execute_soql(form_query)
    if not form_result:
        raise HTTPException(status_code=404, detail="Form not found")

    form_data = form_result[0]

    doc_link_result = sf_service.execute_soql(f"""
        SELECT ContentDocumentId FROM ContentDocumentLink
        WHERE LinkedEntityId = '{form_id}'
    """)

    images = []
    if doc_link_result:
        doc_ids     = [r["ContentDocumentId"] for r in doc_link_result]
        doc_ids_str = "', '".join(doc_ids)
        image_result = sf_service.execute_soql(f"""
            SELECT Id, Title, ContentDocumentId FROM ContentVersion
            WHERE ContentDocumentId IN ('{doc_ids_str}')
            AND IsLatest = true
        """)
        for img in image_result:
            images.append({
                "id":    img["Id"],
                "title": img.get("Title", "Image"),
                "url":   f"/api/vehicle-condition/image/{img['Id']}"
            })

    return {"form": form_data, "images": images}


@router.get("/ai-analyse/{form_id}")
async def ai_analyse_vcr_images(form_id: str):
    """
    🤖 AI IMAGE ANALYSIS - Analyses all VCR images for a given form using Llama Vision
    """
    try:
        print(f"[VCR_AI] Starting AI analysis for form: {form_id}")

        form_query = f"""
            SELECT Id,
                   Name,
                   Vehicle__r.Name,
                   Vehicle__r.Reg_No__c,
                   Current_Engineer_Assigned_to_Vehicle__r.Name,
                   CreatedDate
            FROM Vehicle_Condition_Form__c
            WHERE Id = '{form_id}'
            LIMIT 1
        """
        form_result = sf_service.execute_soql(form_query)

        if not form_result:
            raise HTTPException(status_code=404, detail=f"VCR Form not found: {form_id}")

        form_data     = form_result[0]
        vehicle_name  = (form_data.get("Vehicle__r") or {}).get("Name", "Unknown Vehicle")
        reg_no        = (form_data.get("Vehicle__r") or {}).get("Reg_No__c", "Unknown Reg")
        engineer_name = (form_data.get("Current_Engineer_Assigned_to_Vehicle__r") or {}).get("Name", "Unknown Engineer")

        print(f"[VCR_AI] Form: {form_data.get('Name')} | Vehicle: {vehicle_name} | Engineer: {engineer_name}")

        doc_link_query = f"""
            SELECT ContentDocumentId
            FROM ContentDocumentLink
            WHERE LinkedEntityId = '{form_id}'
        """
        doc_links = sf_service.execute_soql(doc_link_query)

        if not doc_links:
            return {
                "form_id":              form_id,
                "vehicle":              vehicle_name,
                "reg_no":               reg_no,
                "engineer":             engineer_name,
                "analysed_at":          datetime.now(timezone.utc).date().isoformat(),
                "total_images":         0,
                "overall_fleet_status": "AMBER",
                "reports":              [],
                "message":              "No images found for this VCR form"
            }

        doc_ids     = [link["ContentDocumentId"] for link in doc_links]
        doc_ids_str = "', '".join(doc_ids)

        image_query = f"""
            SELECT Id, Title, FileExtension, ContentSize
            FROM ContentVersion
            WHERE ContentDocumentId IN ('{doc_ids_str}')
            AND IsLatest = true
        """
        image_records = sf_service.execute_soql(image_query)

        if not image_records:
            raise HTTPException(status_code=404, detail="No image versions found")

        print(f"[VCR_AI] Found {len(image_records)} images to analyse")

        if sf_service.mock_mode or not sf_service.sf:
            raise HTTPException(status_code=503, detail="Salesforce not connected")

        access_token = sf_service.sf.session_id
        instance_url = f"https://{sf_service.sf.sf_instance}"
        http_client  = await get_http_client()

        images_for_ai = []

        for img in image_records:
            version_id  = img["Id"]
            image_title = img.get("Title", "Unknown")
            file_ext    = img.get("FileExtension", "jpg").lower()

            mime_map = {
                "jpg":  "image/jpeg",
                "jpeg": "image/jpeg",
                "png":  "image/png",
                "gif":  "image/gif",
                "webp": "image/webp",
                "heic": "image/heic",
            }
            content_type = mime_map.get(file_ext, "image/jpeg")

            try:
                rest_url = f"{instance_url}/services/data/v60.0/sobjects/ContentVersion/{version_id}/VersionData"
                response = await http_client.get(
                    rest_url,
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=30.0
                )

                if response.status_code != 200:
                    print(f"[VCR_AI] ⚠️ Skipping {image_title} - HTTP {response.status_code}")
                    continue

                if len(response.content) == 0:
                    print(f"[VCR_AI] ⚠️ Skipping {image_title} - empty content")
                    continue

                b64_data = base64.b64encode(response.content).decode("utf-8")
                images_for_ai.append({
                    "title":        image_title,
                    "base64":       b64_data,
                    "content_type": content_type
                })
                print(f"[VCR_AI] ✅ Downloaded: {image_title} ({len(response.content)} bytes)")

            except Exception as e:
                print(f"[VCR_AI] ❌ Failed to download {image_title}: {e}")
                continue

        if not images_for_ai:
            raise HTTPException(
                status_code=500,
                detail="All image downloads failed — cannot run AI analysis"
            )

        print(f"[VCR_AI] Sending {len(images_for_ai)} images to Llama Vision...")

        reports = groq_service.analyse_vehicle_images(
            images=images_for_ai,
            engineer_name=engineer_name,
            vehicle_name=vehicle_name,
            reg_no=reg_no
        )

        conditions = [r.get("overall_condition", "AMBER") for r in reports]
        if "RED" in conditions:
            overall_status = "RED"
        elif "AMBER" in conditions:
            overall_status = "AMBER"
        else:
            overall_status = "GREEN"

        print(f"[VCR_AI] ✅ Analysis complete | Overall: {overall_status} | {len(reports)} reports")

        return {
            "form_id":              form_id,
            "vehicle":              vehicle_name,
            "reg_no":               reg_no,
            "engineer":             engineer_name,
            "analysed_at":          datetime.now(timezone.utc).date().isoformat(),
            "total_images":         len(images_for_ai),
            "overall_fleet_status": overall_status,
            "reports":              reports
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[VCR_AI] [ERROR] {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/engineers")
def get_engineers_with_trades():
    """
    Fetch active engineers with their Trade_Lookup__c from Salesforce.
    Uses final SOQL: excludes FSM, test records, Key/Utilities/PM/Test Ops.
    Maps all trades to 6 clean categories.
    """
    try:
        results = sf_service.execute_soql(ENGINEERS_SOQL)
        if not results:
            return {"engineers": []}

        engineers = []
        for r in results:
            raw_trade    = r.get("Trade_Lookup__c", "")
            mapped_trade = map_trade_to_category(raw_trade)
            engineers.append({
                "name":  r["Name"],
                "trade": mapped_trade
            })

        print(f"[ENGINEERS] ✓ Returning {len(engineers)} active engineers (mapped to 6 categories)")
        for eng in engineers[:5]:
            print(f"[ENGINEERS] - {eng['name']}: {eng['trade']}")
        return {"engineers": engineers}
    except Exception as e:
        print(f"[ENGINEERS] [ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{vehicle_number}")
def get_vehicle_condition_forms(vehicle_number: str):
    vehicle_result = sf_service.execute_soql(f"""
        SELECT Id, Name FROM Vehicle__c
        WHERE Name = '{vehicle_number}' OR Reg_No__c = '{vehicle_number}' OR Van_Number__c = '{vehicle_number}'
        LIMIT 1
    """)
    if not vehicle_result:
        return {"message": "Vehicle not found"}

    vehicle_id = vehicle_result[0]["Id"]
    forms = sf_service.execute_soql(f"""
        SELECT Id, Name, CreatedDate FROM Vehicle_Condition_Form__c
        WHERE Vehicle__c = '{vehicle_id}'
        ORDER BY CreatedDate DESC
    """)

    if not forms:
        return {"vehicle": vehicle_number, "forms_count": 0, "forms": []}

    return {"vehicle": vehicle_number, "forms_count": len(forms), "forms": forms}


@router.get("/dashboard/summary")
def get_vehicle_condition_dashboard():
    """
    Dashboard showing VCR stats for last 14 days
    """
    try:
        total_vcr_result = sf_service.execute_soql("""
            SELECT COUNT(Id) cnt
            FROM Vehicle_Condition_Form__c
            WHERE CreatedDate = LAST_N_DAYS:14
        """)
        total_vcr = total_vcr_result[0]['cnt'] if total_vcr_result else 0

        with_images_result = sf_service.execute_soql("""
            SELECT COUNT_DISTINCT(LinkedEntityId) cnt
            FROM ContentDocumentLink
            WHERE LinkedEntityId IN (
                SELECT Id
                FROM Vehicle_Condition_Form__c
                WHERE CreatedDate = LAST_N_DAYS:14
            )
        """)
        with_images    = with_images_result[0]['cnt'] if with_images_result else 0
        without_images = total_vcr - with_images

        all_vcr = sf_service.execute_soql("""
            SELECT Id,
                   Name,
                   Vehicle__r.Name,
                   Current_Engineer_Assigned_to_Vehicle__r.Name
            FROM Vehicle_Condition_Form__c
            WHERE CreatedDate = LAST_N_DAYS:14
            ORDER BY CreatedDate DESC
        """)

        image_ids_result = sf_service.execute_soql("""
            SELECT LinkedEntityId
            FROM ContentDocumentLink
            WHERE LinkedEntityId IN (
                SELECT Id
                FROM Vehicle_Condition_Form__c
                WHERE CreatedDate = LAST_N_DAYS:14
            )
        """)

        image_id_set = {rec['LinkedEntityId'] for rec in image_ids_result} if image_ids_result else set()

        with_image_list    = []
        without_image_list = []

        for vcr in all_vcr:
            engineer_name = (vcr.get('Current_Engineer_Assigned_to_Vehicle__r') or {}).get('Name', 'Unassigned')
            van_number    = (vcr.get('Vehicle__r') or {}).get('Name', 'Unknown')

            record_data = {
                "form_id":   vcr['Id'],
                "form_name": vcr['Name'],
                "engineer":  engineer_name,
                "van":       van_number
            }

            if vcr['Id'] in image_id_set:
                with_image_list.append(record_data)
            else:
                without_image_list.append(record_data)

        return {
            "summary": {
                "total_vcr":      total_vcr,
                "with_images":    with_images,
                "without_images": without_images,
                "period":         "Last 14 Days"
            },
            "with_images_list": {
                "count":   len(with_image_list),
                "status":  "GREEN",
                "records": with_image_list
            },
            "without_images_list": {
                "count":   len(without_image_list),
                "status":  "RED",
                "records": without_image_list
            }
        }

    except Exception as e:
        print(f"[DASHBOARD] [ERROR] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))