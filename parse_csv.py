import csv
import re

# Read the CSV file
csv_path = r'frontend\public\HSBC Leases(Lease Register HSBC).csv'

leases = {}
current_lease_id = None

with open(csv_path, 'r', encoding='latin-1') as f:
    reader = csv.reader(f)
    rows = list(reader)
    
    # Skip first 3 rows (blank, blank, headers)
    for i in range(3, len(rows)):
        row = rows[i]
        
        if not row or all(cell.strip() == '' for cell in row):
            continue
            
        identifier = row[0].strip() if row[0] else ''
        row_type = row[1].strip() if len(row) > 1 else ''
        
        # If this row has an HSBC identifier, it's a main lease row
        if identifier.startswith('HSBC'):
            current_lease_id = identifier
            
            # Only process Motor Vehicles and Equipment
            if row_type in ['Motor Vehicle', 'Equipment']:
                leases[current_lease_id] = {
                    'identifier': identifier,
                    'type': row_type,
                    'contractNumber': row[2].strip() if len(row) > 2 else '',
                    'registrationDoc': row[3].strip() if len(row) > 3 else '',
                    'makeModel': row[5].strip() if len(row) > 5 else '',
                    'startDate': row[6].strip() if len(row) > 6 else '',
                    'termMonths': row[7].strip() if len(row) > 7 else '',
                    'endDate': row[8].strip() if len(row) > 8 else '',
                    'netCapital': row[9].strip() if len(row) > 9 else '',
                    'capitalCost': row[12].strip() if len(row) > 12 else '',
                    'arrangementFee': row[14].strip() if len(row) > 14 else '',
                    'financeInterest': row[15].strip() if len(row) > 15 else '',
                    'initialPayment': row[16].strip() if len(row) > 16 else '',
                    'monthlyInstallment': row[17].strip() if len(row) > 17 else '',
                    'finalPayment': row[18].strip() if len(row) > 18 else '',
                    'totalRepayment': row[19].strip() if len(row) > 19 else '',
                    'vehicles': []
                }
                
                # Add the main vehicle (only if it has registration or is equipment)
                registration = row[4].strip() if len(row) > 4 else ''
                if row_type == 'Motor Vehicle' and registration:
                    leases[current_lease_id]['vehicles'].append({
                        'registration': registration,
                        'model': row[5].strip() if len(row) > 5 else '',
                        'netCapital': row[9].strip() if len(row) > 9 else ''
                    })
                elif row_type == 'Equipment':
                    leases[current_lease_id]['vehicles'].append({
                        'registration': registration,
                        'model': row[5].strip() if len(row) > 5 else '',
                        'netCapital': row[9].strip() if len(row) > 9 else ''
                    })
        
        # If this row has NO identifier but we have a current lease, it's a sub-row (vehicle)
        elif current_lease_id and not identifier and row_type:
            if row_type in ['Motor Vehicle', 'Equipment']:
                registration = row[4].strip() if len(row) > 4 else ''
                vehicle = {
                    'registration': registration,
                    'model': row[5].strip() if len(row) > 5 else '',
                    'netCapital': row[9].strip() if len(row) > 9 else ''
                }
                leases[current_lease_id]['vehicles'].append(vehicle)

# Count total vehicles
total_vehicles = sum(len(lease['vehicles']) for lease in leases.values())
print(f"Total leases: {len(leases)}")
print(f"Total vehicles: {total_vehicles}")
print()

# Generate TypeScript code
ts_code = "const leaseData: Lease[] = [\n"

