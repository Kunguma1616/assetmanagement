from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import httpx
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from salesforce_service import SalesforceService

router = APIRouter(prefix="/api/vehicle-condition", tags=["vehicle_condition"])
sf_service = SalesforceService()

# GCP backend URL
BACKEND_URL = "https://aspect-asset-850122601904.europe-west1.run.app"

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


@router.get("/image/{version_id}")
async def proxy_image(version_id: str):
    if sf_service.mock_mode or not sf_service.sf:
        raise HTTPException(status_code=503, detail="Salesforce not connected")

    access_token = sf_service.sf.session_id
    instance_url = f"https://{sf_service.sf.sf_instance}"
    rest_url = f"{instance_url}/services/data/v60.0/sobjects/ContentVersion/{version_id}/VersionData"

    try:
        client = await get_http_client()
        response = await client.get(rest_url, headers={"Authorization": f"Bearer {access_token}"})

        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="Salesforce token expired")
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Image not found")
        if len(response.content) == 0:
            raise HTTPException(status_code=500, detail="Empty image")

        content_type = response.headers.get("content-type", "image/jpeg")
        if "text/html" in content_type:
            raise HTTPException(status_code=403, detail="Auth failed")

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
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/form/{form_id}")
def get_single_form_with_images(form_id: str):
    form_result = sf_service.execute_soql(f"""
        SELECT Id, Name, Owner.Name, Description__c,
               Current_Engineer_Assigned_to_Vehicle__r.Name,
               Inspection_Result__c, CreatedDate
        FROM Vehicle_Condition_Form__c
        WHERE Id = '{form_id}'
        LIMIT 1
    """)
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
                    "url": f"{BACKEND_URL}/api/vehicle-condition/image/{img['Id']}"
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
