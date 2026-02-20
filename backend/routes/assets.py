"""
assets.py — FIXES:
1. /api/assets/allocation/update NO LONGER sends Contact_Number__c to Salesforce
   (field is read-only in their org — INVALID_FIELD_FOR_INSERT_UPDATE)
   Only Service_Resource__c, Start_date__c, End_date__c are updated.
2. /api/assets/engineers returns engineers + their most recent contact number
   from allocation history (for display only in frontend).
3. Fallback engineer list from allocation history if ServiceResource query fails.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import sys
import os
import json
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from salesforce_service import SalesforceService

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    print("[WARNING] Groq not available - AI insights will be disabled")

router = APIRouter(prefix="/api/assets", tags=["assets"])


# ─── Models ───────────────────────────────────────────────────────────────────

class VehicleAsset(BaseModel):
    van_number: str
    registration_number: str
    tracking_number: str
    vehicle_name: str
    driver_history: str
    vehicle_type: str
    description: str
    ai_details: str = ""
    image_data: str = ""


class UpdateAllocationRequest(BaseModel):
    allocation_id: str
    service_resource_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    # contact_number intentionally NOT included — field is read-only in Salesforce


class CreateAllocationRequest(BaseModel):
    vehicle_id: str
    service_resource_id: str
    start_date: str
    # contact_number intentionally NOT included — field is read-only in Salesforce


# ─── AI helpers ───────────────────────────────────────────────────────────────

def generate_ai_description(vehicle_data: dict, allocation_history: list) -> str:
    if not GROQ_AVAILABLE:
        return None
    try:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return None
        client = Groq(api_key=api_key)
        current_driver = None
        if allocation_history:
            for alloc in allocation_history:
                if not alloc.get("end_date"):
                    current_driver = alloc.get("service_resource_name")
                    break
        prompt = f"""Generate a concise, professional description for this vehicle (2-3 sentences, max 80 words):

Vehicle: Van {vehicle_data.get("Van_Number__c")} - {vehicle_data.get("Reg_No__c")}
Make/Model: {vehicle_data.get("Make_Model__c")}
Trade Group: {vehicle_data.get("Trade_Group__c")}
Status: {vehicle_data.get("Status__c")}
Current Driver: {current_driver or "Unassigned"}
Transmission: {vehicle_data.get("Transmission__c")}
Ownership: {vehicle_data.get("Vehicle_Ownership__c")}

CRITICAL INSTRUCTIONS:
- Write ONLY in plain English text
- NO markdown symbols
- NO bullet points or lists
- Just natural flowing sentences
- Professional fleet management tone
"""
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a fleet management assistant. Write concise, professional vehicle descriptions. Output ONLY plain text."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.6,
            max_tokens=150
        )
        description = response.choices[0].message.content.strip()
        for char in ["**", "*", "#", "_", "`", "•", "-", ">", "~~"]:
            description = description.replace(char, "")
        return " ".join(description.split())
    except Exception as e:
        print(f"❌ Error generating AI description: {e}")
        return None


def generate_ai_insights(vehicle_data: dict, allocation_history: list) -> str:
    if not GROQ_AVAILABLE:
        return "AI insights not available - Groq library not installed"
    try:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return "AI insights not available - GROQ_API_KEY not configured"
        client = Groq(api_key=api_key)
        vehicle_summary = {
            "van_number": vehicle_data.get("Van_Number__c"),
            "registration": vehicle_data.get("Reg_No__c"),
            "make_model": vehicle_data.get("Make_Model__c"),
            "trade_group": vehicle_data.get("Trade_Group__c"),
            "status": vehicle_data.get("Status__c"),
            "transmission": vehicle_data.get("Transmission__c"),
            "ownership": vehicle_data.get("Vehicle_Ownership__c"),
            "last_mot": vehicle_data.get("Last_MOT_Date__c"),
            "next_mot": vehicle_data.get("Next_MOT_Date__c"),
            "last_service": vehicle_data.get("Last_Service_Date__c"),
            "next_service": vehicle_data.get("Next_Service_Date__c"),
            "allocation_count": len(allocation_history)
        }
        allocation_summary = []
        for alloc in allocation_history[:10]:
            allocation_summary.append({
                "driver": alloc.get("service_resource_name"),
                "start": alloc.get("start_date"),
                "end": alloc.get("end_date") or "Current",
                "phone": alloc.get("contact_number")
            })
        prompt = f"""You are a fleet management AI analyst. Analyze this vehicle data and provide intelligent insights.