for lease_id, lease in sorted(leases.items()):
    ts_code += f"  {{\n"
    ts_code += f'    identifier: "{lease["identifier"]}",\n'
    ts_code += f'    type: "{lease["type"]}",\n'
    ts_code += f'    contractNumber: "{lease["contractNumber"]}",\n'
    ts_code += f'    registrationDoc: "{lease["registrationDoc"]}",\n'
    ts_code += f'    makeModel: "{lease["makeModel"]}",\n'
    ts_code += f'    startDate: "{lease["startDate"]}",\n'
    ts_code += f'    termMonths: "{lease["termMonths"]}",\n'
    ts_code += f'    endDate: "{lease["endDate"]}",\n'
    ts_code += f'    netCapital: "{lease["netCapital"]}",\n'
    ts_code += f'    capitalCost: "{lease["capitalCost"]}",\n'
    ts_code += f'    arrangementFee: "{lease["arrangementFee"]}",\n'
    ts_code += f'    financeInterest: "{lease["financeInterest"]}",\n'
    ts_code += f'    initialPayment: "{lease["initialPayment"]}",\n'
    ts_code += f'    monthlyInstallment: "{lease["monthlyInstallment"]}",\n'
    ts_code += f'    finalPayment: "{lease["finalPayment"]}",\n'
    ts_code += f'    totalRepayment: "{lease["totalRepayment"]}",\n'
    ts_code += f'    vehicles: [\n'
    
    for vehicle in lease['vehicles']:
        ts_code += f'      {{\n'
        ts_code += f'        registration: "{vehicle["registration"]}",\n'
        ts_code += f'        model: "{vehicle["model"]}",\n'
        ts_code += f'        netCapital: "{vehicle["netCapital"]}",\n'
        ts_code += f'      }},\n'
    
    ts_code += f'    ],\n'
    ts_code += f'  }},\n'

ts_code += "];\n"

# Save to file
with open('lease_data.ts', 'w', encoding='utf-8') as f:
    f.write(ts_code)

print("Generated lease_data.ts")


# Count total vehicles
total_vehicles = sum(len(lease['vehicles']) for lease in leases.values())
print(f"Total leases: {len(leases)}")
print(f"Total vehicles: {total_vehicles}")
print()

# Generate TypeScript code
ts_code = "const leaseData: Lease[] = [\n"

for lease_id, lease in leases.items():
    ts_code += f"  {{\n"
    ts_code += f'    identifier: "{lease["identifier"]}",\n'
    ts_code += f'    type: "{lease["type"]}",\n'
    ts_code += f'    contractNumber: "{lease["contractNumber"]}",\n'
    ts_code += f'    registrationDoc: "{lease["registrationDoc"]}",\n'
    ts_code += f'    makeModel: "{lease["makeModel"]}",\n'
    ts_code += f'    startDate: "{lease["startDate"]}",\n'
    ts_code += f'    termMonths: "{lease["termMonths"]}",\n'
    ts_code += f'    endDate: "{lease["endDate"]}",\n'
    ts_code += f'    netCapital: "{lease["netCapital"]}",\n'
    ts_code += f'    capitalCost: "{lease["capitalCost"]}",\n'
    ts_code += f'    arrangementFee: "{lease["arrangementFee"]}",\n'
    ts_code += f'    financeInterest: "{lease["financeInterest"]}",\n'
    ts_code += f'    initialPayment: "{lease["initialPayment"]}",\n'
    ts_code += f'    monthlyInstallment: "{lease["monthlyInstallment"]}",\n'
    ts_code += f'    finalPayment: "{lease["finalPayment"]}",\n'
    ts_code += f'    totalRepayment: "{lease["totalRepayment"]}",\n'
    ts_code += f'    vehicles: [\n'
    
    for vehicle in lease['vehicles']:
        ts_code += f'      {{\n'
        ts_code += f'        registration: "{vehicle["registration"]}",\n'
        ts_code += f'        model: "{vehicle["model"]}",\n'
        ts_code += f'        netCapital: "{vehicle["netCapital"]}",\n'
        ts_code += f'      }},\n'
    
    ts_code += f'    ],\n'
    ts_code += f'  }},\n'

ts_code += "];\n"

# Save to file
with open('lease_data.ts', 'w', encoding='utf-8') as f:
    f.write(ts_code)

print("Generated lease_data.ts")
