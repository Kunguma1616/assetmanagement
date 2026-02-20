# -*- coding: utf-8 -*-

from fastapi import APIRouter, HTTPException, Request
from typing import Optional
from datetime import datetime
import logging
import os
import sys
from dotenv import load_dotenv

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from salesforce_service import SalesforceService

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/assets",
    tags=["Vehicle Upload"]
)

# Initialize Salesforce service
sf_service = SalesforceService()


def get_error_response(detail: str):
    """Helper to create consistent error responses"""
    logger.error(detail)
    raise HTTPException(status_code=500, detail=detail)


@router.get("/salesforce/fields")
async def get_salesforce_fields():
    """Check what fields are required in Salesforce Vehicle__c object"""
    try:
        metadata = sf_service.describe_object("Vehicle__c")
        
        if "error" in metadata:
            logger.error(f"[ERROR] Failed to get metadata: {metadata['error']}")
            raise HTTPException(status_code=500, detail=f"Could not retrieve Salesforce metadata: {metadata['error']}")
        
        required_fields = []
        all_fields = []
        
        for field in metadata.get('fields', []):
            field_info = {
                'name': field['name'],
                'label': field['label'],
                'type': field['type'],
                'required': not field['nillable'] and not field['defaultedOnCreate'],
                'createable': field['createable']
            }
            all_fields.append(field_info)
            
            if field_info['required'] and field_info['createable']:
                required_fields.append(field_info)
        
        return {
            "success": True,
            "object_name": "Vehicle__c",
            "required_fields": required_fields,
            "all_createable_fields": [f for f in all_fields if f['createable']]
        }
    except Exception as e:
        logger.error(f"[ERROR] Failed to get Salesforce fields: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_vehicle(request: Request):
    """Upload a new vehicle to Salesforce"""
    try:
        data = await request.json()
        logger.info(f"[UPLOAD] Received data: {data}")
        
        # Validate Required Fields
        if not data.get("veh") or not data.get("veh").strip():
            logger.error("[VALIDATION] Missing field: veh")
            raise HTTPException(status_code=400, detail="VEH (Vehicle Name) is required")
        
        if not data.get("registration_number") or not data.get("registration_number").strip():
            logger.error("[VALIDATION] Missing field: registration_number")
            raise HTTPException(status_code=400, detail="Registration number is required")
        
        if not data.get("van_number") or not data.get("van_number").strip():
            logger.error("[VALIDATION] Missing field: van_number")
            raise HTTPException(status_code=400, detail="Van number is required")
        
        logger.info("[VALIDATION] All required fields present")
        
        # Convert Date Format
        reg_date = None
        if data.get("registration_date"):
            try:
                parsed_date = datetime.strptime(data.get("registration_date"), "%d/%m/%Y")
                reg_date = parsed_date.strftime("%Y-%m-%d")
                logger.info(f"[DATE] Converted {data.get('registration_date')} → {reg_date}")
            except ValueError:
                try:
                    parsed_date = datetime.strptime(data.get("registration_date"), "%Y-%m-%d")
                    reg_date = parsed_date.strftime("%Y-%m-%d")
                    logger.info(f"[DATE] Already in correct format: {reg_date}")
                except ValueError:
                    logger.warning(f"[DATE] Invalid date format: {data.get('registration_date')}")
        
        # Map Frontend Fields → Salesforce Fields
        vehicle_data = {
            "Name": data.get("veh").strip(),
            "Reg_No__c": data.get("registration_number").strip(),
            "Van_Number__c": data.get("van_number").strip()
        }
        
        # Add optional fields - values are already in correct Salesforce format
        if data.get("tracking_number"):
            vehicle_data["Tracking_Number__c"] = data.get("tracking_number").strip()
        
        if data.get("vehicle_type"):
            vehicle_data["Vehicle_Type__c"] = data.get("vehicle_type").strip()
            logger.info(f"[FIELD] Vehicle Type: '{data.get('vehicle_type')}'")
        
        if data.get("status"):
            vehicle_data["Status__c"] = data.get("status").strip()
            logger.info(f"[FIELD] Status: '{data.get('status')}'")
        
        if data.get("ulez_compliant"):
            vehicle_data["ULEZ_Compliant__c"] = data.get("ulez_compliant").strip()
            logger.info(f"[FIELD] ULEZ Compliant: '{data.get('ulez_compliant')}'")
        
        if data.get("trade_group"):
            vehicle_data["Trade_Group__c"] = data.get("trade_group").strip()
            logger.info(f"[FIELD] Trade Group: '{data.get('trade_group')}'")
        
        if data.get("transmission"):
            vehicle_data["Transmission__c"] = data.get("transmission").strip()
            logger.info(f"[FIELD] Transmission: '{data.get('transmission')}'")
        
        if data.get("department_type"):
            vehicle_data["Department_Type__c"] = data.get("department_type").strip()
            logger.info(f"[FIELD] Department Type: '{data.get('department_type')}'")
        
        if reg_date:
            vehicle_data["Registration_Date__c"] = reg_date
        
        if data.get("make_model"):
            vehicle_data["Make_Model__c"] = data.get("make_model").strip()
        
        if data.get("vehicle_ownership"):
            vehicle_data["Vehicle_Ownership__c"] = data.get("vehicle_ownership").strip()
            logger.info(f"[FIELD] Vehicle Ownership: '{data.get('vehicle_ownership')}'")
        
        if data.get("garage_repairs"):
            vehicle_data["Garage_Repairs__c"] = data.get("garage_repairs").strip()
            logger.info(f"[FIELD] Garage Repairs: '{data.get('garage_repairs')}'")
        
        if data.get("internal_notes"):
            vehicle_data["Internal_Notes__c"] = data.get("internal_notes").strip()
        
        logger.info(f"[SALESFORCE] Sending vehicle data:")
        logger.info(f"[DATA] {vehicle_data}")
        
        # Send to Salesforce
        result = sf_service.create_vehicle(vehicle_data)
        
        if not result.get('success'):
            error_details = result.get('error', 'Unknown error')
            logger.error(f"[SALESFORCE] Creation failed: {error_details}")
            raise HTTPException(status_code=400, detail=f"Salesforce error: {error_details}")
        
        salesforce_id = result.get('id')
        logger.info(f"[SUCCESS] Vehicle created! Salesforce ID: {salesforce_id}")
        
        return {
            "success": True,
            "message": "Vehicle uploaded successfully to Salesforce!",
            "salesforce_id": salesforce_id,
            "data": {
                "veh": data.get("veh"),
                "registration_number": data.get("registration_number"),
                "van_number": data.get("van_number")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ERROR] Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred: {str(e)}"
        )


@router.get("/vehicles/recent")
async def get_recent_vehicles():
    """Get recently created vehicles from Salesforce"""
    try:
        query = """
            SELECT Id, Name, Reg_No__c, Van_Number__c, Status__c, 
                   Vehicle_Type__c, CreatedDate 
            FROM Vehicle__c 
            ORDER BY CreatedDate DESC 
            LIMIT 20
        """
        result = sf_service.query_records(query)
        
        count = result.get('totalSize', 0)
        logger.info(f"[QUERY] Found {count} vehicles")
        
        return {
            "success": True,
            "count": count,
            "vehicles": result.get('records', [])
        }
    except Exception as e:
        logger.error(f"[ERROR] Query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test")
async def test_endpoint():
    """Test endpoint"""
    return {
        "status": "ok", 
        "message": "Vehicle upload router is working!"
    }