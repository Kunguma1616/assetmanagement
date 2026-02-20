from fastapi import APIRouter, HTTPException
import sys
import os
from datetime import datetime, timedelta
import openpyxl
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from salesforce_service import SalesforceService

router = APIRouter(prefix="/api/cost", tags=["cost"])

# Get the path to Excel file
EXCEL_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'HSBC_Leases.xlsx')

def load_lease_data():
    """Load lease data from Excel file"""
    if not os.path.exists(EXCEL_FILE):
        return []
    
    try:
        wb = openpyxl.load_workbook(EXCEL_FILE, data_only=True)
        ws = wb.active
        
        # Headers are in row 2
        headers = [ws.cell(2, i).value for i in range(1, ws.max_column + 1) if ws.cell(2, i).value]
        
        leases = []
        # Data starts from row 3
        for row_idx in range(3, ws.max_row + 1):
            row_data = {}
            for col_idx, header in enumerate(headers, 1):
                cell_value = ws.cell(row_idx, col_idx).value
                row_data[header] = cell_value
            
            # Only add if it has an identifier
            if row_data.get('Identifier ') or row_data.get('Registration Doc '):
                leases.append(row_data)
        
        return leases
    except Exception as e:
        print(f"❌ Error loading Excel file: {e}")
        return []