VEHICLE DATA:
{json.dumps(vehicle_summary, indent=2)}

ALLOCATION HISTORY (Most Recent):
{json.dumps(allocation_summary, indent=2)}

Generate a comprehensive AI analysis covering:
1. **Operational Summary**: Brief overview of vehicle role and usage
2. **Allocation Stability**: Analysis of driver changes and stability patterns
3. **Maintenance Compliance**: MOT, service, and road tax status assessment
4. **Risk Assessment**: Any concerns or red flags
5. **Recommendations**: Actionable suggestions for fleet management

Format: clear structured text with bullet points. Be specific and data-driven. Total length: 200-300 words.
"""
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are an expert fleet management analyst providing data-driven insights."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=600
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"❌ Error generating AI insights: {e}")
        return f"AI insights generation failed: {str(e)}"


# ─── Engineers endpoint ────────────────────────────────────────────────────────

@router.get("/engineers")
def get_available_engineers():
    """
    Returns all engineers with their most recent contact number (read from
    allocation history — contact_number is NEVER written back to Salesforce).
    """
    try:
        sf = SalesforceService()
        engineers = []
        engineer_ids = []

        # ── Path 1: ServiceResource object ──
        try:
            result = sf.sf.query_all(
                "SELECT Id, Name, Email FROM ServiceResource WHERE IsActive = true ORDER BY Name ASC"
            )
            records = result.get("records", [])
            print(f"🔍 ServiceResource returned {len(records)} records")
            for r in records:
                engineers.append({
                    "id": r.get("Id"),
                    "name": r.get("Name") or "",
                    "email": r.get("Email") or "",
                    "contact_number": "",
                })
                engineer_ids.append(r.get("Id"))
        except Exception as e:
            print(f"⚠️  ServiceResource query failed: {e}")

        # ── Path 2: Fallback — build from allocation history ──
        if not engineers:
            print("🔄 Falling back to allocation-history engineer list...")
            try:
                fb = sf.sf.query_all(
                    """SELECT Service_Resource__c, Service_Resource__r.Name, Contact_Number__c
                       FROM Vehicle_Allocation__c
                       WHERE Service_Resource__c != null
                       ORDER BY Start_date__c DESC
                       LIMIT 50000"""
                )
                seen: set = set()
                contact_map: dict = {}
                for row in fb.get("records", []):
                    sr_id = row.get("Service_Resource__c")
                    sr_obj = row.get("Service_Resource__r") or {}
                    name = sr_obj.get("Name", "") if isinstance(sr_obj, dict) else ""
                    phone = (row.get("Contact_Number__c") or "").strip()
                    if sr_id and sr_id not in seen:
                        seen.add(sr_id)
                        engineers.append({
                            "id": sr_id,
                            "name": name,
                            "email": "",
                            "contact_number": phone,
                        })
                        engineer_ids.append(sr_id)
                    elif sr_id and phone and sr_id not in contact_map:
                        contact_map[sr_id] = phone
                # back-fill phones found in later rows
                for eng in engineers:
                    if not eng["contact_number"] and eng["id"] in contact_map:
                        eng["contact_number"] = contact_map[eng["id"]]
                engineers.sort(key=lambda e: e["name"].lower())
                print(f"   Fallback returned {len(engineers)} engineers")
            except Exception as e:
                print(f"❌ Fallback also failed: {e}")
                import traceback; traceback.print_exc()

        # ── Enrich with contact numbers (only when Path 1 was used) ──
        elif engineer_ids:
            print("🔍 Enriching engineers with contact numbers from allocations...")
            contact_map: dict = {}
            chunk_size = 100
            for i in range(0, len(engineer_ids), chunk_size):
                chunk = engineer_ids[i:i + chunk_size]
                ids_str = "', '".join(chunk)
                try:
                    c = sf.sf.query_all(
                        f"""SELECT Service_Resource__c, Contact_Number__c
                            FROM Vehicle_Allocation__c
                            WHERE Service_Resource__c IN ('{ids_str}')
                              AND Contact_Number__c != null
                            ORDER BY Start_date__c DESC
                            LIMIT 50000"""
                    )
                    for row in c.get("records", []):
                        sr_id = row.get("Service_Resource__c")
                        phone = (row.get("Contact_Number__c") or "").strip()
                        if sr_id and phone and sr_id not in contact_map:
                            contact_map[sr_id] = phone
                except Exception as e:
                    print(f"⚠️  Contact enrichment chunk failed: {e}")
            for eng in engineers:
                eng["contact_number"] = contact_map.get(eng["id"], "")

        print(f"✅ Returning {len(engineers)} engineers")
        return {"engineers": engineers}

    except Exception as e:
        print(f"❌ Error fetching engineers: {e}")
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Allocation DELETE ────────────────────────────────────────────────────────

class DeleteAllocationRequest(BaseModel):
    allocation_id: str

@router.post("/allocation/delete")
def delete_vehicle_allocation(data: DeleteAllocationRequest):
    """Delete a Vehicle_Allocation__c record from Salesforce."""
    try:
        sf = SalesforceService()
        if sf.mock_mode or not sf.sf:
            raise HTTPException(status_code=503, detail="Salesforce not connected")
        print(f"🗑️  Deleting allocation {data.allocation_id}")
        sf.sf.Vehicle_Allocation__c.delete(data.allocation_id)
        return {"success": True, "message": "Allocation deleted successfully", "allocation_id": data.allocation_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Allocation delete error: {e}")
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Allocation UPDATE — Contact_Number__c REMOVED ────────────────────────────

@router.put("/allocation/update")
def update_vehicle_allocation(data: UpdateAllocationRequest):
    """
    Update Service_Resource__c, Start_date__c, End_date__c on an allocation.

    *** Contact_Number__c is intentionally NOT sent to Salesforce ***
    The field is read-only (INVALID_FIELD_FOR_INSERT_UPDATE) in this org.
    Contact number is derived from the allocation record and displayed
    read-only in the frontend — it is never written back.
    """
    try:
        sf = SalesforceService()
        if sf.mock_mode or not sf.sf:
            raise HTTPException(status_code=503, detail="Salesforce not connected")

        update_data = {}

        if data.service_resource_id:
            update_data["Service_Resource__c"] = data.service_resource_id

        if data.start_date is not None:
            update_data["Start_date__c"] = data.start_date

        # End date: send null explicitly to clear it, or a date string to set it
        if data.end_date is not None:
            update_data["End_date__c"] = data.end_date if data.end_date else None

        # ❌ DO NOT include Contact_Number__c — field is read-only in Salesforce
        # contact_number is only used for frontend display, never written back

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields provided to update")

        print(f"📝 Updating allocation {data.allocation_id} with: {update_data}")
        sf.sf.Vehicle_Allocation__c.update(data.allocation_id, update_data)

        return {
            "success": True,
            "message": "Allocation updated successfully",
            "allocation_id": data.allocation_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Allocation update error: {e}")
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Allocation CREATE — Contact_Number__c REMOVED ────────────────────────────

@router.post("/allocation/create")
def create_vehicle_allocation(data: CreateAllocationRequest):
    """
    Create a new Vehicle_Allocation__c and close the previous active one.

    *** Contact_Number__c is intentionally NOT sent to Salesforce ***
    """
    try:
        sf = SalesforceService()
        if sf.mock_mode or not sf.sf:
            raise HTTPException(status_code=503, detail="Salesforce not connected")

        # Close active allocation if one exists
        active_result = sf.sf.query_all(
            f"""SELECT Id FROM Vehicle_Allocation__c
                WHERE Vehicle__c = '{data.vehicle_id}'
                  AND End_date__c = null
                LIMIT 1"""
        )
        active_records = active_result.get("records", [])
        if active_records:
            active_id = active_records[0]["Id"]
            today = datetime.now().strftime("%Y-%m-%d")
            print(f"📋 Closing previous allocation {active_id} with end date: {today}")
            sf.sf.Vehicle_Allocation__c.update(active_id, {"End_date__c": today})

        # Create new allocation — NO Contact_Number__c
        allocation_data = {
            "Vehicle__c": data.vehicle_id,
            "Service_Resource__c": data.service_resource_id,
            "Start_date__c": data.start_date,
            "End_date__c": None,
            # ❌ Contact_Number__c intentionally omitted — read-only field
        }

        print(f"✨ Creating new allocation: {allocation_data}")
        result = sf.sf.Vehicle_Allocation__c.create(allocation_data)

        return {
            "success": True,
            "message": "Allocation created successfully",
            "allocation_id": result["id"],
            "previous_allocation_closed": len(active_records) > 0,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Allocation creation error: {e}")
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Asset CRUD ───────────────────────────────────────────────────────────────

@router.post("/create")
def create_asset(asset: VehicleAsset):
    try:
        sf = SalesforceService()
        existing = sf.sf.query_all(
            f"SELECT Id, Status__c FROM Vehicle__c WHERE Van_Number__c = '{asset.van_number}' LIMIT 1"
        )
        existing_records = existing.get("records", [])
        vehicle_data = {
            "Van_Number__c": asset.van_number,
            "Reg_No__c": asset.registration_number,
            "Tracking_Number__c": asset.tracking_number,
        }
        if existing_records:
            vehicle_id = existing_records[0].get("Id")
            sf.sf.Vehicle__c.update(vehicle_id, vehicle_data)
        else:
            vehicle_data["Name"] = asset.vehicle_name or f"Vehicle {asset.van_number}"
            vehicle_data["Status__c"] = "Spare"
            result = sf.sf.Vehicle__c.create(vehicle_data)
            vehicle_id = result["id"]
        return {"status": "success", "message": "Asset created successfully", "vehicle_id": vehicle_id}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all")
def get_all_assets():
    try:
        sf = SalesforceService()
        result = sf.sf.query_all(
            """SELECT Id, Name, Van_Number__c, Reg_No__c, Tracking_Number__c,
                      Vehicle_Type__c, Description__c, Status__c, CreatedDate
               FROM Vehicle__c ORDER BY CreatedDate DESC"""
        )
        assets = [
            {
                "id": r.get("Id"), "name": r.get("Name"),
                "van_number": r.get("Van_Number__c"),
                "registration_number": r.get("Reg_No__c"),
                "tracking_number": r.get("Tracking_Number__c"),
                "vehicle_type": r.get("Vehicle_Type__c"),
                "description": r.get("Description__c"),
                "status": r.get("Status__c"),
                "created_date": r.get("CreatedDate"),
            }
            for r in result.get("records", [])
        ]
        return {"total": len(assets), "assets": assets}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-id/{asset_id}")
def get_asset_by_id(asset_id: str):
    try:
        sf = SalesforceService()
        result = sf.sf.query_all(
            f"""SELECT Id, Name, Van_Number__c, Reg_No__c, Tracking_Number__c,
                       Vehicle_Type__c, Description__c, Status__c, CreatedDate,
                       Trade_Group__c, Make_Model__c, Transmission__c,
                       Last_MOT_Date__c, Next_MOT_Date__c, Last_Road_Tax__c,
                       Next_Road_Tax__c, Last_Service_Date__c, Next_Service_Date__c,
                       Vehicle_Ownership__c
                FROM Vehicle__c WHERE Id = '{asset_id}' LIMIT 1"""
        )
        records = result.get("records", [])
        if not records:
            raise HTTPException(status_code=404, detail=f"Asset not found: {asset_id}")
        vehicle = records[0]
        allocation_history, current_driver = _get_allocation_history(sf, asset_id)
        existing_desc = vehicle.get("Description__c")
        ai_description = existing_desc if existing_desc and existing_desc.strip() else generate_ai_description(vehicle, allocation_history)
        return _build_vehicle_response(vehicle, allocation_history, current_driver, ai_description, generate_ai_insights(vehicle, allocation_history))
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-van/{van_number}")
def get_asset_by_van(van_number: str):
    try:
        sf = SalesforceService()
        result = sf.sf.query_all(
            f"""SELECT Id, Name, Van_Number__c, Reg_No__c, Tracking_Number__c,
                       Vehicle_Type__c, Description__c, Status__c, CreatedDate,
                       Trade_Group__c, Make_Model__c, Transmission__c,
                       Last_MOT_Date__c, Next_MOT_Date__c, Last_Road_Tax__c,
                       Next_Road_Tax__c, Last_Service_Date__c, Next_Service_Date__c,
                       Vehicle_Ownership__c
                FROM Vehicle__c WHERE Van_Number__c = '{van_number}' LIMIT 1"""
        )
        records = result.get("records", [])
        if not records:
            raise HTTPException(status_code=404, detail=f"Asset not found for van {van_number}")
        vehicle = records[0]
        vehicle_id = vehicle.get("Id")
        allocation_history, current_driver = _get_allocation_history(sf, vehicle_id)
        existing_desc = vehicle.get("Description__c")
        ai_description = existing_desc if existing_desc and existing_desc.strip() else generate_ai_description(vehicle, allocation_history)
        return _build_vehicle_response(vehicle, allocation_history, current_driver, ai_description, generate_ai_insights(vehicle, allocation_history))
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_allocation_history(sf, vehicle_id: str):
    history = []
    current_driver = None
    try:
        result = sf.sf.query_all(
            f"""SELECT Id, Start_date__c, End_date__c,
                       Service_Resource__r.Name, Service_Resource__c, Contact_Number__c
                FROM Vehicle_Allocation__c
                WHERE Vehicle__c = '{vehicle_id}'
                ORDER BY Start_date__c DESC"""
        )
        for record in result.get("records", []):
            sr = record.get("Service_Resource__r", {})
            name = sr.get("Name", "N/A") if isinstance(sr, dict) else "N/A"
            alloc = {
                "id": record.get("Id"),
                "start_date": record.get("Start_date__c"),
                "end_date": record.get("End_date__c"),
                "service_resource_name": name,
                "service_resource_id": record.get("Service_Resource__c"),
                "contact_number": record.get("Contact_Number__c") or "N/A",
            }
            history.append(alloc)
            if not alloc["end_date"]:
                current_driver = name
    except Exception as e:
        print(f"⚠️  Could not fetch allocation history: {e}")
    return history, current_driver


def _build_vehicle_response(vehicle, allocation_history, current_driver, ai_description, ai_insights):
    return {
        "id": vehicle.get("Id"),
        "name": vehicle.get("Name"),
        "van_number": vehicle.get("Van_Number__c"),
        "registration_number": vehicle.get("Reg_No__c"),
        "tracking_number": vehicle.get("Tracking_Number__c"),
        "vehicle_type": vehicle.get("Vehicle_Type__c"),
        "description": ai_description,
        "status": vehicle.get("Status__c"),
        "created_date": vehicle.get("CreatedDate"),
        "trade_group": vehicle.get("Trade_Group__c"),
        "make_model": vehicle.get("Make_Model__c"),
        "transmission": vehicle.get("Transmission__c"),
        "last_mot_date": vehicle.get("Last_MOT_Date__c"),
        "next_mot_date": vehicle.get("Next_MOT_Date__c"),
        "last_road_tax": vehicle.get("Last_Road_Tax__c"),
        "next_road_tax": vehicle.get("Next_Road_Tax__c"),
        "last_service_date": vehicle.get("Last_Service_Date__c"),
        "next_service_date": vehicle.get("Next_Service_Date__c"),
        "vehicle_ownership": vehicle.get("Vehicle_Ownership__c"),
        "vehicle_allocation_history": allocation_history,
        "driver_name": current_driver,
        "ai_insights": ai_insights,
    }