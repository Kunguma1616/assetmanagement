#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Read the file
with open('backend/routes/dashboard.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Check if cost-analysis endpoint is already there
if '@router.get("/cost-analysis")' not in content:
    # Append the cost-analysis endpoint
    cost_analysis_endpoint = '''

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
'''
    
    with open('backend/routes/dashboard.py', 'a', encoding='utf-8') as f:
        f.write(cost_analysis_endpoint)
    print("✅ Cost analysis endpoint added successfully!")
else:
    print("⚠️ Cost analysis endpoint already exists")
