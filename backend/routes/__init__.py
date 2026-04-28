# Routes package
"""
vehicle_condition_router.py

Salesforce  → legacy dashboard, compliance, image proxy (unchanged)
Firebase    → new read endpoints: /firebase/dashboard, /firebase/vcr/{id}, /firebase/van/{van}
Both sources are kept; nothing Salesforce-related is removed.
"""

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

# ── NEW: Firebase read helpers ─────────────────────────────────────────────────
from .firebase_service import (
    get_all_vcrs_from_firebase,
    get_latest_vcr_for_engineer,
    get_latest_vcr_by_van,
    get_vcr_by_id,
    get_vcrs_for_van,
)

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

EXCLUDED_TRADES = {
    'Vent Hygiene', 'vent hygiene', 'Key', 'key',
    'Utilities', 'utilities', 'PM', 'pm', 'Test Ops', 'test ops',
}

MANUAL_ENGINEERS = [
    {"Name": "Bradley Poole (CM16)",  "Trade_Lookup__c": "Roofing",    "Trade_Group_Postcode__c": "Roofing"},
    {"Name": "Blerim Pacolli (NW6)",  "Trade_Lookup__c": "Roofing",    "Trade_Group_Postcode__c": "Roofing"},
    {"Name": "Peter Mulligan (W11)",  "Trade_Lookup__c": "Electrical", "Trade_Group_Postcode__c": "Electrical N"},
    {"Name": "Jyrgen Kola (E8)",      "Trade_Lookup__c": "Electrical", "Trade_Group_Postcode__c": "Electrical N"},
    {"Name": "Lewis Blackman (CO15)", "Trade_Lookup__c": "Electrical", "Trade_Group_Postcode__c": "Electrical N"},
]

MANUAL_ALLOCATIONS = [
    {"Service_Resource__r": {"Name": "Peter Mulligan (W11)"},  "Vehicle__r": {"Van_Number__c": "Not Assigned", "Reg_No__c": "N/A"}},
    {"Service_Resource__r": {"Name": "Jyrgen Kola (E8)"},      "Vehicle__r": {"Van_Number__c": "408",          "Reg_No__c": "N/A"}},
    {"Service_Resource__r": {"Name": "Lewis Blackman (CO15)"}, "Vehicle__r": {"Van_Number__c": "Not Assigned", "Reg_No__c": "N/A"}},
]

# ─── SOQL Queries (unchanged) ─────────────────────────────────────────────────

ACTIVE_ALLOCATIONS_SOQL = """
    SELECT Id, Vehicle__c, Vehicle__r.Name, Vehicle__r.Van_Number__c,
           Vehicle__r.Reg_No__c, Service_Resource__c, Service_Resource__r.Name,
           Start_date__c, End_date__c
    FROM Vehicle_Allocation__c
    WHERE Start_date__c <= TODAY
      AND (End_date__c = NULL OR End_date__c >= TODAY)
      AND Service_Resource__r.Name != 'Test Engineer'
      AND Service_Resource__r.Name != 'Mariia Test Engineer'
"""

ENGINEERS_SOQL = """
    SELECT Name, Trade_Lookup__c, Trade_Group_Postcode__c
    FROM ServiceResource
    WHERE Is_User_Active__c = true AND IsActive = true
      AND Trade_Lookup__c != null AND FSM__c = false
      AND Account.Chumley_Test_Record__c = false
      AND RelatedRecord.Profile_Name__c = 'Engineer Partner Community'
      AND Trade_Lookup__c NOT IN ('Key', 'Utilities', 'PM', 'Test Ops', 'Vent Hygiene')
    ORDER BY Name
"""

