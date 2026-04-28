"""
Excel handler for HSBC Leases data
Handles merged cells, cleans currency columns, and converts to numeric values
"""

import pandas as pd
import openpyxl
from pathlib import Path
import re


def clean_currency_column(value):
    """
    Clean currency values by removing £ symbol and commas
    Returns float or NaN
    """
    if pd.isna(value):
        return None
    
    # Convert to string
    value_str = str(value).strip()
    
    # Handle empty or dash values
    if value_str in ['', '-', '—', 'nan', 'NaN']:
        return None
    
    # Remove £ symbol and whitespace
    value_str = value_str.replace('£', '').strip()
    
    # Remove commas
    value_str = value_str.replace(',', '')
    
    # Try to convert to float
    try:
        return float(value_str)
    except (ValueError, TypeError):
        return None


def unmerge_cells_forward_fill(df, file_path):
    """
    Handle merged cells in Excel by forward filling NaN values in each column.
    """
    for column in df.columns:
        df[column] = df[column].ffill()
    return df


def read_and_clean_hsbc_leases(file_path, sheet_name=None, verbose=True):
    """
    Read HSBC Leases Excel file and clean the data.
    Auto-detects sheet name if not provided.

    Args:
        file_path: Path to HSBC_Leases.xlsx or HSBC_Leases_Fixed.xlsx
        sheet_name: Sheet name to read (auto-detected if None)

    Returns:
        Cleaned DataFrame with proper data types and filled merged cells
    """

    # Currency columns to clean
    currency_columns = [
        'Net Capital',
        'VAT on Acquisition',
        'RFL',
        'Capital Cost',
        'Arrangement Fee',
        'Finance Interest',
        'Initial Payment',
        'Monthly Installment',
        'Final Payment',
        'Total Repayment'
    ]

    # Auto-detect sheet name
    if sheet_name is None:
        xl = pd.ExcelFile(file_path)
        available = xl.sheet_names
        if 'Leases' in available:
            sheet_name = 'Leases'
        else:
            sheet_name = available[0]
        if verbose:
            print(f"Auto-detected sheet: '{sheet_name}' (available: {available})")

    # Read Excel file
    if verbose:
        print(f"Reading Excel file: {file_path}")
    df = pd.read_excel(file_path, sheet_name=sheet_name)

    if verbose:
        print(f"Original shape: {df.shape}")

    # Strip whitespace from column names
    if verbose:
        print("\nStripping whitespace from column names...")
    df.columns = df.columns.str.strip()

    # Normalize column names: strip currency symbol suffixes like (£)
    # Matches (£) or any parens containing only non-ASCII-alphanumeric chars
    df.columns = [re.sub(r'\s*\([^a-zA-Z0-9\s]+\)\s*$', '', c).strip() for c in df.columns]

    # Rename columns to the expected standard names
    _COL_MAP = {
        'Registration': 'Registration Doc',
        'Term (months)': 'Agreement term (months)',
        'Agreement End Date': 'Agreement end date',
    }
    df = df.rename(columns={k: v for k, v in _COL_MAP.items() if k in df.columns})
    
    if verbose:
        print(f"Cleaned columns: {df.columns.tolist()}")
    
    # Forward fill merged cells
    if verbose:
        print("\nHandling merged cells with forward fill...")
    df = unmerge_cells_forward_fill(df, file_path)
    
    # Clean currency columns
    if verbose:
        print("\nCleaning currency columns...")
    for col in currency_columns:
        if col in df.columns:
            if verbose:
                print(f"  - Cleaning '{col}'")
            df[col] = df[col].apply(clean_currency_column)
            df[col] = pd.to_numeric(df[col], errors='coerce')
        else:
            # Try to find similar column names
            matching_cols = [c for c in df.columns if col.lower() in c.lower()]
            if matching_cols:
                actual_col = matching_cols[0]
                if verbose:
                    print(f"  - Cleaning '{actual_col}' (mapped from '{col}')")
                df[actual_col] = df[actual_col].apply(clean_currency_column)
                df[actual_col] = pd.to_numeric(df[actual_col], errors='coerce')
    
    # Clean all remaining columns that might contain currency
    if verbose:
        print("\nCleaning all remaining currency-like columns...")
    for col in df.columns:
        if df[col].dtype == 'object':
            # Check if column contains currency values
            sample_values = df[col].dropna().head(5).astype(str)
            if any('£' in str(val) for val in sample_values):
                if verbose:
                    print(f"  - Cleaning '{col}' (contains currency)")
                df[col] = df[col].apply(clean_currency_column)
                df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # Drop unnamed columns and empty columns
    if verbose:
        print("\nCleaning up columns...")
    df = df.drop([col for col in df.columns if col.startswith('Unnamed')], axis=1)
    df = df.dropna(axis=1, how='all')
    
    # Remove completely empty rows
    if verbose:
        print("Removing completely empty rows...")
    df = df.dropna(how='all')
    
    # Reset index
    df = df.reset_index(drop=True)
    
    if verbose:
        print(f"\nFinal shape: {df.shape}")
        print("\nData types:")
        print(df.dtypes)
    
    return df


def get_lease_summary(df):
    """
    Get summary statistics of the lease data
    """
    print("\n" + "="*80)
    print("LEASE DATA SUMMARY")
    print("="*80)
    
    print(f"\nTotal Records: {len(df)}")
    
    # Count by type
    if 'Type' in df.columns:
        print(f"\nBy Type:")
        print(df['Type'].value_counts())
    
    # Count by Identifier
    if 'Identifier' in df.columns:
        print(f"\nBy Identifier:")
        print(df['Identifier'].value_counts())
    
    # Financial summary
    currency_cols = [
        'Net Capital',
        'Capital Cost',
        'Total Repayment'
    ]
    
    print(f"\nFinancial Summary:")
    for col in currency_cols:
        if col in df.columns:
            total = df[col].sum()
            mean = df[col].mean()
            print(f"  {col}:")
            print(f"    Total: £{total:,.2f}")
            print(f"    Average: £{mean:,.2f}")


if __name__ == "__main__":
    # Example usage
    excel_file = "HSBC_Leases.xlsx"
    
    # Try multiple possible locations
    possible_paths = [
        Path(excel_file),
        Path("..") / excel_file,
        Path("../..") / excel_file,
        Path("c:/Users/Kunguma.Balaji/Downloads/FLEET-FULL-STACK--main (1)/FLEET-FULL-STACK--main") / excel_file,
    ]
    
    found_path = None
    for path in possible_paths:
        if path.exists():
            found_path = path
            break
    
    if found_path:
        print(f"Found Excel file at: {found_path}")
        df = read_and_clean_hsbc_leases(str(found_path))
        
        print("\n" + "="*80)
        print("FIRST 10 ROWS OF CLEANED DATA")
        print("="*80)
        print(df.head(10))
        
        print("\n" + "="*80)
        print("SAMPLE ROW (Row 0)")
        print("="*80)
        print(df.iloc[0])
        
        get_lease_summary(df)
        
        # Save cleaned data to CSV for reference
        output_file = "HSBC_Leases_Cleaned.csv"
        df.to_csv(output_file, index=False)
        print(f"\n[SUCCESS] Cleaned data saved to: {output_file}")
    else:
        print("❌ Excel file not found. Please check the file path.")
        print("\nSearched in:")
        for path in possible_paths:
            print(f"  - {path}")