@router.get("/service/{van_number}")
def get_service_cost(van_number: str):
    """
    Get SERVICE COST breakdown for a specific vehicle (excluding Maintenance)
    User provides van number, gets total service cost + breakdown by type
    """
    try:
        sf = SalesforceService()
        
        print(f"\n🔧 FETCHING SERVICE COSTS FOR VAN: {van_number}")
        print("="*80)
        
        # Find vehicle by van number
        vehicle_query = f"""
            SELECT Id, Name, Van_Number__c, Reg_No__c, Vehicle_Type__c, Status__c
            FROM Vehicle__c
            WHERE Van_Number__c = '{van_number}'
            LIMIT 1
        """
        
        vehicles = sf.execute_soql(vehicle_query)
        
        if not vehicles:
            raise HTTPException(status_code=404, detail=f"Vehicle with van number {van_number} not found")
        
        vehicle = vehicles[0]
        vehicle_id = vehicle.get('Id')
        
        print(f"✅ Found vehicle: {vehicle.get('Name')} ({van_number})")
        
        # Query 1: Get cost breakdown by type (excluding Maintenance)
        breakdown_query = f"""
            SELECT Vehicle__c, Type__c, SUM(Payment_value__c) Cost_By_Type
            FROM Vehicle_Service_Payment__c
            WHERE Vehicle__c = '{vehicle_id}' AND Type__c != 'Maintenance'
            GROUP BY Vehicle__c, Type__c
        """
        
        print(f"🔍 Querying service cost breakdown...")
        breakdown_records = sf.sf.query_all(breakdown_query).get('records', [])
        
        # Query 2: Get total service cost (excluding Maintenance)
        total_query = f"""
            SELECT Vehicle__c, SUM(Payment_value__c) Total_Cost
            FROM Vehicle_Service_Payment__c
            WHERE Vehicle__c = '{vehicle_id}' AND Type__c != 'Maintenance'
            GROUP BY Vehicle__c
        """
        
        print(f"💰 Querying total service cost...")
        total_records = sf.sf.query_all(total_query).get('records', [])
        
        total_cost = 0
        cost_by_type = {}
        
        # Parse breakdown
        for record in breakdown_records:
            cost_type = record.get('Type__c', 'Other')
            amount = float(record.get('Cost_By_Type', 0) or 0)
            cost_by_type[cost_type] = round(amount, 2)
            print(f"  {cost_type}: £{amount:.2f}")
        
        # Parse total
        if total_records:
            total_cost = float(total_records[0].get('Total_Cost', 0) or 0)
        
        monthly_avg = round(total_cost / 12, 2) if total_cost > 0 else 0
        
        print(f"\n💰 TOTAL SERVICE COST: £{total_cost:.2f}")
        print(f"📊 Monthly Average: £{monthly_avg:.2f}")
        print("="*80 + "\n")
        
        return {
            "success": True,
            "vehicle": {
                "id": vehicle.get('Id'),
                "name": vehicle.get('Name'),
                "van_number": van_number,
                "registration": vehicle.get('Reg_No__c'),
                "vehicle_type": vehicle.get('Vehicle_Type__c'),
            },
            "service_costs": {
                "total_cost": round(total_cost, 2),
                "monthly_average": monthly_avg,
                "cost_by_type": cost_by_type,
                "cost_types_count": len(cost_by_type)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching service costs: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vehicle/{vehicle_id}")
def get_vehicle_cost(vehicle_id: str):
    """
    Get detailed cost data for a specific vehicle from Vehicle_Service_Payment__c
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
        
        print(f"✅ Found vehicle: {vehicle.get('Name')}")
        
        # Get all service payments for this vehicle from Vehicle_Service_Payment__c
        # This table has: Vehicle__c, Type__c (Insurance, MOT, Tax, Fuel, Maintenance, Repair, Rental, etc.), Payment_value__c
        cost_query = f"""
            SELECT Id, Type__c, Payment_value__c, CreatedDate, Description__c
            FROM Vehicle_Service_Payment__c
            WHERE Vehicle__c = '{vehicle_id_sf}'
            ORDER BY CreatedDate DESC
        """
        
        print(f"🔍 Querying service payments: {cost_query}")
        costs = sf.sf.query_all(cost_query).get('records', [])
        
        print(f"✅ Found {len(costs)} cost records")
        
        # Aggregate by type
        cost_by_type = {}
        total_cost = 0
        
        for cost in costs:
            cost_type = cost.get('Type__c', 'Other')
            value = float(cost.get('Payment_value__c', 0) or 0)
            
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
        
        print(f"💰 Total cost: £{total_cost}")
        print(f"📊 Cost breakdown: {list(cost_by_type.keys())}")
        
        # Calculate specific cost types
        maintenance_cost = cost_by_type.get('Maintenance', {}).get('total', 0)
        repair_cost = cost_by_type.get('Repair', {}).get('total', 0)
        fuel_cost = cost_by_type.get('Fuel', {}).get('total', 0)
        insurance_cost = cost_by_type.get('Insurance', {}).get('total', 0)
        mot_cost = cost_by_type.get('MOT', {}).get('total', 0)
        tax_cost = cost_by_type.get('Tax', {}).get('total', 0)
        rental_cost = cost_by_type.get('Rental', {}).get('total', 0)
        
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
                "repair_cost": round(repair_cost, 2),
                "fuel_cost": round(fuel_cost, 2),
                "insurance_cost": round(insurance_cost, 2),
                "mot_cost": round(mot_cost, 2),
                "tax_cost": round(tax_cost, 2),
                "rental_cost": round(rental_cost, 2),
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


@router.get("/all-vehicles")
def get_all_vehicles_costs():
    """
    Get total lifecycle cost and breakdown for ALL vehicles
    Shows: Total cost per vehicle, cost by type (Insurance, MOT, Rental, etc.)
    """
    try:
        sf = SalesforceService()
        
        print("\n" + "="*80)
        print("💰 FETCHING ALL VEHICLE COSTS")
        print("="*80)
        
        # Step 1: Get all vehicles
        vehicle_query = """
            SELECT Id, Name, Van_Number__c, Reg_No__c, Vehicle_Type__c, Status__c
            FROM Vehicle__c
            ORDER BY Van_Number__c ASC
        """
        
        vehicles = sf.sf.query_all(vehicle_query).get('records', [])
        print(f"✅ Found {len(vehicles)} vehicles")
        
        # Step 2: Get ALL service payments (don't use GROUP BY - fetch all and aggregate in Python)
        cost_query = """
            SELECT Vehicle__c, Type__c, Payment_value__c, CreatedDate
            FROM Vehicle_Service_Payment__c
            ORDER BY Vehicle__c, Type__c
        """
        
        print(f"🔍 Querying service payments...")
        cost_records = sf.sf.query_all(cost_query).get('records', [])
        print(f"✅ Found {len(cost_records)} cost records")
        
        # Aggregate costs by vehicle and type in Python
        vehicle_costs = {}
        for cost in cost_records:
            vehicle_id = cost.get('Vehicle__c')
            cost_type = cost.get('Type__c', 'Other')
            amount = float(cost.get('Payment_value__c', 0) or 0)
            
            if vehicle_id not in vehicle_costs:
                vehicle_costs[vehicle_id] = {
                    'total': 0,
                    'by_type': {}
                }
            
            vehicle_costs[vehicle_id]['total'] += amount
            if cost_type not in vehicle_costs[vehicle_id]['by_type']:
                vehicle_costs[vehicle_id]['by_type'][cost_type] = 0
            vehicle_costs[vehicle_id]['by_type'][cost_type] += amount
        
        print(f"📊 Processed costs for {len(vehicle_costs)} vehicles with costs")
        
        # Step 3: Build response with all vehicles and their costs
        vehicles_list = []
        total_fleet_cost = 0
        fleet_cost_by_type = {}
        
        for vehicle in vehicles:
            vehicle_id = vehicle.get('Id')
            van_number = vehicle.get('Van_Number__c')
            
            # Get costs for this vehicle
            vehicle_cost_info = vehicle_costs.get(vehicle_id, {'total': 0, 'by_type': {}})
            total_cost = vehicle_cost_info['total']
            cost_breakdown = vehicle_cost_info['by_type']
            
            total_fleet_cost += total_cost
            
            # Aggregate fleet costs by type
            for cost_type, amount in cost_breakdown.items():
                if cost_type not in fleet_cost_by_type:
                    fleet_cost_by_type[cost_type] = 0
                fleet_cost_by_type[cost_type] += amount
            
            vehicles_list.append({
                "vehicle_id": vehicle_id,
                "name": vehicle.get('Name'),
                "van_number": van_number,
                "registration": vehicle.get('Reg_No__c'),
                "vehicle_type": vehicle.get('Vehicle_Type__c'),
                "status": vehicle.get('Status__c'),
                "total_cost": round(total_cost, 2),
                "cost_breakdown": {k: round(v, 2) for k, v in cost_breakdown.items()},
                "monthly_average": round(total_cost / 12, 2) if total_cost > 0 else 0
            })
        
        # Sort by total cost (highest first)
        vehicles_list.sort(key=lambda x: x['total_cost'], reverse=True)
        
        avg_vehicle_cost = round(total_fleet_cost / len(vehicles), 2) if vehicles else 0
        
        print(f"\n" + "="*80)
        print(f"💰 FLEET COST SUMMARY")
        print(f"   Total Fleet Cost: £{total_fleet_cost:.2f}")
        print(f"   Average per Vehicle: £{avg_vehicle_cost:.2f}")
        print(f"   Total Vehicles: {len(vehicles)}")
        print(f"   Vehicles with Costs: {len(vehicle_costs)}")
        print("="*80 + "\n")
        
        return {
            "success": True,
            "summary": {
                "total_fleet_cost": round(total_fleet_cost, 2),
                "average_vehicle_cost": avg_vehicle_cost,
                "vehicle_count": len(vehicles),
                "vehicles_with_costs": len(vehicle_costs)
            },
            "cost_breakdown_by_type": {k: round(v, 2) for k, v in fleet_cost_by_type.items()},
            "vehicles": vehicles_list,
            "top_cost_vehicles": vehicles_list[:10]
        }
        
    except Exception as e:
        print(f"❌ Error fetching vehicle costs: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/leases/all")
def get_all_leases():
    """Get all lease data from Excel file"""
    try:
        leases = load_lease_data()
        
        if not leases:
            return {
                "success": False,
                "total": 0,
                "leases": []
            }
        
        # Calculate totals
        total_vehicles = len(leases)
        total_capital_cost = sum(float(lease.get('Capital Cost ', 0) or 0) for lease in leases)
        
        print(f"\n✅ LOADED {total_vehicles} LEASES FROM EXCEL")
        print(f"   Total Capital Cost: £{total_capital_cost:.2f}")
        
        return {
            "success": True,
            "total": total_vehicles,
            "total_capital_cost": round(total_capital_cost, 2),
            "average_capital_cost": round(total_capital_cost / total_vehicles, 2) if total_vehicles > 0 else 0,
            "leases": [
                {
                    "identifier": lease.get('Identifier ', '').strip() if lease.get('Identifier ') else None,
                    "vehicle_type": lease.get('Type', ''),
                    "contract_number": lease.get('Contract number'),
                    "registration": lease.get('Registration Doc ', '').strip() if lease.get('Registration Doc ') else None,
                    "make_model": lease.get('Make and Model ', '').strip() if lease.get('Make and Model ') else None,
                    "start_date": lease.get('Agreement Start Date ', None),
                    "end_date": lease.get('Agreement end date ', None),
                    "term_months": lease.get('Agreement term (months)', None),
                    "net_capital": float(lease.get('Net Capital ', 0) or 0),
                    "vat": float(lease.get('VAT on Acquisition ', 0) or 0),
                    "capital_cost": float(lease.get('Capital Cost ', 0) or 0),
                    "monthly_payment": round(float(lease.get('Capital Cost ', 0) or 0) / (lease.get('Agreement term (months)', 1) or 1), 2)
                }
                for lease in leases
            ]
        }
    except Exception as e:
        print(f"❌ Error loading leases: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/leases/registration/{registration}")
def get_lease_by_registration(registration: str):
    """Get lease data for a specific vehicle registration"""
    try:
        leases = load_lease_data()
        
        # Search for matching registration
        matching_lease = None
        for lease in leases:
            reg = (lease.get('Registration Doc ', '') or '').strip().upper()
            if reg == registration.upper():
                matching_lease = lease
                break
        
        if not matching_lease:
            return {
                "success": False,
                "message": f"No lease found for registration {registration}"
            }
        
        capital_cost = float(matching_lease.get('Capital Cost ', 0) or 0)
        term_months = matching_lease.get('Agreement term (months)', 1) or 1
        
        return {
            "success": True,
            "identifier": matching_lease.get('Identifier ', '').strip() if matching_lease.get('Identifier ') else None,
            "vehicle_type": matching_lease.get('Type', ''),
            "contract_number": matching_lease.get('Contract number'),
            "registration": matching_lease.get('Registration Doc ', '').strip() if matching_lease.get('Registration Doc ') else None,
            "make_model": matching_lease.get('Make and Model ', '').strip() if matching_lease.get('Make and Model ') else None,
            "start_date": matching_lease.get('Agreement Start Date ', None),
            "end_date": matching_lease.get('Agreement end date ', None),
            "term_months": term_months,
            "net_capital": float(matching_lease.get('Net Capital ', 0) or 0),
            "vat": float(matching_lease.get('VAT on Acquisition ', 0) or 0),
            "capital_cost": round(capital_cost, 2),
            "monthly_payment": round(capital_cost / term_months, 2)
        }
    except Exception as e:
        print(f"❌ Error fetching lease: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))