ALL_ALLOCATIONS_SOQL = """
    SELECT Id, Vehicle__c, Vehicle__r.Name, Vehicle__r.Van_Number__c,
           Vehicle__r.Reg_No__c, Service_Resource__c, Service_Resource__r.Name,
           Start_date__c, End_date__c
    FROM Vehicle_Allocation__c
    WHERE Service_Resource__r.Name != null AND Vehicle__c != null
      AND Service_Resource__r.Name != 'Test Engineer'
      AND Service_Resource__r.Name != 'Mariia Test Engineer'
    ORDER BY Service_Resource__r.Name, Start_date__c DESC
"""


def map_trade_to_category(trade: str) -> str:
    if not trade:
        return "N/A"
    t = trade.strip()
    if t in EXCLUDED_TRADES:
        return "EXCLUDED"
    if t in TRADE_TO_CATEGORY:
        return TRADE_TO_CATEGORY[t]
    for key, value in TRADE_TO_CATEGORY.items():
        if key.lower() == t.lower():
            return value
    return t


def extract_van_name(alloc: dict) -> str:
    v = alloc.get("Vehicle__r") or {}
    return v.get("Van_Number__c") or v.get("Name") or "N/A"


# ─── Router + Services ────────────────────────────────────────────────────────

router       = APIRouter(prefix="/api/vehicle-condition", tags=["vehicle_condition"])
sf_service   = SalesforceService()
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


def parse_salesforce_datetime(date_str: str) -> datetime | None:
    if not date_str:
        return None
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception as e:
        print(f"[PARSE] Error: {date_str} → {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# FIREBASE READ ENDPOINTS  (new — these pull from Firestore vcr_reports)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/firebase/dashboard")
def firebase_vcr_dashboard():
    """
    Firebase-backed VCR compliance dashboard.
    Same shape as the Salesforce dashboard so the frontend can swap sources.

    Returns submitted (≤14 days) and not-submitted (>14 days or missing) lists
    built entirely from Firestore `vcr_reports` collection.
    """
    try:
        print("[FB_DASHBOARD] Starting Firebase VCR dashboard …")
        today = datetime.utcnow()
        cutoff_days = 14

        all_vcrs = get_all_vcrs_from_firebase(days=200)
        print(f"[FB_DASHBOARD] Total VCRs from Firebase: {len(all_vcrs)}")

        # Index latest VCR per engineer and per van
        latest_by_engineer: dict[str, dict] = {}
        latest_by_van:      dict[str, dict] = {}

        for vcr in all_vcrs:
            eng = (vcr.get("engineer_name") or "").strip()
            van = (vcr.get("van_number") or "").strip()

            if eng and eng not in latest_by_engineer:
                latest_by_engineer[eng] = vcr
            if van and van not in latest_by_van:
                latest_by_van[van] = vcr

        submitted_list:     list = []
        not_submitted_list: list = []

        # Build per-engineer status rows
        for eng_name, vcr in latest_by_engineer.items():
            created_raw = vcr.get("created_at")
            created_dt  = None
            if created_raw:
                try:
                    created_dt = datetime.fromisoformat(str(created_raw))
                except Exception:
                    pass

            base = {
                "engineerName":  eng_name,
                "vanName":       vcr.get("van_number") or "N/A",
                "vehicleId":     vcr.get("vehicle_id") or None,
                "vcrId":         vcr.get("id"),
                "description":   vcr.get("description", ""),
                "photoCount":    len(vcr.get("photos") or []),
                "source":        "firebase",
            }

            if created_dt:
                days_since = (today - created_dt).days
                record = {
                    **base,
                    "latestVcrDate": created_dt.date().isoformat(),
                    "daysSince":     days_since,
                }
                if days_since <= cutoff_days:
                    submitted_list.append({**record, "status": "Submitted"})
                else:
                    not_submitted_list.append({**record, "status": "Overdue"})
            else:
                not_submitted_list.append(
                    {**base, "latestVcrDate": None, "daysSince": None, "status": "Missing"}
                )

        total = len(submitted_list) + len(not_submitted_list)
        print(f"[FB_DASHBOARD] Done — {len(submitted_list)} submitted, {len(not_submitted_list)} not submitted")

        return {
            "totalAllocated":    total,
            "submittedCount":    len(submitted_list),
            "notSubmittedCount": len(not_submitted_list),
            "submitted":         submitted_list,
            "notSubmitted":      not_submitted_list,
            "asOfDate":          today.date().isoformat(),
            "source":            "firebase",
        }

    except Exception as e:
        print(f"[FB_DASHBOARD] ERROR: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/firebase/vcr/{vcr_id}")
