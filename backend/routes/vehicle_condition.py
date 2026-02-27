from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import httpx
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from salesforce_service import SalesforceService

router = APIRouter(prefix="/api/vehicle-condition", tags=["vehicle_condition"])
sf_service = SalesforceService()

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
        # Replace Z with +00:00 for proper timezone handling
        date_str = date_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(date_str)
        
        # Ensure datetime is timezone-aware (if naive, assume UTC)
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
    
    Checks if a Vehicle Condition Form was submitted within ±14 days 
    of the allocation start date.
    
    Args:
        vehicle_input: Van Number, Reg No, or Vehicle Name
    
    Returns:
        {
            "vehicle": "VAN-001",
            "engineer": "John Smith",
            "allocation_start_date": "2026-05-31",
            "latest_vcr_id": "a0X...",
            "latest_vcr_last_modified_date": "2026-05-29",
            "latest_vcr_last_modified_by": "John Smith",
            "submitted": true,
            "flag": "GREEN"
        }
    """
    try:
        # ✅ STEP 1: Find Vehicle
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
            raise HTTPException(
                status_code=404,
                detail=f"Vehicle not found: {vehicle_input}"
            )
        
        vehicle_data = vehicle_result[0]
        vehicle_id = vehicle_data["Id"]
        vehicle_name = vehicle_data.get("Name", vehicle_input)
        print(f"[COMPLIANCE] ✓ Found vehicle: {vehicle_name} (ID: {vehicle_id})")

        # ✅ STEP 2: Get Latest Allocation (Anchor Date)
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
            raise HTTPException(
                status_code=404,
                detail=f"No allocation found for vehicle: {vehicle_name}"
            )
        
        allocation_data = allocation_result[0]
        allocation_start_str = allocation_data.get("Start_date__c")
        engineer_name = allocation_data.get("Service_Resource__r", {})
        engineer_name = engineer_name.get("Name", "Unassigned") if engineer_name else "Unassigned"
        
        allocation_start_date = parse_salesforce_datetime(allocation_start_str)
        if not allocation_start_date:
            raise HTTPException(
                status_code=500,
                detail="Failed to parse allocation start date"
            )
        
        print(f"[COMPLIANCE] ✓ Latest allocation start: {allocation_start_date} | Engineer: {engineer_name}")

        # ✅ STEP 3: Get Latest VCR (Based on LastModifiedDate)
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
            print(f"[COMPLIANCE] ⚠ No VCR exists for {vehicle_name}")
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
            raise HTTPException(
                status_code=500,
                detail="Failed to parse VCR last modified date"
            )
        
        print(f"[COMPLIANCE] ✓ Latest VCR: {vcr_name} | Last Modified: {last_modified_date}")

        # ✅ STEP 4: Compliance Logic (14-day window)
        print(f"[COMPLIANCE] Step 4: Running compliance check")
        window_start = allocation_start_date - timedelta(days=14)
        window_end = allocation_start_date + timedelta(days=14)
        
        is_within_window = (
            last_modified_date >= window_start and 
            last_modified_date <= window_end
        )
        
        submitted = is_within_window
        flag = "GREEN" if is_within_window else "RED"
        
        print(f"[COMPLIANCE] Window: {window_start} to {window_end}")
        print(f"[COMPLIANCE] VCR Modified: {last_modified_date}")
        print(f"[COMPLIANCE] Result: {flag} (submitted={submitted})")

        # ✅ Return Response
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
        print(f"[COMPLIANCE] ❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compliance/dashboard/all-allocated")
def get_compliance_dashboard_all_allocated():
    """
    📊 VCR COMPLIANCE DASHBOARD - All Allocated Vehicles
    
    Returns JSON matching the required format:
    {
      totalAllocated: 232,
      submittedCount: 24,
      notSubmittedCount: 208,
      submitted: [...],
      notSubmitted: [...]
    }
    """
    try:
        print(f"[VCR_DASHBOARD] Starting VCR Compliance Dashboard")
        
        # TODAY for 14-day calculation
        today = datetime.now(timezone.utc)
        fourteen_days_ago = today - timedelta(days=14)
        
        # ✅ STEP 1: Get ALL CURRENTLY ALLOCATED VEHICLES
        # Conditions: Start_date__c <= TODAY AND (End_date__c IS NULL OR End_date__c >= TODAY)
        allocation_query = f"""
            SELECT Vehicle__c,
                   Vehicle__r.Name,
                   Vehicle__r.Reg_No__c,
                   Service_Resource__r.Name
            FROM Vehicle_Allocation__c
            WHERE Start_date__c <= TODAY
              AND (End_date__c = NULL OR End_date__c >= TODAY)
            ORDER BY Vehicle__c
        """
        print(f"[VCR_DASHBOARD] Fetching allocated vehicles...")
        allocated_vehicles = sf_service.execute_soql(allocation_query)
        
        if not allocated_vehicles:
            print(f"[VCR_DASHBOARD] ⚠ No allocated vehicles found")
            return {
                "totalAllocated": 0,
                "submittedCount": 0,
                "notSubmittedCount": 0,
                "submitted": [],
                "notSubmitted": []
            }
        
        # De-duplicate vehicles (keep first allocation for each vehicle)
        seen_vehicles = {}
        total_allocations = len(allocated_vehicles)
        for allocation in allocated_vehicles:
            vehicle_id = allocation["Vehicle__c"]
            if vehicle_id not in seen_vehicles:
                seen_vehicles[vehicle_id] = allocation
        
        allocated_vehicles = list(seen_vehicles.values())
        total_allocated = len(allocated_vehicles)
        print(f"[VCR_DASHBOARD] ✓ Found {total_allocated} allocated vehicles (deduplicated from {total_allocations} allocations)")
        
        # ✅ STEP 2: Get ALL VCRs for those vehicles
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
        
        # ✅ STEP 3: Build a Map<VehicleId, LatestVcrDate>
        # Keep ONLY the latest VCR per vehicle
        latest_vcr_map = {}
        if vcr_records:
            for vcr in vcr_records:
                vehicle_id = vcr["Vehicle__c"]
                # Only add if not already in map (because ordered by CreatedDate DESC)
                if vehicle_id not in latest_vcr_map:
                    latest_vcr_map[vehicle_id] = vcr
        
        print(f"[VCR_DASHBOARD] ✓ Found {len(vcr_records)} total VCRs, {len(latest_vcr_map)} with latest reports")
        
        # ✅ STEP 4: Process each allocated vehicle
        submitted_list = []
        not_submitted_list = []
        
        for vehicle in allocated_vehicles:
            vehicle_id = vehicle["Vehicle__c"]
            vehicle_name = vehicle.get("Vehicle__r", {})
            vehicle_name = vehicle_name.get("Name", "Unknown") if vehicle_name else "Unknown"
            
            vehicle_reg = vehicle.get("Vehicle__r", {})
            vehicle_reg = vehicle_reg.get("Reg_No__c", "") if vehicle_reg else ""
            
            engineer_name = vehicle.get("Service_Resource__r", {})
            engineer_name = engineer_name.get("Name", "Unassigned") if engineer_name else "Unassigned"
            
            if vehicle_id in latest_vcr_map:
                # Vehicle HAS a VCR report
                latest_vcr = latest_vcr_map[vehicle_id]
                vcr_date_str = latest_vcr.get("CreatedDate")
                vcr_date = parse_salesforce_datetime(vcr_date_str)
                
                if vcr_date:
                    days_since = (today - vcr_date).days
                    
                    if days_since <= 14:
                        # ✅ SUBMITTED (within 14 days)
                        print(f"[VCR_DASHBOARD] ✅ {vehicle_name}: SUBMITTED ({days_since} days ago)")
                        submitted_list.append({
                            "vehicleId": vehicle_id,
                            "vanName": vehicle_name,
                            "regNo": vehicle_reg or "N/A",
                            "engineerName": engineer_name,
                            "latestVcrDate": vcr_date.date().isoformat(),
                            "daysSince": days_since,
                            "status": "Submitted"
                        })
                    else:
                        # ❌ OVERDUE (older than 14 days)
                        print(f"[VCR_DASHBOARD] ❌ {vehicle_name}: OVERDUE ({days_since} days ago)")
                        not_submitted_list.append({
                            "vehicleId": vehicle_id,
                            "vanName": vehicle_name,
                            "regNo": vehicle_reg or "N/A",
                            "engineerName": engineer_name,
                            "latestVcrDate": vcr_date.date().isoformat(),
                            "daysSince": days_since,
                            "status": "Overdue"
                        })
            else:
                # ❌ NO VCR REPORT AT ALL
                print(f"[VCR_DASHBOARD] ❌ {vehicle_name}: MISSING (no report)")
                not_submitted_list.append({
                    "vehicleId": vehicle_id,
                    "vanName": vehicle_name,
                    "regNo": vehicle_reg or "N/A",
                    "engineerName": engineer_name,
                    "latestVcrDate": None,
                    "daysSince": None,
                    "status": "Missing"
                })
        
        submitted_count = len(submitted_list)
        not_submitted_count = len(not_submitted_list)
        
        print(f"[VCR_DASHBOARD] Summary: {total_allocated} total | {submitted_count} submitted | {not_submitted_count} not submitted")
        
        return {
            "totalAllocated": total_allocated,
            "submittedCount": submitted_count,
            "notSubmittedCount": not_submitted_count,
            "submitted": submitted_list,
            "notSubmitted": not_submitted_list,
            "asOfDate": today.date().isoformat()
        }

    except Exception as e:
        print(f"[VCR_DASHBOARD] ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compliance/search/{van_number_or_reg}")
def search_vcr_by_van(van_number_or_reg: str):
    """
    🔍 Search VCR Reports by Van Number or Registration Number
    
    Returns latest VCR report and all images for a specific vehicle.
    """
    try:
        print(f"[VCR_SEARCH] Searching for: {van_number_or_reg}")
        
        # Find the vehicle
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
        
        vehicle = vehicle_result[0]
        vehicle_id = vehicle["Id"]
        vehicle_name = vehicle.get("Name", van_number_or_reg)
        
        # Get latest VCR
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
            return {
                "vehicle": vehicle_name,
                "latestVcr": None,
                "images": []
            }
        
        vcr = vcr_result[0]
        vcr_id = vcr["Id"]
        
        # Get images for this VCR
        doc_link_query = f"""
            SELECT ContentDocumentId FROM ContentDocumentLink
            WHERE LinkedEntityId = '{vcr_id}'
        """
        doc_links = sf_service.execute_soql(doc_link_query)
        
        images = []
        if doc_links:
            doc_ids = [link["ContentDocumentId"] for link in doc_links]
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
                        "id": img["Id"],
                        "title": img.get("Title", "Image"),
                        "fileExtension": img.get("FileExtension", ""),
                        "imageUrl": f"http://localhost:8000/api/vehicle-condition/image/{img['Id']}"
                    })
        
        return {
            "vehicle": vehicle_name,
            "latestVcr": {
                "id": vcr_id,
                "name": vcr.get("Name"),
                "createdDate": vcr.get("CreatedDate"),
                "engineer": vcr.get("Current_Engineer_Assigned_to_Vehicle__r", {}).get("Name", "Unknown"),
                "description": vcr.get("Description__c")
            },
            "images": images
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[VCR_SEARCH] ❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/image/{version_id}")
async def proxy_image(version_id: str):
    if sf_service.mock_mode or not sf_service.sf:
        raise HTTPException(status_code=503, detail="Salesforce not connected")

    access_token = sf_service.sf.session_id
    instance_url = f"https://{sf_service.sf.sf_instance}"

    # ✅ USE REST API ENDPOINT INSTEAD OF SERVLET
    # The servlet needs a browser session cookie
    # The REST API works with just the Bearer token
    rest_url = f"{instance_url}/services/data/v60.0/sobjects/ContentVersion/{version_id}/VersionData"

    print(f"[IMAGE] Fetching via REST API: {version_id}")
    print(f"[IMAGE] URL: {rest_url}")
    print(f"[IMAGE] Using token: {access_token[:20]}...")
    print(f"[IMAGE] Instance: {instance_url}")

    try:
        client = await get_http_client()

        response = await client.get(
            rest_url,
            headers={
                "Authorization": f"Bearer {access_token}",
            },
            timeout=30.0,
        )

        print(f"[IMAGE] {version_id} → status={response.status_code}, size={len(response.content)} bytes, type={response.headers.get('content-type', '?')}")

        if response.status_code == 401:
            print(f"[IMAGE] ❌ 401 Unauthorized - token might be expired")
            print(f"[IMAGE] Response: {response.text[:200]}")
            raise HTTPException(status_code=401, detail="Salesforce token expired")

        if response.status_code == 404:
            print(f"[IMAGE] ❌ 404 Not Found - image ID might be invalid")
            print(f"[IMAGE] Response: {response.text[:200]}")
            raise HTTPException(status_code=404, detail=f"Image not found: {version_id}")

        if response.status_code != 200:
            print(f"[IMAGE] ❌ HTTP {response.status_code}")
            print(f"[IMAGE] Response: {response.text[:200]}")
            raise HTTPException(status_code=response.status_code, detail=f"Error fetching image: HTTP {response.status_code}")

        if len(response.content) == 0:
            print(f"[IMAGE] ❌ Empty content")
            raise HTTPException(status_code=500, detail="Empty image")

        content_type = response.headers.get("content-type", "image/jpeg")

        if "text/html" in content_type or "text/plain" in content_type:
            print(f"[IMAGE] ❌ Got wrong content type: {content_type}")
            print(f"[IMAGE] Body: {response.text[:300]}")
            raise HTTPException(status_code=403, detail="Got HTML/text instead of image")

        print(f"[IMAGE] ✅ Success {version_id} - {len(response.content)} bytes of {content_type}")

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
        print(f"[IMAGE] ❌ Timeout for {version_id}")
        raise HTTPException(status_code=504, detail="Timeout")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[IMAGE] ❌ Error: {e}")
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
        doc_ids = [r["ContentDocumentId"] for r in doc_link_result]
        if doc_ids:
            doc_ids_str = "', '".join(doc_ids)
            image_result = sf_service.execute_soql(f"""
                SELECT Id, Title, ContentDocumentId FROM ContentVersion
                WHERE ContentDocumentId IN ('{doc_ids_str}')
                AND IsLatest = true
            """)
            for img in image_result:
                images.append({
                    "id": img["Id"],
                    "title": img.get("Title", "Image"),
                    "url": f"http://localhost:8000/api/vehicle-condition/image/{img['Id']}"
                })

    return {"form": form_data, "images": images}


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
    Returns: total count, with images count, and list of engineers without images
    """
    try:
        # Query 1: Total VCR (Last 14 Days)
        total_vcr_result = sf_service.execute_soql("""
            SELECT COUNT(Id) cnt
            FROM Vehicle_Condition_Form__c
            WHERE CreatedDate = LAST_N_DAYS:14
        """)
        total_vcr = total_vcr_result[0]['cnt'] if total_vcr_result else 0

        # Query 2: Total WITH Images (Last 14 Days)
        with_images_result = sf_service.execute_soql("""
            SELECT COUNT_DISTINCT(LinkedEntityId) cnt
            FROM ContentDocumentLink
            WHERE LinkedEntityId IN (
                SELECT Id
                FROM Vehicle_Condition_Form__c
                WHERE CreatedDate = LAST_N_DAYS:14
            )
        """)
        with_images = with_images_result[0]['cnt'] if with_images_result else 0
        without_images = total_vcr - with_images

        # Query 3: Get all VCR records (Last 14 Days)
        all_vcr = sf_service.execute_soql("""
            SELECT Id,
                   Name,
                   Vehicle__r.Name,
                   Current_Engineer_Assigned_to_Vehicle__r.Name
            FROM Vehicle_Condition_Form__c
            WHERE CreatedDate = LAST_N_DAYS:14
            ORDER BY CreatedDate DESC
        """)

        # Query 4: Get IDs that HAVE images
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

        # Separate engineers: WITH images (GREEN) vs WITHOUT images (RED)
        with_image_list = []
        without_image_list = []

        for vcr in all_vcr:
            engineer_name = vcr.get('Current_Engineer_Assigned_to_Vehicle__r', {})
            engineer_name = engineer_name.get('Name', 'Unassigned') if engineer_name else 'Unassigned'
            van_number = vcr.get('Vehicle__r', {})
            van_number = van_number.get('Name', 'Unknown') if van_number else 'Unknown'

            record_data = {
                "form_id": vcr['Id'],
                "form_name": vcr['Name'],
                "engineer": engineer_name,
                "van": van_number
            }

            if vcr['Id'] in image_id_set:
                with_image_list.append(record_data)
            else:
                without_image_list.append(record_data)

        return {
            "summary": {
                "total_vcr": total_vcr,
                "with_images": with_images,
                "without_images": without_images,
                "period": "Last 14 Days"
            },
            "with_images_list": {
                "count": len(with_image_list),
                "status": "GREEN",
                "records": with_image_list
            },
            "without_images_list": {
                "count": len(without_image_list),
                "status": "RED",
                "records": without_image_list
            }
        }

    except Exception as e:
        print(f"[DASHBOARD] ❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
