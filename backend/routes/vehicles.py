from fastapi import APIRouter, HTTPException
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from salesforce_service import SalesforceService

router = APIRouter(prefix="/api/vehicles", tags=["vehicles"])


# ==========================================
# VEHICLE LOOKUP
# ==========================================
@router.get("/lookup/{van_number}")
def lookup_vehicle_by_van(van_number: str):
    try:
        sf = SalesforceService()

        print(f"🔍 Looking up vehicle with van number: {van_number}")

        sanitized_van = van_number.replace("'", "\\'")

        vehicle_query = f"""
            SELECT 
                Id, 
                Name, 
                Van_Number__c, 
                Reg_No__c,
                Tracking_Number__c,
                Vehicle_Type__c,
                Description__c,
                Status__c,
                Trade_Group__c,
                Make_Model__c,
                Transmission__c,
                Last_MOT_Date__c,
                Next_MOT_Date_Editable__c,
                Last_Road_Tax__c,
                Next_Road_Tax_Editable__c,
                Last_Service_Date__c,
                Next_Service_Date_Editable__c,
                Vehicle_Ownership__c
            FROM Vehicle__c
            WHERE Van_Number__c = '{sanitized_van}'
            LIMIT 1
        """

        result = sf.sf.query_all(vehicle_query)
        records = result.get("records", [])

        if not records:
            raise HTTPException(
                status_code=404,
                detail=f"Vehicle with van number {van_number} not found"
            )

        vehicle = records[0]
        vehicle_id = vehicle.get("Id")

        print(f"✅ Found vehicle: {vehicle.get('Name')}")

        # ✅ Get allocation history
        allocation_history = get_vehicle_allocation_history(sf, vehicle_id)

        # ✅ Get assigned driver
        driver_name = get_assigned_driver(sf, vehicle_id)

        return {
            "van_number": vehicle.get("Van_Number__c"),
            "registration_number": vehicle.get("Reg_No__c"),
            "tracking_number": vehicle.get("Tracking_Number__c"),
            "vehicle_name": vehicle.get("Name"),
            "vehicle_type": vehicle.get("Vehicle_Type__c"),
            "description": vehicle.get("Description__c"),
            "status": vehicle.get("Status__c"),
            "trade_group": vehicle.get("Trade_Group__c"),
            "make_model": vehicle.get("Make_Model__c"),
            "transmission": vehicle.get("Transmission__c"),
            "last_mot_date": vehicle.get("Last_MOT_Date__c"),
            "next_mot_date": vehicle.get("Next_MOT_Date_Editable__c"),
            "last_road_tax": vehicle.get("Last_Road_Tax__c"),
            "next_road_tax": vehicle.get("Next_Road_Tax_Editable__c"),
            "last_service_date": vehicle.get("Last_Service_Date__c"),
            "next_service_date": vehicle.get("Next_Service_Date_Editable__c"),
            "vehicle_ownership": vehicle.get("Vehicle_Ownership__c"),
            "vehicle_allocation_history": allocation_history,
            "driver_name": driver_name,
            "vehicle_id": vehicle_id
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error looking up vehicle: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# VEHICLE ALLOCATION HISTORY
# ==========================================
def get_vehicle_allocation_history(sf: SalesforceService, vehicle_id: str):
    try:
        allocation_query = f"""
            SELECT 
                Id,
                Start_date__c,
                End_date__c,
                Contact_Number__c,
                Service_Resource__r.Name
            FROM Vehicle_Allocation__c
            WHERE Vehicle__c = '{vehicle_id}'
            ORDER BY Start_date__c DESC
        """

        result = sf.sf.query_all(allocation_query)
        records = result.get("records", [])

        history = []

        for record in records:
            service_resource = record.get("Service_Resource__r", {})
            
            service_name = service_resource.get("Name", "N/A") if isinstance(service_resource, dict) else "N/A"
            
            contact_number = record.get("Contact_Number__c") or "N/A"

            history.append({
                "start_date": record.get("Start_date__c"),
                "end_date": record.get("End_date__c"),
                "service_resource_name": service_name,
                "contact_number": contact_number
            })

        return history

    except Exception as e:
        print(f"[ERROR] Allocation history error: {e}")
        import traceback
        traceback.print_exc()
        return []


# ==========================================
# GET ASSIGNED DRIVER
# ==========================================
def get_assigned_driver(sf: SalesforceService, vehicle_id: str) -> str:
    try:
        driver_query = f"""
            SELECT 
                Id, 
                Name
            FROM ServiceResource
            WHERE Vehicle__c = '{vehicle_id}'
            LIMIT 1
        """

        result = sf.sf.query_all(driver_query)
        records = result.get("records", [])

        if records:
            return records[0].get("Name")

        return "No driver assigned"

    except Exception as e:
        print(f"⚠️ Error fetching assigned driver: {e}")
        return "Unable to fetch driver"


# ==========================================
# SEARCH VEHICLES
# ==========================================
@router.get("/search")
def search_vehicles(q: str = ""):
    try:
        sf = SalesforceService()

        vehicle_query = """
            SELECT 
                Id, 
                Name, 
                Van_Number__c, 
                Reg_No__c,
                Tracking_Number__c,
                Vehicle_Type__c,
                Status__c
            FROM Vehicle__c
            ORDER BY Van_Number__c ASC
            LIMIT 100
        """

        result = sf.sf.query_all(vehicle_query)
        records = result.get("records", [])

        search_term = q.lower()
        matching = []

        for record in records:
            if (
                not search_term
                or search_term in (record.get("Van_Number__c") or "").lower()
                or search_term in (record.get("Name") or "").lower()
                or search_term in (record.get("Reg_No__c") or "").lower()
            ):
                matching.append({
                    "van_number": record.get("Van_Number__c"),
                    "name": record.get("Name"),
                    "registration_number": record.get("Reg_No__c"),
                    "vehicle_type": record.get("Vehicle_Type__c"),
                    "status": record.get("Status__c"),
                    "tracking_number": record.get("Tracking_Number__c")
                })

        return {
            "search_term": q,
            "total_found": len(matching),
            "vehicles": matching[:20]
        }

    except Exception as e:
        print(f"❌ Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# LIST ALL VEHICLES
# ==========================================
@router.get("/list")
def list_all_vehicles():
    try:
        sf = SalesforceService()

        vehicle_query = """
            SELECT 
                Id, 
                Name, 
                Van_Number__c, 
                Reg_No__c,
                Tracking_Number__c,
                Vehicle_Type__c,
                Description__c,
                Status__c,
                CreatedDate
            FROM Vehicle__c
            ORDER BY Name ASC
        """

        result = sf.sf.query_all(vehicle_query)
        records = result.get("records", [])

        vehicles = []

        for record in records:
            vehicles.append({
                "id": record.get("Id"),
                "name": record.get("Name"),
                "van_number": record.get("Van_Number__c"),
                "registration_number": record.get("Reg_No__c"),
                "tracking_number": record.get("Tracking_Number__c"),
                "vehicle_type": record.get("Vehicle_Type__c"),
                "description": record.get("Description__c"),
                "status": record.get("Status__c"),
                "created_date": record.get("CreatedDate")
            })

        return {
            "total": len(vehicles),
            "vehicles": vehicles
        }

    except Exception as e:
        print(f"❌ Error listing vehicles: {e}")
        raise HTTPException(status_code=500, detail=str(e))
