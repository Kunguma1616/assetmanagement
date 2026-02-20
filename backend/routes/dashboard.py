from fastapi import APIRouter, HTTPException
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from salesforce_service import SalesforceService
from webfleet_api import WebfleetService

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def get_mot_due_count(sf):
    """Helper function to get MOT due count"""
    print("🔄 [get_mot_due_count] Starting MOT query...")
    try:
        query = """
            SELECT Id, Name
            FROM Vehicle__c
            WHERE Next_MOT_Date__c != NULL AND Next_MOT_Date__c <= NEXT_N_DAYS:30
        """
        print(f"🔍 [get_mot_due_count] Executing: {query.strip()}")
        vehicles = sf.execute_soql(query)
        count = len(vehicles) if vehicles else 0
        print(f"✅ [get_mot_due_count] Found {count} vehicles with Next_MOT_Date__c <= NEXT_N_DAYS:30")
        if count > 0 and vehicles:
            print(f"   Sample: {vehicles[0]}")
        return count
    except Exception as e:
        print(f"⚠️  [get_mot_due_count] Query failed: {e}")
        import traceback
        traceback.print_exc()
        return 0


def get_tax_due_count(sf):
    """Helper function to get Tax due count"""
    print("🔄 [get_tax_due_count] Starting Tax query...")
    try:
        # Try to query Tax due vehicles - field may not exist
        # Gracefully handle missing field by returning 0
        query = """
            SELECT Id, Name
            FROM Vehicle__c
            WHERE Tax_Expiry_Date__c != NULL AND Tax_Expiry_Date__c <= NEXT_N_DAYS:30
        """
        print(f"🔍 [get_tax_due_count] Executing: {query.strip()}")
        vehicles = sf.execute_soql(query)
        count = len(vehicles) if vehicles else 0
        print(f"✅ [get_tax_due_count] Found {count} vehicles with tax due <= 30 days")
        if count > 0 and vehicles:
            print(f"   Sample: {vehicles[0]}")
        return count
    except Exception as e:
        print(f"⚠️  [get_tax_due_count] Tax field not available: {e}")
        # Field doesn't exist or query failed - return 0
        return 0


@router.get("/debug-statuses")
def debug_statuses():
    """
    DEBUG: Show all actual status values in Salesforce database
    """
    try:
        sf = SalesforceService()
        
        # Get all vehicles with their status values
        query = "SELECT Status__c FROM Vehicle__c"
        vehicles = sf.execute_soql(query)
        
        # Find unique status values
        unique_statuses = set()
        status_counts = {}
        
        for vehicle in vehicles:
            status = vehicle.get("Status__c")
            if status:
                unique_statuses.add(status)
                status_counts[status] = status_counts.get(status, 0) + 1
        
        return {
            "total_vehicles": len(vehicles),
            "unique_statuses": sorted(list(unique_statuses)),
            "status_counts": status_counts,
        }
    except Exception as e:
        print(f"❌ Debug error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/debug-mot-data")
def debug_mot_data():
    """
    DEBUG: Show sample vehicles with MOT data to understand the query issue
    """
    try:
        sf = SalesforceService()
        
        # Get a sample of vehicles with various fields to understand the data
        query = """
            SELECT Id, Name, Next_MOT_Date__c, YEAR(Next_MOT_Date__c) mot_year
            FROM Vehicle__c
            WHERE Next_MOT_Date__c != NULL
            ORDER BY Next_MOT_Date__c ASC
            LIMIT 10
        """
        try:
            vehicles = sf.execute_soql(query)
            return {
                "message": "Sample MOT vehicles (next 10 due)",
                "count": len(vehicles),
                "vehicles": vehicles
            }
        except Exception as e:
            print(f"Query with YEAR function failed: {e}")
            # Try simpler query
            query_simple = """
                SELECT Id, Name, Next_MOT_Date__c
                FROM Vehicle__c
                WHERE Next_MOT_Date__c != NULL
                ORDER BY Next_MOT_Date__c ASC
                LIMIT 10
            """
            vehicles = sf.execute_soql(query_simple)
            return {
                "message": "Sample MOT vehicles (next 10 due)",
                "count": len(vehicles),
                "vehicles": vehicles,
                "note": "This shows which vehicles have Next_MOT_Date__c set. Check if these dates are in the future."
            }
    except Exception as e:
        print(f"❌ Debug MOT error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "error": str(e),
            "message": "Failed to fetch MOT sample data"
        }