def firebase_get_vcr(vcr_id: str):
    """Return a single VCR record from Firebase by its document ID."""
    vcr = get_vcr_by_id(vcr_id)
    if not vcr:
        raise HTTPException(status_code=404, detail=f"VCR not found: {vcr_id}")
    return vcr


@router.get("/firebase/van/{van_number}")
def firebase_vcrs_for_van(van_number: str, limit: int = 20):
    """Return all VCRs submitted for a specific van (newest first)."""
    records = get_vcrs_for_van(van_number, limit=limit)
    return {
        "van_number": van_number,
        "count":      len(records),
        "vcrs":       records,
    }


@router.get("/firebase/engineer/{engineer_name}")
def firebase_latest_vcr_for_engineer(engineer_name: str):
    """Return the latest VCR submitted by a specific engineer."""
    vcr = get_latest_vcr_for_engineer(engineer_name)
    if not vcr:
        raise HTTPException(status_code=404, detail=f"No VCR found for engineer: {engineer_name}")
    return vcr


@router.get("/firebase/all")
def firebase_all_vcrs(days: int = 30):
    """
    Return all raw VCR records from Firebase for the last `days` days.
    Useful for the asset management view / table.
    """
    try:
        records = get_all_vcrs_from_firebase(days=days)
        return {
            "count":   len(records),
            "days":    days,
            "records": records,
            "source":  "firebase",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# EXISTING SALESFORCE ENDPOINTS (100% unchanged below this line)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/debug/allocation/{engineer_name}")
def debug_allocation(engineer_name: str):
    try:
        safe_name = engineer_name.replace("'", "\\'")
        result = sf_service.execute_soql(f"""
            SELECT Id, Vehicle__c, Vehicle__r.Name, Vehicle__r.Van_Number__c,
                   Vehicle__r.Reg_No__c, Service_Resource__r.Name,
                   Start_date__c, End_date__c
            FROM Vehicle_Allocation__c
            WHERE Service_Resource__r.Name = '{safe_name}'
            ORDER BY Start_date__c DESC LIMIT 5
        """)
        return {
            "engineer":         engineer_name,
            "allocation_count": len(result) if result else 0,
            "allocations":      result or [],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compliance/dashboard/all-allocated")
def get_compliance_dashboard_all_allocated():
    try:
        print("[VCR_DASHBOARD] ── Starting dashboard ──")
        today = datetime.now(timezone.utc)

        active_alloc_records = sf_service.execute_soql(ACTIVE_ALLOCATIONS_SOQL) or []
        print(f"[VCR_DASHBOARD] Active allocation rows: {len(active_alloc_records)}")

        alloc_by_engineer: dict = {}
        for alloc in active_alloc_records:
            eng = ((alloc.get("Service_Resource__r") or {}).get("Name") or "").strip()
            vid = (alloc.get("Vehicle__c") or "").strip()
            if not eng or not vid:
                continue
            if eng not in alloc_by_engineer:
                alloc_by_engineer[eng] = {
                    "vehicleId": vid,
                    "vanName":   extract_van_name(alloc),
                    "regNo":     (alloc.get("Vehicle__r") or {}).get("Reg_No__c") or "N/A",
                    "active":    True,
                }

        all_alloc_records = sf_service.execute_soql(ALL_ALLOCATIONS_SOQL) or []
        fallback_alloc: dict = {}
        for alloc in all_alloc_records:
            eng = ((alloc.get("Service_Resource__r") or {}).get("Name") or "").strip()
            vid = (alloc.get("Vehicle__c") or "").strip()
            if not eng or not vid:
                continue
            if eng not in fallback_alloc:
                fallback_alloc[eng] = {
                    "vehicleId": vid,
                    "vanName":   extract_van_name(alloc),
                    "regNo":     (alloc.get("Vehicle__r") or {}).get("Reg_No__c") or "N/A",
                    "active":    False,
                }

        for manual_alloc in MANUAL_ALLOCATIONS:
            eng = ((manual_alloc.get("Service_Resource__r") or {}).get("Name") or "").strip()
            if eng and eng not in fallback_alloc:
                vehicle = manual_alloc.get("Vehicle__r") or {}
                fallback_alloc[eng] = {
                    "vehicleId": f"manual-{eng}",
                    "vanName":   vehicle.get("Van_Number__c", "N/A"),
                    "regNo":     vehicle.get("Reg_No__c", "N/A"),
                    "active":    False,
                }

        trade_records = sf_service.execute_soql(ENGINEERS_SOQL) or []
        trade_map: dict = {}
        for r in trade_records:
            name    = (r.get("Name") or "").strip()
            raw     = r.get("Trade_Lookup__c", "")
            loc_grp = (r.get("Trade_Group_Postcode__c") or "").strip()
            cat     = map_trade_to_category(raw)
            if name and cat != "EXCLUDED":
                trade_map[name] = {"category": cat, "raw": raw, "locationGroup": loc_grp}

        for override in MANUAL_ENGINEERS:
            name = (override.get("Name") or "").strip()
            if name:
                raw     = override.get("Trade_Lookup__c", "")
                loc_grp = (override.get("Trade_Group_Postcode__c") or "").strip()
                trade_map[name] = {
                    "category":      map_trade_to_category(raw),
                    "raw":           raw,
                    "locationGroup": loc_grp,
                }

        all_engineer_names: set = (
            set(fallback_alloc.keys()) |
            set(alloc_by_engineer.keys()) |
            set(trade_map.keys())
        )

        vcr_records = sf_service.execute_soql("""
            SELECT Id, Vehicle__c, Vehicle__r.Van_Number__c, Vehicle__r.Reg_No__c,
                   Current_Engineer_Assigned_to_Vehicle__r.Name,
                   CreatedDate, LastModifiedDate
            FROM Vehicle_Condition_Form__c
            WHERE CreatedDate = LAST_N_DAYS:200
            ORDER BY Vehicle__c, CreatedDate DESC
        """) or []

        latest_vcr_by_vehicle: dict = {}
        for vcr in vcr_records:
            vid = (vcr.get("Vehicle__c") or "").strip()
            if vid and vid not in latest_vcr_by_vehicle:
                latest_vcr_by_vehicle[vid] = vcr

        submitted_list:     list = []
        not_submitted_list: list = []

        for eng_name in all_engineer_names:
            trade_entry = trade_map.get(eng_name)
            if not trade_entry:
                base = eng_name.split("(")[0].split("+")[0].strip()
                trade_entry = trade_map.get(base)
            if not trade_entry:
                lower = eng_name.lower()
                for k, v in trade_map.items():
                    if k.lower() == lower:
                        trade_entry = v
                        break
            if not trade_entry:
                continue
            if trade_entry["category"] == "EXCLUDED":
                continue

            mapped_trade = trade_entry["category"]
            raw_trade    = trade_entry["raw"]
            location_grp = trade_entry.get("locationGroup", "")

            alloc_info = alloc_by_engineer.get(eng_name) or fallback_alloc.get(eng_name) or {}
            vehicle_id = alloc_info.get("vehicleId", "")
            van_name   = alloc_info.get("vanName",   "N/A")
            reg_no     = alloc_info.get("regNo",     "N/A")

            base_record = {
                "engineerName":  eng_name,
                "trade":         mapped_trade,
                "rawTrade":      raw_trade,
                "locationGroup": location_grp,
                "vanName":       van_name,
                "regNo":         reg_no,
                "vehicleId":     vehicle_id or None,
                "source":        "salesforce",
            }

            vcr = latest_vcr_by_vehicle.get(vehicle_id) if vehicle_id else None

            if vcr:
                vcr_date = parse_salesforce_datetime(vcr.get("CreatedDate"))
                if vcr_date:
                    days_since = (today - vcr_date).days
                    record = {
                        **base_record,
                        "latestVcrDate": vcr_date.date().isoformat(),
                        "daysSince":     days_since,
                    }
                    if days_since <= 14:
                        submitted_list.append({**record, "status": "Submitted"})
                    else:
                        not_submitted_list.append({**record, "status": "Overdue"})
                else:
                    not_submitted_list.append(
                        {**base_record, "latestVcrDate": None, "daysSince": None, "status": "Missing"}
                    )
            else:
                not_submitted_list.append(
                    {**base_record, "latestVcrDate": None, "daysSince": None, "status": "Missing"}
                )

        total = len(submitted_list) + len(not_submitted_list)
        print(f"[VCR_DASHBOARD] Done: {len(submitted_list)} submitted, {len(not_submitted_list)} not (total {total})")

        return {
            "totalAllocated":    total,
            "submittedCount":    len(submitted_list),
            "notSubmittedCount": len(not_submitted_list),
            "submitted":         submitted_list,
            "notSubmitted":      not_submitted_list,
            "asOfDate":          today.date().isoformat(),
            "source":            "salesforce",
        }

    except Exception as e:
        print(f"[VCR_DASHBOARD] [ERROR] {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/engineers")
def get_engineers_with_trades():
    try:
        results    = sf_service.execute_soql(ENGINEERS_SOQL)
        if not results:
            return {"engineers": []}

        engineers  = []
        seen_names = set()

        for r in results:
            eng_name  = (r.get("Name") or "").strip()
            raw_trade = r.get("Trade_Lookup__c", "")
            loc_grp   = (r.get("Trade_Group_Postcode__c") or "").strip()
            mapped    = map_trade_to_category(raw_trade)
            if mapped == "EXCLUDED" or not eng_name or eng_name in seen_names:
                continue
            seen_names.add(eng_name)
            engineers.append({"name": eng_name, "trade": mapped, "rawTrade": raw_trade, "locationGroup": loc_grp})

        for override in MANUAL_ENGINEERS:
            override_name = (override.get("Name") or "").strip()
            if not override_name:
                continue
            raw_trade     = override.get("Trade_Lookup__c", "")
            loc_grp       = (override.get("Trade_Group_Postcode__c") or "").strip()
            entry         = {"name": override_name, "trade": map_trade_to_category(raw_trade), "rawTrade": raw_trade, "locationGroup": loc_grp}
            replaced      = False
            for i, eng in enumerate(engineers):
                if eng["name"] == override_name:
                    engineers[i] = entry
                    replaced = True
                    break
            if not replaced:
                engineers.append(entry)
                seen_names.add(override_name)

        engineers.sort(key=lambda e: e["name"])
        return {"engineers": engineers}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
            WHERE Vehicle__c = '{vehicle_id}'
              AND Start_date__c <= TODAY
              AND (End_date__c = NULL OR End_date__c >= TODAY)
            ORDER BY Start_date__c DESC LIMIT 1
        """)
        if not allocation_result:
            raise HTTPException(status_code=404, detail=f"No active allocation for: {vehicle_name}")

        allocation_data       = allocation_result[0]
        engineer_name         = (allocation_data.get("Service_Resource__r") or {}).get("Name", "Unassigned")
        allocation_start_date = parse_salesforce_datetime(allocation_data.get("Start_date__c"))
        if not allocation_start_date:
            raise HTTPException(status_code=500, detail="Failed to parse allocation start date")

        vcr_result = sf_service.execute_soql(f"""
            SELECT Id, Name, LastModifiedDate, LastModifiedBy.Name, CreatedDate, CreatedBy.Name
            FROM Vehicle_Condition_Form__c
            WHERE Vehicle__c = '{vehicle_id}'
            ORDER BY LastModifiedDate DESC LIMIT 1
        """)
        if not vcr_result:
            return {
                "vehicle": vehicle_name, "engineer": engineer_name,
                "allocation_start_date": allocation_start_date.date().isoformat(),
                "latest_vcr_id": None, "latest_vcr_last_modified_date": None,
                "latest_vcr_last_modified_by": None,
                "submitted": False, "flag": "RED", "reason": "No VCR exists",
            }

        vcr_data             = vcr_result[0]
        vcr_id               = vcr_data.get("Id")
        vcr_last_modified_by = (vcr_data.get("LastModifiedBy") or {}).get("Name", "Unknown")
        last_modified_date   = parse_salesforce_datetime(vcr_data.get("LastModifiedDate"))
        if not last_modified_date:
            raise HTTPException(status_code=500, detail="Failed to parse VCR date")

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
            "flag": "GREEN" if is_within_window else "RED",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
            WHERE Vehicle__c = '{vehicle_id}'
            ORDER BY CreatedDate DESC LIMIT 1
        """)
        if not vcr_result:
            return {"vehicle": vehicle_name, "latestVcr": None, "images": []}

        vcr    = vcr_result[0]
        vcr_id = vcr["Id"]

        doc_links = sf_service.execute_soql(
            f"SELECT ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId = '{vcr_id}'"
        )
        images = []
        if doc_links:
            doc_ids_str   = "', '".join(link["ContentDocumentId"] for link in doc_links)
            image_results = sf_service.execute_soql(f"""
                SELECT Id, Title, FileExtension, ContentSize FROM ContentVersion
                WHERE ContentDocumentId IN ('{doc_ids_str}') AND IsLatest = true
            """)
            if image_results:
                for img in image_results:
                    images.append({
                        "id": img["Id"], "title": img.get("Title", "Image"),
                        "fileExtension": img.get("FileExtension", ""),
                        "imageUrl": f"/api/vehicle-condition/image/{img['Id']}",
                    })

        # Also pull photos stored in Firebase Storage
        # Try multiple identifiers because the form may store van_number differently
        import re as _re

        def _photos_from_firebase_vcr(fb_vcr: dict, idx_offset: int) -> list:
            result = []
            for idx, photo_url in enumerate(fb_vcr.get("photos") or []):
                path_part  = photo_url.split("?")[0]
                raw_name   = path_part.split("/")[-1]
                clean_name = _re.sub(r"^[0-9a-f]{32}_", "", raw_name)
                ext   = clean_name.rsplit(".", 1)[-1] if "." in clean_name else ""
                title = clean_name.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()
                result.append({
                    "id":            f"fb_{fb_vcr.get('id', '')}_{idx_offset + idx}",
                    "title":         title or f"Photo {idx_offset + idx + 1}",
                    "fileExtension": ext,
                    "imageUrl":      photo_url,
                })
            return result

        try:
            # Collect identifiers to try: what user typed + Salesforce Name + Van_Number__c + Reg_No__c
            sf_identifiers = [
                van_number_or_reg,
                vehicle.get("Name"),
                vehicle.get("Van_Number__c"),
                vehicle.get("Reg_No__c"),
            ]
            tried_ids = set()
            firebase_vcr = None
            for ident in sf_identifiers:
                if not ident or ident in tried_ids:
                    continue
                tried_ids.add(ident)
                fb = get_latest_vcr_by_van(ident)
                if fb and fb.get("photos"):
                    firebase_vcr = fb
                    break

            # Last resort: scan recent Firebase VCRs and find any with photos for this vehicle
            if not firebase_vcr:
                all_vcrs = get_all_vcrs_from_firebase(days=30)
                for fb in all_vcrs:
                    fb_van = (fb.get("van_number") or "").strip().upper()
                    for ident in tried_ids:
                        if ident and fb_van == ident.strip().upper() and fb.get("photos"):
                            firebase_vcr = fb
                            break
                    if firebase_vcr:
                        break

            if firebase_vcr:
                images.extend(_photos_from_firebase_vcr(firebase_vcr, len(images)))
        except Exception as _fb_err:
            print(f"[WARN] Firebase photo lookup failed: {_fb_err}")

        return {
            "vehicle": vehicle_name,
            "latestVcr": {
                "id": vcr_id, "name": vcr.get("Name"),
                "createdDate": vcr.get("CreatedDate"),
                "engineer": (vcr.get("Current_Engineer_Assigned_to_Vehicle__r") or {}).get("Name", "Unknown"),
                "description": vcr.get("Description__c"),
            },
            "images": images,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/firebase/debug/vcrs")
def debug_firebase_vcrs():
    """Temporary debug: shows all recent Firebase VCRs so you can see what van_number is stored."""
    try:
        vcrs = get_all_vcrs_from_firebase(days=60)
        return [
            {
                "id":           v.get("id"),
                "van_number":   v.get("van_number"),
                "engineer_name":v.get("engineer_name"),
                "created_at":   str(v.get("created_at")),
                "photo_count":  len(v.get("photos") or []),
                "photos":       (v.get("photos") or [])[:2],  # first 2 URLs as sample
            }
            for v in vcrs
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
            rest_url,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30.0,
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
            content=response.content,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=86400",
                "Access-Control-Allow-Origin": "*",
                "Content-Length": str(len(response.content)),
            },
        )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/form/{form_id}")
def get_single_form_with_images(form_id: str):
    form_result = sf_service.execute_soql(f"""
        SELECT Id, Name, Owner.Name, Description__c,
               Current_Engineer_Assigned_to_Vehicle__r.Name, Inspection_Result__c, CreatedDate
        FROM Vehicle_Condition_Form__c WHERE Id = '{form_id}' LIMIT 1
    """)
    if not form_result:
        raise HTTPException(status_code=404, detail="Form not found")

    doc_link_result = sf_service.execute_soql(
        f"SELECT ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId = '{form_id}'"
    )
    images = []
    if doc_link_result:
        doc_ids_str = "', '".join(r["ContentDocumentId"] for r in doc_link_result)
        for img in sf_service.execute_soql(f"""
            SELECT Id, Title, ContentDocumentId FROM ContentVersion
            WHERE ContentDocumentId IN ('{doc_ids_str}') AND IsLatest = true
        """):
            images.append({
                "id": img["Id"],
                "title": img.get("Title", "Image"),
                "url": f"/api/vehicle-condition/image/{img['Id']}",
            })
    return {"form": form_result[0], "images": images}


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

        doc_links = sf_service.execute_soql(
            f"SELECT ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId = '{form_id}'"
        )
        if not doc_links:
            return {
                "form_id": form_id, "vehicle": vehicle_name, "reg_no": reg_no,
                "engineer": engineer_name,
                "analysed_at": datetime.now(timezone.utc).date().isoformat(),
                "total_images": 0, "overall_fleet_status": "AMBER",
                "reports": [], "message": "No images found",
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

        access_token  = sf_service.sf.session_id
        instance_url  = f"https://{sf_service.sf.sf_instance}"
        http_client   = await get_http_client()
        mime_map      = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
                         "gif": "image/gif", "webp": "image/webp", "heic": "image/heic"}
        images_for_ai = []

        for img in image_records:
            version_id   = img["Id"]
            image_title  = img.get("Title", "Unknown")
            content_type = mime_map.get(img.get("FileExtension", "jpg").lower(), "image/jpeg")
            try:
                response = await http_client.get(
                    f"{instance_url}/services/data/v60.0/sobjects/ContentVersion/{version_id}/VersionData",
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=30.0,
                )
                if response.status_code != 200 or len(response.content) == 0:
                    continue
                images_for_ai.append({
                    "title":        image_title,
                    "base64":       base64.b64encode(response.content).decode("utf-8"),
                    "content_type": content_type,
                })
            except Exception as e:
                print(f"[VCR_AI] Failed to download {image_title}: {e}")

        if not images_for_ai:
            raise HTTPException(status_code=500, detail="All image downloads failed")

        reports        = groq_service.analyse_vehicle_images(
            images=images_for_ai, engineer_name=engineer_name,
            vehicle_name=vehicle_name, reg_no=reg_no,
        )
        conditions     = [r.get("overall_condition", "AMBER") for r in reports]
        overall_status = "RED" if "RED" in conditions else "AMBER" if "AMBER" in conditions else "GREEN"

        return {
            "form_id": form_id, "vehicle": vehicle_name, "reg_no": reg_no,
            "engineer": engineer_name,
            "analysed_at": datetime.now(timezone.utc).date().isoformat(),
            "total_images": len(images_for_ai),
            "overall_fleet_status": overall_status,
            "reports": reports,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[VCR_AI] [ERROR] {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


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


@router.get("/dashboard/summary")
def get_vehicle_condition_dashboard():
    try:
        total_vcr_result   = sf_service.execute_soql(
            "SELECT COUNT(Id) cnt FROM Vehicle_Condition_Form__c WHERE CreatedDate = LAST_N_DAYS:14"
        )
        total_vcr          = total_vcr_result[0]["cnt"] if total_vcr_result else 0
        with_images_result = sf_service.execute_soql(
            "SELECT COUNT_DISTINCT(LinkedEntityId) cnt FROM ContentDocumentLink "
            "WHERE LinkedEntityId IN (SELECT Id FROM Vehicle_Condition_Form__c WHERE CreatedDate = LAST_N_DAYS:14)"
        )
        with_images    = with_images_result[0]["cnt"] if with_images_result else 0
        without_images = total_vcr - with_images

        all_vcr          = sf_service.execute_soql(
            "SELECT Id, Name, Vehicle__r.Name, Current_Engineer_Assigned_to_Vehicle__r.Name "
            "FROM Vehicle_Condition_Form__c WHERE CreatedDate = LAST_N_DAYS:14 ORDER BY CreatedDate DESC"
        ) or []
        image_ids_result = sf_service.execute_soql(
            "SELECT LinkedEntityId FROM ContentDocumentLink "
            "WHERE LinkedEntityId IN (SELECT Id FROM Vehicle_Condition_Form__c WHERE CreatedDate = LAST_N_DAYS:14)"
        ) or []
        image_id_set     = {rec["LinkedEntityId"] for rec in image_ids_result}

        with_image_list, without_image_list = [], []
        for vcr in all_vcr:
            rd = {
                "form_id":   vcr["Id"],
                "form_name": vcr["Name"],
                "engineer":  (vcr.get("Current_Engineer_Assigned_to_Vehicle__r") or {}).get("Name", "Unassigned"),
                "van":       (vcr.get("Vehicle__r") or {}).get("Name", "Unknown"),
            }
            (with_image_list if vcr["Id"] in image_id_set else without_image_list).append(rd)

        return {
            "summary": {
                "total_vcr": total_vcr, "with_images": with_images,
                "without_images": without_images, "period": "Last 14 Days",
            },
            "with_images_list":    {"count": len(with_image_list),    "status": "GREEN", "records": with_image_list},
            "without_images_list": {"count": len(without_image_list), "status": "RED",   "records": without_image_list},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))