from fastapi import APIRouter, HTTPException
import os
import sys

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from salesforce_service import SalesforceService

router = APIRouter(prefix="/api/vehicle-condition", tags=["vehicle_condition"])

SALESFORCE_BASE_URL = "https://chumley.my.salesforce.com"

# Initialize Salesforce service
sf_service = SalesforceService()


@router.get("/{vehicle_number}")
def get_vehicle_condition_forms(vehicle_number: str):

    # STEP 1: GET vehicle id
    vehicle_query = f"""
        SELECT Id, Name
        FROM Vehicle__c
        WHERE Name = '{vehicle_number}' OR Reg_No__c = '{vehicle_number}' OR Van_Number__c = '{vehicle_number}'
        LIMIT 1
    """

    vehicle_result = sf_service.execute_soql(vehicle_query)

    if not vehicle_result:
        return {"message": "Vehicle not found"}

    vehicle_id = vehicle_result[0]["Id"]

    # STEP 2: Get all VehicleCondition Forms for this Vehicle
    form_query = f"""
        SELECT Id, Name, CreatedDate
        FROM Vehicle_Condition_Form__c
        WHERE Vehicle__c = '{vehicle_id}'
        ORDER BY CreatedDate DESC
    """

    forms = sf_service.execute_soql(form_query)

    if not forms:
        return {
            "vehicle": vehicle_number,
            "forms_count": 0,
            "forms": []
        }

    return {
        "vehicle": vehicle_number,
        "forms_count": len(forms),
        "forms": forms
    }


# Get one form with images
@router.get("/form/{form_id}")
def get_single_form_with_images(form_id: str):
    form_query = f"""
        SELECT Id,
               Name,
               Owner.Name,
               Description__c,
               Current_Engineer_Assigned_to_Vehicle__r.Name,
               Inspection_Result__c,
               CreatedDate
        FROM Vehicle_Condition_Form__c
        WHERE Id = '{form_id}'
        LIMIT 1
    """

    form_result = sf_service.execute_soql(form_query)

    if not form_result:
        raise HTTPException(status_code=404, detail="Form not found")

    form_data = form_result[0]

    # STEP 2: FIRST GET DOCUMENT IDs LINKED TO THIS FORM
    doc_link_query = f"""
        SELECT ContentDocumentId
        FROM ContentDocumentLink
        WHERE LinkedEntityId = '{form_id}'
    """

    doc_link_result = sf_service.execute_soql(doc_link_query)
    
    images = []
    
    if doc_link_result:
        # Extract document IDs
        doc_ids = [record["ContentDocumentId"] for record in doc_link_result]
        
        # STEP 3: NOW GET THE ACTUAL IMAGE FILES (ContentVersion)
        if doc_ids:
            # Build the IN clause with the document IDs
            doc_ids_str = "', '".join(doc_ids)
            
            image_query = f"""
                SELECT Id, Title, ContentDocumentId
                FROM ContentVersion
                WHERE ContentDocumentId IN ('{doc_ids_str}')
                AND IsLatest = true
            """
            
            image_result = sf_service.execute_soql(image_query)
            
            for img in image_result:
                image_url = f"{SALESFORCE_BASE_URL}/sfc/servlet.shepherd/version/download/{img['Id']}"
                images.append({
                    "id": img["Id"],
                    "title": img.get("Title", "Image"),
                    "url": image_url
                })

    return {
        "form": form_data,
        "images": images
    }