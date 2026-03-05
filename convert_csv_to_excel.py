import pandas as pd
import os

# Read the CSV file
csv_file = r"frontend\public\HSBC Leases(Lease Register HSBC).csv"
excel_file = r"HSBC_Leases.xlsx"

try:
    # Read CSV with proper encoding, skipping first empty row
    df = pd.read_csv(csv_file, skiprows=1, encoding='latin-1')
    
    # Write to Excel
    df.to_excel(excel_file, sheet_name='Leases', index=False)
    
    print(f"✅ Successfully converted {csv_file} to {excel_file}")
    print(f"   Total records: {len(df)}")
    print(f"   Columns: {list(df.columns)}")
    
except Exception as e:
    print(f"❌ Error converting CSV to Excel: {e}")
    import traceback
    traceback.print_exc()