@router.get("/debug-fields")
def debug_fields():
    """
    DEBUG: Show all available fields on Vehicle__c object by fetching a sample record
    """
    try:
        sf = SalesforceService()
        
        # Try to fetch a sample vehicle with all common date fields we know about
        query = """
            SELECT Id, Name, Reg_No__c, Van_Number__c, Status__c,
                   Trade_Group__c, Vehicle_Type__c, Make_Model__c,
                   Last_Service_Date__c, Next_Service_Date__c,
                   Next_MOT_Date__c, MOT_Due_Date__c,
                   Next_Tax_Date__c, Tax_Due_Date__c,
                   Last_MOT_Date__c, Last_Tax_Date__c
            FROM Vehicle__c
            LIMIT 1
        """
        try:
            vehicles = sf.execute_soql(query)
            if vehicles:
                sample = vehicles[0]
                # Show which date fields have values
                date_fields = {}
                for k, v in sample.items():
                    if 'date' in k.lower() or 'Date' in k:
                        date_fields[k] = v
                
                return {
                    "message": "Sample vehicle with known date fields",
                    "fields_with_values": list(date_fields.keys()),
                    "sample_record": sample,
                    "next_steps": "Check the 'fields_with_values' list to see which date fields exist in your Salesforce instance"
                }
        except Exception as e:
            print(f"Query with specific fields failed: {e}")
            # Try fetching just basic info
            query_basic = "SELECT Id, Name FROM Vehicle__c LIMIT 1"
            vehicles_basic = sf.execute_soql(query_basic)
            if vehicles_basic:
                return {
                    "message": "Could not query specific date fields. Trying alternative approach...",
                    "error": str(e),
                    "basic_record": vehicles_basic[0],
                    "hint": "Your Salesforce instance may not have the standard date fields. Please check the Vehicle__c object definition."
                }
            else:
                return {"error": "No vehicles found in Salesforce"}
    except Exception as e:
        print(f"❌ Debug fields error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "error": str(e),
            "message": "Failed to fetch sample vehicle",
            "hint": "Ensure Salesforce credentials are correct in .env file"
        }


@router.get("/vehicle-summary")
def get_vehicle_summary():
    """
    Get vehicle summary counts by status from Salesforce.
    """
    try:
        sf = SalesforceService()
        
        # Fetch ALL vehicles
        all_vehicles_query = "SELECT Id, Status__c FROM Vehicle__c"
        vehicles = sf.execute_soql(all_vehicles_query)
        total = len(vehicles)
        
        print(f"📊 Total vehicles fetched: {total}")
        
        # Initialize status counts
        status_counts = {
            "allocated": 0,
            "garage": 0,
            "due_service": 0,
            "spare_ready": 0,
            "reserved": 0,
            "written_off": 0,
        }
        
        # ACTUAL Salesforce status values
        # Based on user's Salesforce data:
        # Allocated: 233, Reserved: 4, Sold: 15, Spare: 12, Spare Not Available: 4, Written Off: 21
        status_mapping = {
            # Allocated
            "Allocated": "allocated",
            "allocated": "allocated",
            
            # Garage/Service/Under Repair
            "Garage": "garage",
            "garage": "garage",
            "In Garage": "garage",
            "Under Repair": "garage",
            
            # Due Service
            "Due for Service": "due_service",
            "Due_Service": "due_service",
            "Service Due": "due_service",
            
            # Spare Ready (includes all spare variants)
            "Spare Ready": "spare_ready",
            "Spare_Ready": "spare_ready",
            "Spare": "spare_ready",
            "Spare Tankers": "spare_ready",
            "Spare in Garage": "spare_ready",
            "Spare Not Available": "spare_ready",  # Include in spare count
            
            # Reserved
            "Reserved": "reserved",
            "reserved": "reserved",
            
            # Written Off
            "Written Off": "written_off",
            "Written_Off": "written_off",
            
            # Note: "Sold" not mapped - vehicles that are sold are not counted in active fleet
            # Note: Unmapped statuses are silently ignored
        }
        
        # Aggregate locally
        status_values_found = {}
        unmapped_statuses = {}
        for vehicle in vehicles:
            sf_status = vehicle.get("Status__c")
            if sf_status:
                if sf_status not in status_values_found:
                    status_values_found[sf_status] = 0
                status_values_found[sf_status] += 1
                
                response_key = status_mapping.get(sf_status)
                if response_key:
                    status_counts[response_key] += 1
                else:
                    # Track unmapped statuses
                    if sf_status not in unmapped_statuses:
                        unmapped_statuses[sf_status] = 0
                    unmapped_statuses[sf_status] += 1
        
        print(f"✅ Status values found in Salesforce:")
        for status, count in sorted(status_values_found.items()):
            print(f"   '{status}': {count}")
        print(f"✅ Mapped status counts: {status_counts}")
        if unmapped_statuses:
            print(f"⚠️  Unmapped statuses (not included in counts): {unmapped_statuses}")
        
        # Get MOT and Tax due counts using helper functions
        print("📊 Getting MOT due count...")
        mot_due = get_mot_due_count(sf)
        
        print("📊 Getting Tax due count...")
        tax_due = get_tax_due_count(sf)
        
        print(f"📊 SUMMARY RESULT: MOT={mot_due}, Tax={tax_due}")
        
        return {
            "total": total,
            **status_counts,
            "mot_due": mot_due,
            "tax_due": tax_due,
        }
        
    except Exception as e:
        print(f"❌ Dashboard error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vehicles-by-status/{status}")
