from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import httpx
import os
import sys
import traceback
from datetime import datetime, timedelta, timezone
import base64

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from salesforce_service import SalesforceService
from groq_service import GroqService

# ─── Trade Mapping ────────────────────────────────────────────────────────────

TRADE_TO_CATEGORY = {
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
    'Roofing':                 'Building Fabric',
    'roofing':                 'Building Fabric',
    'Windows':                 'Building Fabric',
    'windows':                 'Building Fabric',
    'Windows & Doors':         'Building Fabric',
    'Windows and Doors':       'Building Fabric',
    'windows and doors':       'Building Fabric',
    'windows and dors':        'Building Fabric',
    'Doors':                   'Building Fabric',
    'doors':                   'Building Fabric',
    'Drainage':                'Drainage & Plumbing',
    'drainage':                'Drainage & Plumbing',
    'Plumbing':                'Drainage & Plumbing',
    'plumbing':                'Drainage & Plumbing',
    'plumbling':               'Drainage & Plumbing',
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
    'Fire Safety':             'Fire Safety',
    'fire safety':             'Fire Safety',
    'Air Conditioning':        'Gas, HVAC & Electrical',
    'air conditioning':        'Gas, HVAC & Electrical',
    'Electrical':              'Gas, HVAC & Electrical',
    'electrical':              'Gas, HVAC & Electrical',
    'Gas':                     'Gas, HVAC & Electrical',
    'gas':                     'Gas, HVAC & Electrical',
    'Heating':                 'Gas, HVAC & Electrical',
    'heating':                 'Gas, HVAC & Electrical',
    'HVAC':                    'Gas, HVAC & Electrical',
    'hvac':                    'Gas, HVAC & Electrical',
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

# ─── Engineers SOQL ───────────────────────────────────────────────────────────
# Source of truth for ALL active engineers. No allocation filter.

ENGINEERS_SOQL = """
    SELECT Name, Trade_Lookup__c
    FROM ServiceResource
    WHERE Is_User_Active__c = true
      AND IsActive = true
      AND Trade_Lookup__c != null
      AND FSM__c = false
      AND Account.Chumley_Test_Record__c = false
      AND RelatedRecord.Profile_Name__c = 'Engineer Partner Community'
      AND Trade_Lookup__c NOT IN ('Key', 'Utilities', 'PM', 'Test Ops', 'Vent Hygiene')
    ORDER BY Name
"""

# ─── Manual overrides for engineers with wrong trade in Salesforce ────────────
MANUAL_ENGINEERS = [
    {"Name": "Bradley Poole (CM16)", "Trade_Lookup__c": "Roofing"},
    {"Name": "Blerim Pacolli (NW6)", "Trade_Lookup__c": "Roofing"},
]


def map_trade_to_category(trade: str) -> str:
    if not trade:
        return 'N/A'
    trade_trimmed = trade.strip()
    excluded_trades = ['Vent Hygiene', 'vent hygiene', 'Key', 'key', 'Utilities',
                       'utilities', 'PM', 'pm', 'Test Ops', 'test ops']
    if trade_trimmed in excluded_trades:
        return 'EXCLUDED'
    if trade_trimmed in TRADE_TO_CATEGORY:
        return TRADE_TO_CATEGORY[trade_trimmed]
    for key, value in TRADE_TO_CATEGORY.items():
        if key.lower() == trade_trimmed.lower():
            return value
    return trade_trimmed


# ─── Router + Services ────────────────────────────────────────────────────────

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


# ─── Main Dashboard Endpoint ──────────────────────────────────────────────────
# Engineer-first approach:
#   1. Fetch all 155 active engineers from ENGINEERS_SOQL
#   2. Batch-fetch all VCR forms for those engineers (by Current_Engineer_Assigned_to_Vehicle__r.Name)
#   3. For each engineer, find their latest VCR and classify as submitted/not submitted
#   No Vehicle_Allocation__c query used.

@router.get("/compliance/dashboard/all-allocated")
def get_compliance_dashboard_all_allocated():
    try:
        print(f"[VCR_DASHBOARD] Starting engineer-first VCR Compliance Dashboard")
        today = datetime.now(timezone.utc)

        # ── Step 1: Get all active engineers ──────────────────────────────────
        engineers_data = sf_service.execute_soql(ENGINEERS_SOQL)
        if not engineers_data:
            return {
                "totalAllocated": 0, "submittedCount": 0, "notSubmittedCount": 0,
                "submitted": [], "notSubmitted": [], "asOfDate": today.date().isoformat()
            }

        # Build engineer map: name → {category, raw}
        # MANUAL_ENGINEERS always overwrite Salesforce data (fix wrong trades)
        engineers_map = {}
        for engineer in engineers_data:
            eng_name  = (engineer.get("Name") or "").strip()
            raw_trade = engineer.get("Trade_Lookup__c", "")
            mapped    = map_trade_to_category(raw_trade)
            if not eng_name or mapped == 'EXCLUDED':
                continue
            engineers_map[eng_name] = {"category": mapped, "raw": raw_trade}

        # Apply manual overrides — always overwrite, never skip
        for override in MANUAL_ENGINEERS:
            override_name = (override.get("Name") or "").strip()
            if override_name:
                raw_trade = override.get("Trade_Lookup__c", "")
                engineers_map[override_name] = {
                    "category": map_trade_to_category(raw_trade),
                    "raw": raw_trade
                }

        total_engineers = len(engineers_map)
        print(f"[VCR_DASHBOARD] Loaded {total_engineers} engineers")

        # ── Step 2: Batch-fetch ALL VCR forms for these engineers ─────────────
        # We use Current_Engineer_Assigned_to_Vehicle__r.Name to match engineers.
        # Fetch last 200 days of VCRs to cover all overdue cases.
        vcr_records = sf_service.execute_soql("""
            SELECT Id, Vehicle__c, Vehicle__r.Name, Vehicle__r.Reg_No__c,
                   Current_Engineer_Assigned_to_Vehicle__r.Name,
                   CreatedDate, LastModifiedDate
            FROM Vehicle_Condition_Form__c
            WHERE CreatedDate = LAST_N_DAYS:200
            ORDER BY Current_Engineer_Assigned_to_Vehicle__r.Name, CreatedDate DESC
        """)

        # Build map: engineer_name → latest VCR record
        latest_vcr_by_engineer: dict = {}
        if vcr_records:
            for vcr in vcr_records:
                eng = (vcr.get("Current_Engineer_Assigned_to_Vehicle__r") or {}).get("Name", "")
                eng = (eng or "").strip()
                if eng and eng not in latest_vcr_by_engineer:
                    latest_vcr_by_engineer[eng] = vcr

        print(f"[VCR_DASHBOARD] Found VCRs for {len(latest_vcr_by_engineer)} engineers")

        # ── Step 3: Classify each engineer ───────────────────────────────────
        submitted_list    = []
        not_submitted_list = []

        for eng_name, trade_entry in engineers_map.items():
            mapped_trade = trade_entry["category"]
            raw_trade    = trade_entry["raw"]

            base = {
                "engineerName": eng_name,
                "trade":        mapped_trade,
                "rawTrade":     raw_trade,
                "vanName":      "N/A",
                "regNo":        "N/A",
                "vehicleId":    None,
            }

            vcr = latest_vcr_by_engineer.get(eng_name)

            if vcr:
                # Populate van info from VCR
                vehicle_name = (vcr.get("Vehicle__r") or {}).get("Name", "N/A")
                vehicle_reg  = (vcr.get("Vehicle__r") or {}).get("Reg_No__c", "N/A") or "N/A"
                vehicle_id   = vcr.get("Vehicle__c")
                vcr_date     = parse_salesforce_datetime(vcr.get("CreatedDate"))

                if vcr_date:
                    days_since = (today - vcr_date).days
                    record = {
                        **base,
                        "vehicleId":    vehicle_id,
                        "vanName":      vehicle_name,
                        "regNo":        vehicle_reg,
                        "latestVcrDate": vcr_date.date().isoformat(),
                        "daysSince":    days_since,
                    }
                    if days_since <= 14:
                        submitted_list.append({**record, "status": "Submitted"})
                    else:
                        not_submitted_list.append({**record, "status": "Overdue"})
                else:
                    # VCR exists but date unparseable — treat as missing
                    not_submitted_list.append({
                        **base, "latestVcrDate": None,
                        "daysSince": None, "status": "Missing"
                    })
            else:
                # No VCR found at all for this engineer
                not_submitted_list.append({
                    **base, "latestVcrDate": None,
                    "daysSince": None, "status": "Missing"
                })

        print(f"[VCR_DASHBOARD] Submitted: {len(submitted_list)} | Not submitted: {len(not_submitted_list)}")

        return {
            "totalAllocated":    total_engineers,
            "submittedCount":    len(submitted_list),
            "notSubmittedCount": len(not_submitted_list),
            "submitted":         submitted_list,
            "notSubmitted":      not_submitted_list,
            "asOfDate":          today.date().isoformat()
        }

    except Exception as e:
        print(f"[VCR_DASHBOARD] [ERROR] {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Engineers Endpoint ───────────────────────────────────────────────────────

@router.get("/engineers")
def get_engineers_with_trades():
    try:
        results = sf_service.execute_soql(ENGINEERS_SOQL)
        if not results:
            return {"engineers": []}

        engineers  = []
        seen_names = set()

        for r in results:
            eng_name  = (r.get("Name") or "").strip()
            raw_trade = r.get("Trade_Lookup__c", "")
            mapped    = map_trade_to_category(raw_trade)
            if mapped == 'EXCLUDED' or not eng_name or eng_name in seen_names:
                continue
            seen_names.add(eng_name)
            engineers.append({
                "name":     eng_name,
                "trade":    mapped,
                "rawTrade": raw_trade,
            })

        # Apply manual overrides — replace existing entries
        for override in MANUAL_ENGINEERS:
            override_name = (override.get("Name") or "").strip()
            if not override_name:
                continue
            raw_trade = override.get("Trade_Lookup__c", "")
            override_entry = {
                "name":     override_name,
                "trade":    map_trade_to_category(raw_trade),
                "rawTrade": raw_trade,
            }
            replaced = False
            for i, eng in enumerate(engineers):
                if eng["name"] == override_name:
                    engineers[i] = override_entry
                    replaced = True
                    break
            if not replaced:
                engineers.append(override_entry)
                seen_names.add(override_name)

        engineers.sort(key=lambda e: e["name"])
        print(f"[ENGINEERS] Returning {len(engineers)} engineers")
        return {"engineers": engineers}

    except Exception as e:
        print(f"[ENGINEERS] [ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── VCR Submission Status (single vehicle check) ────────────────────────────

@router.get("/submission-status/{vehicle_input}")
def check_vcr_submission_status(vehicle_input: str):
    try:
        vehicle_result = sf_service.execute_soql(f"""
            SELECT Id, Name, Van_Number__c, Reg_No__c FROM Vehicle__c
            WHERE Name = '{vehicle_input}' OR Reg_No__c = '{vehicle_input}'
               OR Van_Number__c = '{vehicle_input}' LIMIT 1
        """)
        if not vehicle_result:
            raise HTTPException(status_code=404, detail=f"Vehicle not found: {vehicle_input}")

        vehicle_data = vehicle_result[0]
        vehicle_id   = vehicle_data["Id"]
        vehicle_name = vehicle_data.get("Name", vehicle_input)

        allocation_result = sf_service.execute_soql(f"""
            SELECT Start_date__c, Service_Resource__r.Name FROM Vehicle_Allocation__c
            WHERE Vehicle__c = '{vehicle_id}' ORDER BY Start_date__c DESC LIMIT 1
        """)
        if not allocation_result:
            raise HTTPException(status_code=404, detail=f"No allocation found for vehicle: {vehicle_name}")

        allocation_data      = allocation_result[0]
        allocation_start_str = allocation_data.get("Start_date__c")
        engineer_name        = (allocation_data.get("Service_Resource__r") or {}).get("Name", "Unassigned")
        allocation_start_date = parse_salesforce_datetime(allocation_start_str)
        if not allocation_start_date:
            raise HTTPException(status_code=500, detail="Failed to parse allocation start date")

        vcr_result = sf_service.execute_soql(f"""
            SELECT Id, Name, LastModifiedDate, LastModifiedBy.Name, CreatedDate, CreatedBy.Name
            FROM Vehicle_Condition_Form__c WHERE Vehicle__c = '{vehicle_id}'
            ORDER BY LastModifiedDate DESC LIMIT 1
        """)
        if not vcr_result:
            return {
                "vehicle": vehicle_name, "engineer": engineer_name,
                "allocation_start_date": allocation_start_date.date().isoformat(),
                "latest_vcr_id": None, "latest_vcr_last_modified_date": None,
                "latest_vcr_last_modified_by": None, "submitted": False,
                "flag": "RED", "reason": "No VCR exists"
            }

        vcr_data             = vcr_result[0]
        vcr_id               = vcr_data.get("Id")
        vcr_last_modified_by = (vcr_data.get("LastModifiedBy") or {}).get("Name", "Unknown")
        last_modified_date   = parse_salesforce_datetime(vcr_data.get("LastModifiedDate"))
        if not last_modified_date:
            raise HTTPException(status_code=500, detail="Failed to parse VCR last modified date")

        window_start     = allocation_start_date - timedelta(days=14)
        window_end       = allocation_start_date + timedelta(days=14)
        is_within_window = window_start <= last_modified_date <= window_end

        return {
            "vehicle": vehicle_name, "engineer": engineer_name,
            "allocation_start_date": allocation_start_date.date().isoformat(),
            "latest_vcr_id": vcr_id,
            "latest_vcr_last_modified_date": last_modified_date.date().isoformat(),
            "latest_vcr_last_modified_by": vcr_last_modified_by,
            "submitted": is_within_window,
            "flag": "GREEN" if is_within_window else "RED"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Search VCR by Van ────────────────────────────────────────────────────────

@router.get("/compliance/search/{van_number_or_reg}")
def search_vcr_by_van(van_number_or_reg: str):
    try:
        vehicle_result = sf_service.execute_soql(f"""
            SELECT Id, Name, Van_Number__c, Reg_No__c FROM Vehicle__c
            WHERE Name = '{van_number_or_reg}' OR Van_Number__c = '{van_number_or_reg}'
               OR Reg_No__c = '{van_number_or_reg}' LIMIT 1
        """)
        if not vehicle_result:
            raise HTTPException(status_code=404, detail="Vehicle not found")

        vehicle      = vehicle_result[0]
        vehicle_id   = vehicle["Id"]
        vehicle_name = vehicle.get("Name", van_number_or_reg)

        vcr_result = sf_service.execute_soql(f"""
            SELECT Id, Name, Current_Engineer_Assigned_to_Vehicle__r.Name,
                   CreatedDate, LastModifiedDate, Description__c
            FROM Vehicle_Condition_Form__c
            WHERE Vehicle__c = '{vehicle_id}' ORDER BY CreatedDate DESC LIMIT 1
        """)
        if not vcr_result:
            return {"vehicle": vehicle_name, "latestVcr": None, "images": []}

        vcr    = vcr_result[0]
        vcr_id = vcr["Id"]

        doc_links = sf_service.execute_soql(f"""
            SELECT ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId = '{vcr_id}'
        """)
        images = []
        if doc_links:
            doc_ids_str = "', '".join(link["ContentDocumentId"] for link in doc_links)
            image_results = sf_service.execute_soql(f"""
                SELECT Id, Title, FileExtension, ContentSize FROM ContentVersion
                WHERE ContentDocumentId IN ('{doc_ids_str}') AND IsLatest = true
            """)
            if image_results:
                for img in image_results:
                    images.append({
                        "id": img["Id"], "title": img.get("Title", "Image"),
                        "fileExtension": img.get("FileExtension", ""),
                        "imageUrl": f"/api/vehicle-condition/image/{img['Id']}"
                    })

        return {
            "vehicle": vehicle_name,
            "latestVcr": {
                "id": vcr_id, "name": vcr.get("Name"),
                "createdDate": vcr.get("CreatedDate"),
                "engineer": (vcr.get("Current_Engineer_Assigned_to_Vehicle__r") or {}).get("Name", "Unknown"),
                "description": vcr.get("Description__c")
            },
            "images": images
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Image Proxy ──────────────────────────────────────────────────────────────

@router.get("/image/{version_id}")
async def proxy_image(version_id: str):
    if sf_service.mock_mode or not sf_service.sf:
        raise HTTPException(status_code=503, detail="Salesforce not connected")

    access_token = sf_service.sf.session_id
    instance_url = f"https://{sf_service.sf.sf_instance}"
    rest_url     = f"{instance_url}/services/data/v60.0/sobjects/ContentVersion/{version_id}/VersionData"

    try:
        client   = await get_http_client()
        response = await client.get(
            rest_url, headers={"Authorization": f"Bearer {access_token}"}, timeout=30.0
        )
        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="Salesforce token expired")
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Image not found: {version_id}")
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"HTTP {response.status_code}")
        if len(response.content) == 0:
            raise HTTPException(status_code=500, detail="Empty image")

        content_type = response.headers.get("content-type", "image/jpeg")
        if "text/html" in content_type or "text/plain" in content_type:
            raise HTTPException(status_code=403, detail="Got HTML instead of image")

        return Response(
            content=response.content, media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=86400",
                "Access-Control-Allow-Origin": "*",
                "Content-Length": str(len(response.content))
            }
        )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Single Form with Images ──────────────────────────────────────────────────

@router.get("/form/{form_id}")
def get_single_form_with_images(form_id: str):
    form_result = sf_service.execute_soql(f"""
        SELECT Id, Name, Owner.Name, Description__c,
               Current_Engineer_Assigned_to_Vehicle__r.Name, Inspection_Result__c, CreatedDate
        FROM Vehicle_Condition_Form__c WHERE Id = '{form_id}' LIMIT 1
    """)
    if not form_result:
        raise HTTPException(status_code=404, detail="Form not found")

    doc_link_result = sf_service.execute_soql(f"""
        SELECT ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId = '{form_id}'
    """)
    images = []
    if doc_link_result:
        doc_ids_str = "', '".join(r["ContentDocumentId"] for r in doc_link_result)
        for img in sf_service.execute_soql(f"""
            SELECT Id, Title, ContentDocumentId FROM ContentVersion
            WHERE ContentDocumentId IN ('{doc_ids_str}') AND IsLatest = true
        """):
            images.append({
                "id": img["Id"], "title": img.get("Title", "Image"),
                "url": f"/api/vehicle-condition/image/{img['Id']}"
            })
    return {"form": form_result[0], "images": images}


# ─── AI Image Analysis ────────────────────────────────────────────────────────

@router.get("/ai-analyse/{form_id}")
async def ai_analyse_vcr_images(form_id: str):
    try:
        form_result = sf_service.execute_soql(f"""
            SELECT Id, Name, Vehicle__r.Name, Vehicle__r.Reg_No__c,
                   Current_Engineer_Assigned_to_Vehicle__r.Name, CreatedDate
            FROM Vehicle_Condition_Form__c WHERE Id = '{form_id}' LIMIT 1
        """)
        if not form_result:
            raise HTTPException(status_code=404, detail=f"VCR Form not found: {form_id}")

        form_data     = form_result[0]
        vehicle_name  = (form_data.get("Vehicle__r") or {}).get("Name", "Unknown Vehicle")
        reg_no        = (form_data.get("Vehicle__r") or {}).get("Reg_No__c", "Unknown Reg")
        engineer_name = (form_data.get("Current_Engineer_Assigned_to_Vehicle__r") or {}).get("Name", "Unknown Engineer")

        doc_links = sf_service.execute_soql(f"""
            SELECT ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId = '{form_id}'
        """)
        if not doc_links:
            return {
                "form_id": form_id, "vehicle": vehicle_name, "reg_no": reg_no,
                "engineer": engineer_name, "analysed_at": datetime.now(timezone.utc).date().isoformat(),
                "total_images": 0, "overall_fleet_status": "AMBER", "reports": [],
                "message": "No images found for this VCR form"
            }

        doc_ids_str   = "', '".join(link["ContentDocumentId"] for link in doc_links)
        image_records = sf_service.execute_soql(f"""
            SELECT Id, Title, FileExtension, ContentSize FROM ContentVersion
            WHERE ContentDocumentId IN ('{doc_ids_str}') AND IsLatest = true
        """)
        if not image_records:
            raise HTTPException(status_code=404, detail="No image versions found")

        if sf_service.mock_mode or not sf_service.sf:
            raise HTTPException(status_code=503, detail="Salesforce not connected")

        access_token = sf_service.sf.session_id
        instance_url = f"https://{sf_service.sf.sf_instance}"
        http_client  = await get_http_client()
        mime_map = {
            "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
            "gif": "image/gif",  "webp": "image/webp", "heic": "image/heic"
        }
        images_for_ai = []

        for img in image_records:
            version_id   = img["Id"]
            image_title  = img.get("Title", "Unknown")
            content_type = mime_map.get(img.get("FileExtension", "jpg").lower(), "image/jpeg")
            try:
                response = await http_client.get(
                    f"{instance_url}/services/data/v60.0/sobjects/ContentVersion/{version_id}/VersionData",
                    headers={"Authorization": f"Bearer {access_token}"}, timeout=30.0
                )
                if response.status_code != 200 or len(response.content) == 0:
                    continue
                images_for_ai.append({
                    "title":        image_title,
                    "base64":       base64.b64encode(response.content).decode("utf-8"),
                    "content_type": content_type
                })
            except Exception as e:
                print(f"[VCR_AI] Failed to download {image_title}: {e}")

        if not images_for_ai:
            raise HTTPException(status_code=500, detail="All image downloads failed")

        reports    = groq_service.analyse_vehicle_images(
            images=images_for_ai, engineer_name=engineer_name,
            vehicle_name=vehicle_name, reg_no=reg_no
        )
        conditions     = [r.get("overall_condition", "AMBER") for r in reports]
        overall_status = "RED" if "RED" in conditions else "AMBER" if "AMBER" in conditions else "GREEN"

        return {
            "form_id": form_id, "vehicle": vehicle_name, "reg_no": reg_no,
            "engineer": engineer_name,
            "analysed_at": datetime.now(timezone.utc).date().isoformat(),
            "total_images": len(images_for_ai),
            "overall_fleet_status": overall_status,
            "reports": reports
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[VCR_AI] [ERROR] {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Vehicle Forms List ───────────────────────────────────────────────────────

@router.get("/{vehicle_number}")
def get_vehicle_condition_forms(vehicle_number: str):
    vehicle_result = sf_service.execute_soql(f"""
        SELECT Id, Name FROM Vehicle__c
        WHERE Name = '{vehicle_number}' OR Reg_No__c = '{vehicle_number}'
           OR Van_Number__c = '{vehicle_number}' LIMIT 1
    """)
    if not vehicle_result:
        return {"message": "Vehicle not found"}
    vehicle_id = vehicle_result[0]["Id"]
    forms = sf_service.execute_soql(f"""
        SELECT Id, Name, CreatedDate FROM Vehicle_Condition_Form__c
        WHERE Vehicle__c = '{vehicle_id}' ORDER BY CreatedDate DESC
    """)
    if not forms:
        return {"vehicle": vehicle_number, "forms_count": 0, "forms": []}
    return {"vehicle": vehicle_number, "forms_count": len(forms), "forms": forms}


# ─── Dashboard Summary ────────────────────────────────────────────────────────

@router.get("/dashboard/summary")
def get_vehicle_condition_dashboard():
    try:
        total_vcr_result = sf_service.execute_soql("""
            SELECT COUNT(Id) cnt FROM Vehicle_Condition_Form__c
            WHERE CreatedDate = LAST_N_DAYS:14
        """)
        total_vcr = total_vcr_result[0]['cnt'] if total_vcr_result else 0

        with_images_result = sf_service.execute_soql("""
            SELECT COUNT_DISTINCT(LinkedEntityId) cnt FROM ContentDocumentLink
            WHERE LinkedEntityId IN (
                SELECT Id FROM Vehicle_Condition_Form__c WHERE CreatedDate = LAST_N_DAYS:14
            )
        """)
        with_images    = with_images_result[0]['cnt'] if with_images_result else 0
        without_images = total_vcr - with_images

        all_vcr = sf_service.execute_soql("""
            SELECT Id, Name, Vehicle__r.Name, Current_Engineer_Assigned_to_Vehicle__r.Name
            FROM Vehicle_Condition_Form__c WHERE CreatedDate = LAST_N_DAYS:14
            ORDER BY CreatedDate DESC
        """)
        image_ids_result = sf_service.execute_soql("""
            SELECT LinkedEntityId FROM ContentDocumentLink
            WHERE LinkedEntityId IN (
                SELECT Id FROM Vehicle_Condition_Form__c WHERE CreatedDate = LAST_N_DAYS:14
            )
        """)
        image_id_set       = {rec['LinkedEntityId'] for rec in image_ids_result} if image_ids_result else set()
        with_image_list    = []
        without_image_list = []

        for vcr in (all_vcr or []):
            record_data = {
                "form_id":   vcr['Id'],
                "form_name": vcr['Name'],
                "engineer":  (vcr.get('Current_Engineer_Assigned_to_Vehicle__r') or {}).get('Name', 'Unassigned'),
                "van":       (vcr.get('Vehicle__r') or {}).get('Name', 'Unknown')
            }
            (with_image_list if vcr['Id'] in image_id_set else without_image_list).append(record_data)

        return {
            "summary": {
                "total_vcr": total_vcr, "with_images": with_images,
                "without_images": without_images, "period": "Last 14 Days"
            },
            "with_images_list":    {"count": len(with_image_list),    "status": "GREEN", "records": with_image_list},
            "without_images_list": {"count": len(without_image_list), "status": "RED",   "records": without_image_list}
        }
    except Exception as e:
        print(f"[DASHBOARD] [ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))