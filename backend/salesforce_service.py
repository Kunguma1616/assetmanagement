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
        username       = os.getenv("SF_USERNAME")
        password       = os.getenv("SF_PASSWORD")
        security_token = os.getenv("SF_SECURITY_TOKEN")
        domain         = os.getenv("SF_DOMAIN", "login")

        if not all([username, password, security_token]) or "your_" in str(username):
            print("[WARNING] Salesforce credentials not configured. Using mock data mode.")
            self.sf        = None
            self.mock_mode = True
            return

        try:
            self.sf = Salesforce(
                username=username,
                password=password,
                security_token=security_token,
                version="60.0",
            )
            self.mock_mode = False
            print("[OK] Connected to Salesforce (production) - API v60.0")
        except Exception as e:
            print(f"[WARNING] Failed to connect to Salesforce: {e}. Using mock data mode.")
            self.sf        = None
            self.mock_mode = True

    # ─────────────────────────────────────────────────────────────────────────
    # CORE QUERY METHODS
    # ─────────────────────────────────────────────────────────────────────────

    def execute_soql(self, query: str) -> list:
        """
        Execute ANY SOQL query and return ALL results with automatic pagination.
        Uses query_all() so it never silently truncates at 2000 records.
        For aggregate queries (SUM/COUNT with GROUP BY) falls back to query().
        """
        if self.mock_mode or not self.sf:
            print("[WARNING] Mock mode: skipping query")
            return []

        try:
            print(f"[SEARCH] Executing: {query[:150]}...")

            # Aggregate queries (GROUP BY, COUNT, SUM, AVG) can't use query_all — use query() instead
            query_upper = query.upper()
            is_aggregate = "GROUP BY" in query_upper or (
                any(fn in query_upper for fn in ["COUNT(", "SUM(", "AVG(", "MIN(", "MAX("])
                and "GROUP BY" not in query_upper
            )

            if is_aggregate:
                result = self.sf.query(query)
            else:
                result = self.sf.query_all(query)

            records = result.get("records", [])

            # Clean SF metadata from all records recursively
            cleaned = [self._clean_record(r) for r in records]

            print(f"[OK] Returned {len(cleaned)} records (total in SF: {result.get('totalSize', len(cleaned))})")
            return cleaned

        except Exception as e:
            print(f"[ERROR] SOQL failed: {e}")
            import traceback
            traceback.print_exc()
            return []

    def execute_soql_count(self, query: str) -> int:
        """
        Execute a COUNT() aggregate SOQL query and return the integer result.
        Handles both:
          - SELECT COUNT() FROM ...          → uses totalSize
          - SELECT COUNT(Id) cnt FROM ...    → reads first record field
        """
        if self.mock_mode or not self.sf:
            print("[WARNING] Mock mode: skipping count query")
            return 0

        try:
            print(f"[COUNT] Executing: {query[:150]}...")
            # COUNT queries must use query() not query_all()
            result = self.sf.query(query)

            # SELECT COUNT() returns totalSize directly
            if "SELECT COUNT()" in query.upper():
                count = result.get("totalSize", 0)
                print(f"[OK] COUNT() result: {count}")
                return int(count)

            # SELECT COUNT(Id) alias returns in records[0]
            records = result.get("records", [])
            if records:
                first = records[0]
                for key, val in first.items():
                    if key != "attributes" and val is not None:
                        count = int(val)
                        print(f"[OK] COUNT field [{key}]: {count}")
                        return count

            # Fallback to totalSize
            count = result.get("totalSize", 0)
            print(f"[OK] COUNT fallback totalSize: {count}")
            return int(count)

        except Exception as e:
            print(f"[ERROR] COUNT query failed: {e}")
            import traceback
            traceback.print_exc()
            return 0

    def _clean_record(self, record: dict) -> dict:
        """Recursively strip Salesforce 'attributes' metadata from records."""
        clean = {}
        for k, v in record.items():
            if k == "attributes":
                continue
            if isinstance(v, dict):
                clean[k] = self._clean_record(v)
            else:
                clean[k] = v
        return clean

    # ─────────────────────────────────────────────────────────────────────────
    # VEHICLE METHODS
    # ─────────────────────────────────────────────────────────────────────────

    def get_all_vehicles(self) -> list:
        return self.execute_soql("""
            SELECT Id, Name, Reg_No__c, Van_Number__c, Status__c,
                   Trade_Group__c, Vehicle_Type__c, Vehicle_Ownership__c,
                   Service_Territory__c
            FROM Vehicle__c
        """)

    def get_vehicle_by_identifier(self, identifier: str) -> dict:
        results = self.execute_soql(f"""
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
        """)
        if results:
            print(f"[OK] Found vehicle: {results[0].get('Name')} - {results[0].get('Reg_No__c')}")
            return results[0]
        print(f"[ERROR] Vehicle not found: {identifier}")
        return None

    def get_vehicles_by_status(self, status: str) -> list:
        return self.execute_soql(f"""
            SELECT Id, Name, Reg_No__c, Van_Number__c, Status__c, Trade_Group__c, Vehicle_Type__c
            FROM Vehicle__c
            WHERE Status__c = '{status}'
        """)

    def get_vehicle_allocations(self, vehicle_identifier: str = None) -> list:
        where = (
            f"(Vehicle__r.Name = '{vehicle_identifier}' OR "
            f"Vehicle__r.Reg_No__c = '{vehicle_identifier}' OR "
            f"Vehicle__r.Van_Number__c = '{vehicle_identifier}')"
            if vehicle_identifier else "End_date__c = null"
        )

        results = self.execute_soql(f"""
            SELECT Id,
                   Vehicle__r.Name, Vehicle__r.Reg_No__c, Vehicle__r.Van_Number__c,
                   Service_Resource__r.Name, Service_Resource__r.Email,
                   Internal_Staff__r.Name, Internal_Staff__r.Email,
                   Start_date__c, End_date__c, Reserved_For__c
            FROM Vehicle_Allocation__c
            WHERE {where}
            ORDER BY Start_date__c DESC
        """)

        if not results:
            print("[WARNING] Full allocation query returned nothing — retrying without Email fields")
            results = self.execute_soql(f"""
                SELECT Id,
                       Vehicle__r.Name, Vehicle__r.Reg_No__c, Vehicle__r.Van_Number__c,
                       Service_Resource__r.Name, Internal_Staff__r.Name,
                       Start_date__c, End_date__c, Reserved_For__c
                FROM Vehicle_Allocation__c
                WHERE {where}
                ORDER BY Start_date__c DESC
            """)

        print(f"[OK] Allocations: {len(results)} records")
        return results

    def get_vehicle_costs(self, vehicle_identifier: str = None, limit: int = 100) -> list:
        where = (
            f"Vehicle__r.Name = '{vehicle_identifier}' OR "
            f"Vehicle__r.Reg_No__c = '{vehicle_identifier}' OR "
            f"Vehicle__r.Van_Number__c = '{vehicle_identifier}'"
            if vehicle_identifier else "1=1"
        )
        return self.execute_soql(f"""
            SELECT Vehicle__r.Name, Vehicle__r.Reg_No__c,
                   Type__c, Payment_value__c, Date__c, Description__c
            FROM Vehicle_Cost__c
            WHERE {where}
            ORDER BY Date__c DESC
            LIMIT {limit}
        """)

    def get_vehicle_maintenance(self, vehicle_identifier: str = None) -> list:
        where = (
            f"Name = '{vehicle_identifier}' OR Reg_No__c = '{vehicle_identifier}' OR Van_Number__c = '{vehicle_identifier}'"
            if vehicle_identifier
            else "Next_Service_Date__c != null OR Next_MOT_Date__c != null"
        )
        return self.execute_soql(f"""
            SELECT Id, Name, Reg_No__c, Van_Number__c,
                   Last_Service_Date__c, Next_Service_Date__c,
                   Last_MOT_Date__c, Next_MOT_Date__c,
                   Jetter__c, Last_Jetter_Service__c, Next_Jetter_Service__c
            FROM Vehicle__c
            WHERE {where}
            ORDER BY Next_Service_Date__c ASC NULLS LAST
        """)

    def get_vehicles_by_location(self, service_territory: str) -> list:
        return self.execute_soql(f"""
            SELECT Id, Name, Reg_No__c, Van_Number__c, Status__c,
                   Trade_Group__c, Service_Territory__c
            FROM Vehicle__c
            WHERE Service_Territory__c = '{service_territory}'
            ORDER BY Status__c
        """)

    def search_vehicle(self, search_term: str) -> list:
        return self.execute_soql(f"""
            SELECT Id, Name, Reg_No__c, Van_Number__c, Status__c, Trade_Group__c
            FROM Vehicle__c
            WHERE Name LIKE '%{search_term}%'
               OR Reg_No__c LIKE '%{search_term}%'
               OR Van_Number__c LIKE '%{search_term}%'
            LIMIT 10
        """)

    def get_engineers(self) -> list:
        return self.execute_soql("""
            SELECT Id, Name, RelatedRecord.Email, Trade_Lookup__c
            FROM ServiceResource
            WHERE IsActive = true
            ORDER BY Name ASC
        """)

    # ─────────────────────────────────────────────────────────────────────────
    # CREATE / UPDATE / DELETE
    # ─────────────────────────────────────────────────────────────────────────

    def create_vehicle(self, vehicle_data: dict) -> dict:
        if self.mock_mode or not self.sf:
            return {"success": False, "message": "Mock mode enabled"}
        try:
            print(f"[CREATE] Creating vehicle: {vehicle_data}")
            result = self.sf.Vehicle__c.create(vehicle_data)
            print(f"[OK] Vehicle created: {result.get('id')}")
            return {"success": result.get("success", True), "id": result.get("id"), **result}
        except Exception as e:
            print(f"[ERROR] Create vehicle failed: {e}")
            return {"success": False, "error": str(e)}

    def describe_object(self, object_name: str) -> dict:
        if self.mock_mode or not self.sf:
            return {"fields": [], "message": "Mock mode enabled"}
        try:
            print(f"[DESCRIBE] {object_name}...")
            obj      = getattr(self.sf, object_name)
            metadata = obj.describe()
            print(f"[OK] Described {object_name}")
            return metadata
        except Exception as e:
            print(f"[ERROR] Describe {object_name} failed: {e}")
            return {"fields": [], "error": str(e)}

    def query_records(self, query: str) -> dict:
        """Raw query returning full SF result dict (for complex/legacy use)."""
        if self.mock_mode or not self.sf:
            return {"totalSize": 0, "records": []}
        try:
            print(f"[QUERY] Executing: {query[:150]}...")
            result = self.sf.query(query)
            print(f"[OK] Query returned {result.get('totalSize', 0)} records")
            return result
        except Exception as e:
            print(f"[ERROR] Query failed: {e}")
            return {"totalSize": 0, "records": [], "error": str(e)}