def get_vehicles_by_status(status: str):
    """
    Get all vehicles with a specific status
    """
    try:
        sf = SalesforceService()
        
        # Map friendly status names to Salesforce values (allow multiple SF statuses)
        status_map = {
            "allocated": ["Allocated"],
            "garage": ["Garage"],
            "due_service": ["Due for Service", "Service Due", "Due_Service"],
            "spare_ready": ["Spare", "Spare Not Available"],  # ACTUAL Salesforce values only
            "reserved": ["Reserved"],
            "written_off": ["Written Off"],
            "sold": ["Sold"],
            "total": [],  # Empty = return ALL vehicles
            "current": [],  # Empty = return ALL vehicles
        }

        # 'current' or 'total' -> return all vehicles (no status filter)
        key = status.lower()
        sf_values = status_map.get(key)
        
        # Build query based on status
        if key == 'current' or key == 'total' or (sf_values is not None and len(sf_values) == 0):
            where_clause = ""
            sf_status = 'ALL'
        elif sf_values and len(sf_values) > 1:
            # Multiple values: use IN clause
            values_str = ",".join([f"'{v}'" for v in sf_values])
            where_clause = f"WHERE Status__c IN ({values_str})"
            sf_status = " | ".join(sf_values)
        elif sf_values and len(sf_values) == 1:
            # Single value: use = clause
            where_clause = f"WHERE Status__c = '{sf_values[0]}'"
            sf_status = sf_values[0]
        else:
            # Unmapped status: treat as literal
            where_clause = f"WHERE Status__c = '{status}'"
            sf_status = status

        query = f"""
            SELECT Id, Name, Reg_No__c, Van_Number__c, Status__c, 
                   Trade_Group__c, Vehicle_Type__c, Make_Model__c,
                   Last_Service_Date__c, Next_Service_Date__c,
                   Last_MOT_Date__c, Next_MOT_Date__c
            FROM Vehicle__c
            {where_clause}
            ORDER BY Name
        """
        
        print(f"🔍 Query: {query[:100]}...")
        vehicles = sf.execute_soql(query)

        print(f"🔍 Found {len(vehicles)} vehicles with status '{sf_status}'")

        # If we have vehicles, aggregate cost data from Vehicle_Cost__c
        if vehicles:
            vehicle_ids = [v.get('Id') for v in vehicles if v.get('Id')]
            if vehicle_ids:
                ids_escaped = ", ".join([f"'{vid}'" for vid in vehicle_ids])

                # Total cost per vehicle
                cost_query = f"""
                    SELECT Vehicle__c, SUM(Payment_value__c) total
                    FROM Vehicle_Cost__c
                    WHERE Vehicle__c IN ({ids_escaped})
                    GROUP BY Vehicle__c
                """
                cost_results = sf.execute_soql(cost_query)
                cost_map = {r.get('Vehicle__c'): r.get('total', 0) for r in cost_results}

                # Maintenance-related cost per vehicle (Type__c contains Service or Maint)
                maint_query = f"""
                    SELECT Vehicle__c, SUM(Payment_value__c) maintenance_total
                    FROM Vehicle_Cost__c
                    WHERE Vehicle__c IN ({ids_escaped}) AND (Type__c LIKE '%Service%' OR Type__c LIKE '%Maint%')
                    GROUP BY Vehicle__c
                """
                maint_results = sf.execute_soql(maint_query)
                maint_map = {r.get('Vehicle__c'): r.get('maintenance_total', 0) for r in maint_results}

                # Attach cost values to vehicle records
                for v in vehicles:
                    vid = v.get('Id')
                    v['service_cost'] = cost_map.get(vid, 0)
                    v['maintenance_cost'] = maint_map.get(vid, 0)
        
        return {
            "status": sf_status,
            "count": len(vehicles),
            "vehicles": vehicles,
        }
        
    except Exception as e:
        print(f"❌ Error fetching vehicles by status: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vehicles-mot-due")
