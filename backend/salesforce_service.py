# -*- coding: utf-8 -*-
import os
from simple_salesforce import Salesforce
from dotenv import load_dotenv

load_dotenv()


class SalesforceService:
    """
    Pure Salesforce data access layer - NO intelligence, just execution
    """

    def __init__(self):
        """Initialize Salesforce connection"""
        username = os.getenv("SF_USERNAME")
        password = os.getenv("SF_PASSWORD")
        security_token = os.getenv("SF_SECURITY_TOKEN")
        domain = os.getenv("SF_DOMAIN", "login")

        # Check if credentials are configured
        if not all([username, password, security_token]) or "your_" in str(username):
            print("[WARNING]  Salesforce credentials not configured. Using mock data mode.")
            self.sf = None
            self.mock_mode = True
            return

        try:
            # simple-salesforce 1.12.5 doesn't support sandbox parameter
            # Initialize with credentials only - uses production by default
            self.sf = Salesforce(
                username=username,
                password=password,
                security_token=security_token,
                version="60.0",  # Use current Salesforce API version
            )
            self.mock_mode = False
            print(f"[OK] Connected to Salesforce (production) - API v60.0")
        except Exception as e:
            print(f"[WARNING]  Failed to connect to Salesforce: {e}. Using mock data mode.")
            self.sf = None
            self.mock_mode = True

    def execute_soql(self, query: str) -> list:
        """Execute SOQL query and return ALL results with proper pagination"""
        if self.mock_mode or not self.sf:
            print(f"[WARNING]  Mock mode: skipping query")
            return []
            
        try:
            print(f"[SEARCH] Executing: {query[:150]}...")
            
            # Use query_all for automatic pagination
            result = self.sf.query_all(query)
            records = result.get("records", [])
            
            # Clean metadata from all records
            cleaned = []
            for r in records:
                clean_record = {}
                for k, v in r.items():
                    if not k.startswith('attributes'):
                        # Handle nested objects (like Vehicle__r.Name)
                        if isinstance(v, dict) and 'attributes' in v:
                            # Extract nested fields
                            nested_clean = {nk: nv for nk, nv in v.items() if not nk.startswith('attributes')}
                            clean_record[k] = nested_clean
                        else:
                            clean_record[k] = v
                cleaned.append(clean_record)
            
            print(f"[OK] Returned {len(cleaned)} records (total in SF: {result.get('totalSize', len(cleaned))})")
            return cleaned
            
        except Exception as e:
            print(f"❌ SOQL Error: {e}")
            import traceback
            traceback.print_exc()
            return []

    # ========================================
    # SIMPLE DATA RETRIEVAL METHODS
    # ========================================

    def get_all_vehicles(self) -> list:
        """Get ALL vehicles - NO LIMIT"""
        query = """
            SELECT Id, Name, Reg_No__c, Van_Number__c, Status__c,
                   Trade_Group__c, Vehicle_Type__c, Vehicle_Ownership__c,
                   Service_Territory__c
            FROM Vehicle__c
        """
        return self.execute_soql(query)

    def get_vehicle_by_identifier(self, identifier: str) -> dict:
        """Get vehicle by Name, Reg_No, or Van_Number"""
        query = f"""
            SELECT Id, Name, Reg_No__c, Van_Number__c, Status__c,
                   Trade_Group__c, Vehicle_Type__c, Vehicle_Ownership__c,
                   Lease_Start_Date__c, Owned_Start_Date__c,
                   Service_Territory__c, Make_Model__c, Description__c,
                   Previous_Drivers__c
            FROM Vehicle__c
            WHERE Name = '{identifier}' 
               OR Reg_No__c = '{identifier}' 
               OR Van_Number__c = '{identifier}'
            LIMIT 1
        """
        results = self.execute_soql(query)
        if results:
            print(f"[OK] Found vehicle: {results[0].get('Name')} - {results[0].get('Reg_No__c')}")
            return results[0]
        else:
            print(f"❌ Vehicle not found: {identifier}")
            return None

    def get_vehicles_by_status(self, status: str) -> list:
        """Get vehicles by status - NO LIMIT"""
        query = f"""
            SELECT Id, Name, Reg_No__c, Van_Number__c, Status__c,
                   Trade_Group__c, Vehicle_Type__c
            FROM Vehicle__c
            WHERE Status__c = '{status}'
        """
        return self.execute_soql(query)

    def get_vehicle_allocations(self, vehicle_identifier: str = None) -> list:
        """Get current allocations - NO LIMIT"""
        if vehicle_identifier:
            where = f"(Vehicle__r.Name = '{vehicle_identifier}' OR Vehicle__r.Reg_No__c = '{vehicle_identifier}' OR Vehicle__r.Van_Number__c = '{vehicle_identifier}')"
        else:
            where = "End_date__c = null"
        # Primary (rich) query - may include related Email fields which aren't always present
        query_full = f"""
            SELECT 
                Id, 
                Vehicle__r.Name, 
                Vehicle__r.Reg_No__c,
                Vehicle__r.Van_Number__c,
                Service_Resource__r.Name, 
                Service_Resource__r.Email,
                Internal_Staff__r.Name, 
                Internal_Staff__r.Email,
                Start_date__c, 
                End_date__c,
                Reserved_For__c
            FROM Vehicle_Allocation__c
            WHERE {where}
            ORDER BY Start_date__c DESC
        """

        results = self.execute_soql(query_full)

        # If no results returned, it may be due to invalid nested fields (e.g. Email not present on related object).
        # Retry with a safer query that omits nested Email fields.
        if not results:
            print("[WARNING] Allocations full query returned no records — retrying with safe query without nested Email fields")
            query_safe = f"""
                SELECT 
                    Id, 
                    Vehicle__r.Name, 
                    Vehicle__r.Reg_No__c,
                    Vehicle__r.Van_Number__c,
                    Service_Resource__r.Name, 
                    Internal_Staff__r.Name, 
                    Start_date__c, 
                    End_date__c,
                    Reserved_For__c
                FROM Vehicle_Allocation__c
                WHERE {where}
                ORDER BY Start_date__c DESC
            """
            results = self.execute_soql(query_safe)

        print(f"📊 Allocations query returned {len(results)} records")
        return results

    def get_vehicle_costs(self, vehicle_identifier: str = None, limit: int = 100) -> list:
        """Get cost records"""
        if vehicle_identifier:
            where = f"Vehicle__r.Name = '{vehicle_identifier}' OR Vehicle__r.Reg_No__c = '{vehicle_identifier}' OR Vehicle__r.Van_Number__c = '{vehicle_identifier}'"
        else:
            where = "1=1"

        query = f"""
            SELECT 
                Vehicle__r.Name, 
                Vehicle__r.Reg_No__c,
                Type__c, 
                Payment_value__c, 
                Date__c, 
                Description__c
            FROM Vehicle_Cost__c
            WHERE {where}
            ORDER BY Date__c DESC
            LIMIT {limit}
        """
        return self.execute_soql(query)

    def get_vehicle_maintenance(self, vehicle_identifier: str = None) -> list:
        """Get maintenance info - NO LIMIT"""
        if vehicle_identifier:
            where = f"Name = '{vehicle_identifier}' OR Reg_No__c = '{vehicle_identifier}' OR Van_Number__c = '{vehicle_identifier}'"
        else:
            where = "Next_Service_Date__c != null OR Next_MOT_Date__c != null"

        query = f"""
            SELECT 
                Id, 
                Name, 
                Reg_No__c,
                Van_Number__c,
                Last_Service_Date__c, 
                Next_Service_Date__c,
                Last_MOT_Date__c, 
                Next_MOT_Date__c,
                Jetter__c, 
                Last_Jetter_Service__c, 
                Next_Jetter_Service__c
            FROM Vehicle__c
            WHERE {where}
            ORDER BY Next_Service_Date__c ASC NULLS LAST
        """
        return self.execute_soql(query)

    def get_vehicles_by_location(self, service_territory: str) -> list:
        """Get vehicles at location"""
        query = f"""
            SELECT 
                Id, 
                Name, 
                Reg_No__c, 
                Van_Number__c,
                Status__c,
                Trade_Group__c, 
                Service_Territory__c
            FROM Vehicle__c
            WHERE Service_Territory__c = '{service_territory}'
            ORDER BY Status__c
        """
        return self.execute_soql(query)

    def search_vehicle(self, search_term: str) -> list:
        """Search for vehicles by any field - useful for debugging"""
        query = f"""
            SELECT 
                Id, 
                Name, 
                Reg_No__c, 
                Van_Number__c, 
                Status__c,
                Trade_Group__c
            FROM Vehicle__c
            WHERE Name LIKE '%{search_term}%'
               OR Reg_No__c LIKE '%{search_term}%'
               OR Van_Number__c LIKE '%{search_term}%'
            LIMIT 10
        """
        return self.execute_soql(query)

    def get_engineers(self):
        """Get all active engineers - for backward compatibility"""
        query = """
            SELECT Id, Name, RelatedRecord.Email, Trade_Lookup__c 
            FROM ServiceResource 
            WHERE IsActive = true 
            ORDER BY Name ASC
        """
        return self.execute_soql(query)

    # ========================================
    # CREATE/UPDATE/DELETE METHODS
    # ========================================

    def create_vehicle(self, vehicle_data: dict) -> dict:
        """Create a new vehicle in Salesforce"""
        if self.mock_mode or not self.sf:
            print("[WARNING] Mock mode: vehicle creation skipped")
            return {"success": False, "message": "Mock mode enabled"}

        try:
            print(f"[CREATE] Creating vehicle with data: {vehicle_data}")
            result = self.sf.Vehicle__c.create(vehicle_data)
            print(f"[OK] Vehicle created with ID: {result.get('id')}")
            return {"success": result.get("success", True), "id": result.get("id"), **result}
        except Exception as e:
            print(f"[ERROR] Failed to create vehicle: {e}")
            return {"success": False, "error": str(e)}

    def describe_object(self, object_name: str) -> dict:
        """Get metadata for a Salesforce object"""
        if self.mock_mode or not self.sf:
            print("[WARNING] Mock mode: object describe skipped")
            return {"fields": [], "message": "Mock mode enabled"}

        try:
            print(f"[DESCRIBE] Getting metadata for {object_name}...")
            obj = getattr(self.sf, object_name)
            metadata = obj.describe()
            print(f"[OK] Retrieved metadata for {object_name}")
            return metadata
        except Exception as e:
            print(f"[ERROR] Failed to describe object {object_name}: {e}")
            return {"fields": [], "error": str(e)}

    def query_records(self, query: str) -> dict:
        """Execute a raw SOQL query and return raw result (for complex queries)"""
        if self.mock_mode or not self.sf:
            print("[WARNING] Mock mode: query skipped")
            return {"totalSize": 0, "records": []}

        try:
            print(f"[QUERY] Executing: {query[:150]}...")
            result = self.sf.query(query)
            print(f"[OK] Query returned {result.get('totalSize', 0)} records")
            return result
        except Exception as e:
            print(f"[ERROR] Query failed: {e}")
            return {"totalSize": 0, "records": [], "error": str(e)}