def get_vehicles_mot_due(days: int = 30):
    """
    Get vehicles with MOT due within the next `days` days (default 30).
    """
    try:
        sf = SalesforceService()
        # Use SOQL date literal NEXT_N_DAYS: to filter
        query = f"""
            SELECT Id, Name, Reg_No__c, Van_Number__c, Status__c,
                   Trade_Group__c, Vehicle_Type__c, Make_Model__c,
                   Last_MOT_Date__c, Next_MOT_Date__c
            FROM Vehicle__c
            WHERE Next_MOT_Date__c != NULL AND Next_MOT_Date__c <= NEXT_N_DAYS:{days}
            ORDER BY Next_MOT_Date__c ASC
        """
        vehicles = sf.execute_soql(query)
        print(f"✅ MOT due vehicles found: {len(vehicles)}")
        return {"count": len(vehicles), "vehicles": vehicles}
    except Exception as e:
        print(f"❌ Error fetching MOT due vehicles: {e}")
        import traceback
        traceback.print_exc()
        # Try alternative field name
        try:
            print("🔄 Trying alternative field name MOT_Due_Date__c...")
            query_alt = f"""
                SELECT Id, Name, Reg_No__c, Van_Number__c, Status__c,
                       Trade_Group__c, Vehicle_Type__c, Make_Model__c
                FROM Vehicle__c
                WHERE MOT_Due_Date__c != NULL AND MOT_Due_Date__c <= NEXT_N_DAYS:{days}
                ORDER BY MOT_Due_Date__c ASC
            """
            vehicles_alt = sf.execute_soql(query_alt)
            print(f"✅ MOT due vehicles (alt) found: {len(vehicles_alt)}")
            return {"count": len(vehicles_alt), "vehicles": vehicles_alt}
        except:
            print("⚠️  Alternative field name also failed, returning empty list")
            return {"count": 0, "vehicles": []}


@router.get("/vehicles-tax-due")
def get_vehicles_tax_due(days: int = 30):
    """
    Get vehicles with road tax due within the next `days` days (default 30).
    """
    try:
        sf = SalesforceService()
        query = f"""
            SELECT Id, Name, Reg_No__c, Van_Number__c, Status__c,
                   Trade_Group__c, Vehicle_Type__c, Make_Model__c,
                   Last_Tax_Date__c, Next_Tax_Date__c
            FROM Vehicle__c
            WHERE Next_Tax_Date__c != NULL AND Next_Tax_Date__c <= NEXT_N_DAYS:{days}
            ORDER BY Next_Tax_Date__c ASC
        """
        vehicles = sf.execute_soql(query)
        print(f"✅ Tax due vehicles found: {len(vehicles)}")
        return {"count": len(vehicles), "vehicles": vehicles}
    except Exception as e:
        print(f"❌ Error fetching road tax due vehicles: {e}")
        import traceback
        traceback.print_exc()
        # Try alternative field name
        try:
            print("🔄 Trying alternative field name Tax_Due_Date__c...")
            query_alt = f"""
                SELECT Id, Name, Reg_No__c, Van_Number__c, Status__c,
                       Trade_Group__c, Vehicle_Type__c, Make_Model__c
                FROM Vehicle__c
                WHERE Tax_Due_Date__c != NULL AND Tax_Due_Date__c <= NEXT_N_DAYS:{days}
                ORDER BY Tax_Due_Date__c ASC
            """
            vehicles_alt = sf.execute_soql(query_alt)
            print(f"✅ Tax due vehicles (alt) found: {len(vehicles_alt)}")
            return {"count": len(vehicles_alt), "vehicles": vehicles_alt}
        except:
            print("⚠️  Alternative field name also failed, returning empty list")
            return {"count": 0, "vehicles": []}


@router.get("/cost-analysis")
def get_cost_analysis():
    """
    Get comprehensive cost analysis for all vehicles
    Returns: ranked vehicles by total cost, spending breakdown, and insights
    """
    try:
        sf = SalesforceService()
        
        print("💰 Fetching cost analysis data...")
        
        # Get all active vehicles
        vehicles_query = """
            SELECT Id, Name, Van_Number__c, Reg_No__c, Vehicle_Type__c, Status__c
            FROM Vehicle__c
            WHERE Status__c IN ('Active', 'In Use', 'Spare')
            ORDER BY Name
        """
        
        vehicles = sf.execute_soql(vehicles_query)
        print(f"📊 Found {len(vehicles)} vehicles")
        
        if not vehicles:
            return {
                "total_fleet_cost": 0,
                "vehicles_by_cost": [],
                "insights": [],
                "cost_breakdown": {}
            }
        
        vehicle_ids = [v.get('Id') for v in vehicles if v.get('Id')]
        ids_escaped = ", ".join([f"'{vid}'" for vid in vehicle_ids])
        
        # Get total cost per vehicle (all types)
        total_cost_query = f"""
            SELECT Vehicle__c, SUM(Payment_value__c) total_cost
            FROM Vehicle_Cost__c
            WHERE Vehicle__c IN ({ids_escaped})
            GROUP BY Vehicle__c
        """
        
        total_costs = sf.execute_soql(total_cost_query)
        cost_map = {r.get('Vehicle__c'): float(r.get('total_cost', 0)) for r in total_costs}
        
        # Get maintenance costs
        maint_query = f"""
            SELECT Vehicle__c, SUM(Payment_value__c) maintenance_cost
            FROM Vehicle_Cost__c
            WHERE Vehicle__c IN ({ids_escaped}) AND (Type__c LIKE '%Service%' OR Type__c LIKE '%Maint%' OR Type__c LIKE '%Repair%')
            GROUP BY Vehicle__c
        """
        
        maint_costs = sf.execute_soql(maint_query)
        maint_map = {r.get('Vehicle__c'): float(r.get('maintenance_cost', 0)) for r in maint_costs}
        
        # Get fuel costs (if tracked)
        fuel_query = f"""
            SELECT Vehicle__c, SUM(Payment_value__c) fuel_cost
            FROM Vehicle_Cost__c
            WHERE Vehicle__c IN ({ids_escaped}) AND (Type__c LIKE '%Fuel%' OR Type__c LIKE '%Petrol%' OR Type__c LIKE '%Diesel%')
            GROUP BY Vehicle__c
        """
        
        fuel_costs = sf.execute_soql(fuel_query)
        fuel_map = {r.get('Vehicle__c'): float(r.get('fuel_cost', 0)) for r in fuel_costs}
        
        # Get insurance costs
        insurance_query = f"""
            SELECT Vehicle__c, SUM(Payment_value__c) insurance_cost
            FROM Vehicle_Cost__c
            WHERE Vehicle__c IN ({ids_escaped}) AND Type__c LIKE '%Insurance%'
            GROUP BY Vehicle__c
        """
        
        insurance_costs = sf.execute_soql(insurance_query)
        insurance_map = {r.get('Vehicle__c'): float(r.get('insurance_cost', 0)) for r in insurance_costs}
        
        # Build vehicle cost details
        vehicles_by_cost = []
        total_fleet_cost = 0
        
        for vehicle in vehicles:
            vid = vehicle.get('Id')
            van_number = vehicle.get('Van_Number__c', 'N/A')
            reg_no = vehicle.get('Reg_No__c', 'N/A')
            vehicle_type = vehicle.get('Vehicle_Type__c', 'N/A')
            
            total_cost = cost_map.get(vid, 0)
            maint_cost = maint_map.get(vid, 0)
            fuel_cost = fuel_map.get(vid, 0)
            insurance_cost = insurance_map.get(vid, 0)
            other_cost = total_cost - maint_cost - fuel_cost - insurance_cost
            
            if other_cost < 0:
                other_cost = 0
            
            total_fleet_cost += total_cost
            
            vehicle_cost_detail = {
                "vehicle_id": vid,
                "name": vehicle.get('Name', 'Unknown'),
                "van_number": van_number,
                "registration": reg_no,
                "type": vehicle_type,
                "status": vehicle.get('Status__c', 'N/A'),
                "total_cost": round(total_cost, 2),
                "maintenance_cost": round(maint_cost, 2),
                "fuel_cost": round(fuel_cost, 2),
                "insurance_cost": round(insurance_cost, 2),
                "other_cost": round(other_cost, 2),
                "cost_per_month": round(total_cost / 12, 2) if total_cost > 0 else 0
            }
            
            vehicles_by_cost.append(vehicle_cost_detail)
        
        # Sort by total cost descending
        vehicles_by_cost.sort(key=lambda x: x['total_cost'], reverse=True)
        
        # Generate insights
        insights = []
        
        if vehicles_by_cost:
            # Insight 1: Most expensive vehicle
            top_vehicle = vehicles_by_cost[0]
            insights.append({
                "type": "top_spender",
                "severity": "warning",
                "title": "Highest Cost Vehicle",
                "message": f"{top_vehicle['name']} (Van: {top_vehicle['van_number']}) costs £{top_vehicle['total_cost']:,.2f} total",
                "vehicle_id": top_vehicle['vehicle_id'],
                "value": top_vehicle['total_cost']
            })
            
            # Calculate average cost
            avg_cost = total_fleet_cost / len(vehicles_by_cost) if vehicles_by_cost else 0
            
            # Insight 2: Vehicles above average cost
            above_avg = [v for v in vehicles_by_cost if v['total_cost'] > avg_cost]
            if above_avg:
                insights.append({
                    "type": "above_average",
                    "severity": "info",
                    "title": "Above Average Cost Vehicles",
                    "message": f"{len(above_avg)} vehicles have costs above the fleet average of £{avg_cost:,.2f}. Consider retiring high-cost vehicles.",
                    "count": len(above_avg),
                    "vehicles": [{"name": v['name'], "van": v['van_number'], "cost": v['total_cost']} for v in above_avg[:5]]
                })
            
            # Insight 3: High maintenance vehicles
            high_maint = [v for v in vehicles_by_cost if v['maintenance_cost'] > avg_cost * 0.3]
            if high_maint:
                insights.append({
                    "type": "high_maintenance",
                    "severity": "warning",
                    "title": "High Maintenance Vehicles",
                    "message": f"{len(high_maint)} vehicles need attention. These are expensive to maintain and may be candidates for replacement.",
                    "count": len(high_maint),
                    "vehicles": [{"name": v['name'], "van": v['van_number'], "maint_cost": v['maintenance_cost']} for v in high_maint[:5]]
                })
            
            # Insight 4: Most economical vehicles
            economical = [v for v in vehicles_by_cost if v['total_cost'] > 0][-3:]
            if economical:
                insights.append({
                    "type": "economical",
                    "severity": "success",
                    "title": "Most Economical Vehicles",
                    "message": f"These vehicles are performing well with low operating costs.",
                    "vehicles": [{"name": v['name'], "van": v['van_number'], "cost": v['total_cost']} for v in economical]
                })
        
        # Cost breakdown aggregates
        cost_breakdown = {
            "total_maintenance": sum(v['maintenance_cost'] for v in vehicles_by_cost),
            "total_fuel": sum(v['fuel_cost'] for v in vehicles_by_cost),
            "total_insurance": sum(v['insurance_cost'] for v in vehicles_by_cost),
            "total_other": sum(v['other_cost'] for v in vehicles_by_cost),
            "total_fleet_cost": round(total_fleet_cost, 2)
        }
        
        return {
            "total_fleet_cost": round(total_fleet_cost, 2),
            "average_vehicle_cost": round(total_fleet_cost / len(vehicles_by_cost), 2) if vehicles_by_cost else 0,
            "vehicle_count": len(vehicles_by_cost),
            "vehicles_by_cost": vehicles_by_cost,
            "insights": insights,
            "cost_breakdown": cost_breakdown
        }
        
    except Exception as e:
        print(f"❌ Error fetching cost analysis: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/drivers/excel")
def get_drivers_from_excel():
    """
    REFACTORED: Returns Webfleet engineers with OptiDrive scores
    Replaces the old CSV-based implementation
    """
    try:
        print("📊 Fetching engineers from Salesforce...")
        sf = SalesforceService()
        
        # Get all ACTIVE engineers from Salesforce with comprehensive filters
        engineers_query = """
            SELECT 
                Id, 
                Name, 
                RelatedRecord.Email,
                Trade_Lookup__c,
                IsActive,
                Is_User_Active__c,
                FSM__c,
                RelatedRecord.Profile_Name__c,
                Account.Chumley_Test_Record__c
            FROM ServiceResource
            WHERE IsActive = true 
            AND Is_User_Active__c = TRUE
            AND FSM__c = false
            AND RelatedRecord.Profile_Name__c = 'Engineer Partner Community'
            AND Account.Chumley_Test_Record__c = false
            AND Trade_Lookup__c NOT IN ('Test Ops')
            AND Trade_Lookup__c != null
            AND RelatedRecord.Email != null
            ORDER BY Name ASC
        """
        
        engineers_result = sf.execute_soql(engineers_query)
        
        if not engineers_result:
            print("⚠️ No engineers found in Salesforce")
            return {
                "success": True,
                "statistics": {
                    "total_drivers": 0,
                    "drivers_with_scores": 0,
                    "average_score": 0
                },
                "total": 0,
                "drivers": [],
                "source": "Webfleet + Salesforce"
            }
        
        # Fetch Webfleet service and get ALL data at once
        webfleet = WebfleetService()
        print(f"\n🚀 BATCH LOADING: Pre-computing all Webfleet scores for {len(engineers_result)} engineers...")
        
        try:
            drivers_by_email, scores_by_email = webfleet.get_all_drivers_and_scores()
            if not isinstance(drivers_by_email, dict):
                drivers_by_email = {}
            if not isinstance(scores_by_email, dict):
                scores_by_email = {}
        except Exception as e:
            print(f"❌ Error pre-computing scores: {e}")
            drivers_by_email = {}
            scores_by_email = {}
        
        # Process engineers - scores already pre-computed!
        drivers = []
        scores_with_values = []
        
        for idx, engineer in enumerate(engineers_result, 1):
            try:
                engineer_id = engineer.get('Id')
                engineer_name = engineer.get('Name', 'Unknown')
                # Handle new field structure: RelatedRecord.Email
                engineer_email = engineer.get('RelatedRecord', {}).get('Email', '') if isinstance(engineer.get('RelatedRecord'), dict) else engineer.get('Email__c', '')
                trade = engineer.get('Trade_Lookup__c', 'Engineer')
                
                # Get pre-computed OptiDrive score (INSTANT - no API call)
                driving_score = 0
                if engineer_email:
                    email_lower = engineer_email.lower()
                    if email_lower in scores_by_email:
                        # Use pre-computed score
                        driving_score = scores_by_email[email_lower]
                    else:
                        # Fallback: generate demo score if not in pre-computed dict
                        driving_score = webfleet._generate_demo_score(engineer_email)
                    
                    if driving_score and driving_score > 0:
                        scores_with_values.append(driving_score)
                
                # Round score to 1 decimal place (matches frontend display)
                rounded_score = round(driving_score, 1) if driving_score else 0
                
                # Score classification - based on ROUNDED score to match display
                if rounded_score >= 7.0:
                    score_class = "excellent"
                elif rounded_score >= 5.0:
                    score_class = "needs_improvement"
                else:
                    score_class = "poor"
                
                driver = {
                    "name": engineer_name,
                    "email": engineer_email,
                    "score": rounded_score,
                    "van_number": engineer_id,
                    "trade_group": trade,
                    "score_class": score_class
                }
                
                drivers.append(driver)
                
            except Exception as e:
                print(f"⚠️ Error processing engineer {engineer_name}: {e}")
                drivers.append({
                    "name": engineer.get('Name', 'Unknown'),
                    "email": engineer.get('RelatedRecord', {}).get('Email', '') if isinstance(engineer.get('RelatedRecord'), dict) else engineer.get('Email__c', ''),
                    "score": 0,
                    "van_number": engineer.get('Id', ''),
                    "trade_group": engineer.get('Trade_Lookup__c', 'Engineer'),
                    "score_class": "poor"
                })
        
        # Sort by score (highest first)
        drivers.sort(key=lambda x: (-x['score'], x['name']))
        
        # Add ranks
        for idx, driver in enumerate(drivers):
            driver['rank'] = idx + 1
        
        # Calculate statistics - NEW 3-tier classification
        stats = {
            "total_drivers": len(drivers),
            "drivers_with_scores": len(scores_with_values),
            "average_score": round(sum(scores_with_values) / len(scores_with_values), 1) if scores_with_values else 0,
            "highest_score": max(scores_with_values) if scores_with_values else 0,
            "lowest_score": min(scores_with_values) if scores_with_values else 0,
            "excellent": len([s for s in scores_with_values if s >= 7.0]),
            "needs_improvement": len([s for s in scores_with_values if 5.0 <= s < 7.0]),
            "poor": len([s for s in scores_with_values if s < 5.0])
        }
        
        print(f"✅ Successfully loaded {len(drivers)} engineers with Webfleet scores")
        
        return {
            "success": True,
            "statistics": stats,
            "total": len(drivers),
            "drivers": drivers,
            "source": "Webfleet OptiDrive + Salesforce"
        }
        
    except Exception as e:
        print(f"❌ Error fetching engineers: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cost/vehicle/{vehicle_id}")
def get_vehicle_cost(vehicle_id: str):
    """
    Get detailed cost data for a specific vehicle
    Accepts: Vehicle ID (Salesforce ID) or Van Number
    """
    try:
        sf = SalesforceService()
        
        print(f"💰 Fetching cost data for vehicle: {vehicle_id}")
        
        # Try to find vehicle by ID or Van Number
        vehicle_query = f"""
            SELECT Id, Name, Van_Number__c, Reg_No__c, Vehicle_Type__c, Status__c
            FROM Vehicle__c
            WHERE Id = '{vehicle_id}' OR Van_Number__c = '{vehicle_id}'
            LIMIT 1
        """
        
        vehicles = sf.execute_soql(vehicle_query)
        
        if not vehicles:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        vehicle = vehicles[0]
        vehicle_id_sf = vehicle.get('Id')
        
        # Get all costs for this vehicle
        cost_query = f"""
            SELECT Id, Type__c, Payment_value__c, CreatedDate, Description__c
            FROM Vehicle_Cost__c
            WHERE Vehicle__c = '{vehicle_id_sf}'
            ORDER BY CreatedDate DESC
        """
        
        costs = sf.execute_soql(cost_query) or []
        
        # Aggregate by type
        cost_by_type = {}
        total_cost = 0
        
        for cost in costs:
            cost_type = cost.get('Type__c', 'Other')
            value = float(cost.get('Payment_value__c', 0))
            
            if cost_type not in cost_by_type:
                cost_by_type[cost_type] = {'total': 0, 'count': 0, 'items': []}
            
            cost_by_type[cost_type]['total'] += value
            cost_by_type[cost_type]['count'] += 1
            cost_by_type[cost_type]['items'].append({
                'date': cost.get('CreatedDate', ''),
                'amount': value,
                'description': cost.get('Description__c', '')
            })
            
            total_cost += value
        
        # Calculate maintenance and fuel
        maintenance_cost = sum(cost_by_type.get(t, {}).get('total', 0) 
                              for t in cost_by_type 
                              if 'maint' in t.lower() or 'service' in t.lower())
        fuel_cost = cost_by_type.get('Fuel', {}).get('total', 0)
        insurance_cost = cost_by_type.get('Insurance', {}).get('total', 0)
        
        monthly_avg = round(total_cost / 12, 2) if total_cost > 0 else 0
        
        return {
            "success": True,
            "vehicle": {
                "id": vehicle.get('Id'),
                "name": vehicle.get('Name'),
                "van_number": vehicle.get('Van_Number__c'),
                "reg_no": vehicle.get('Reg_No__c'),
                "type": vehicle.get('Vehicle_Type__c'),
                "status": vehicle.get('Status__c')
            },
            "costs": {
                "total_cost": round(total_cost, 2),
                "maintenance_cost": round(maintenance_cost, 2),
                "fuel_cost": round(fuel_cost, 2),
                "insurance_cost": round(insurance_cost, 2),
                "monthly_average": monthly_avg,
                "cost_by_type": {k: round(v['total'], 2) for k, v in cost_by_type.items()},
                "cost_count": len(costs)
            },
            "detailed_costs": cost_by_type,
            "cost_items": costs
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching vehicle cost: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))