"""
Integration module for HSBC Leases data in Flask app
Provides helper functions to load and process lease data
"""

from excel_handler import read_and_clean_hsbc_leases
import pandas as pd
import os
from pathlib import Path

# Cache for trade group data
_trade_group_cache = None
_trade_group_cache_df = None


def get_lease_data(file_path=None, as_dict=False):
    """
    Load and clean HSBC lease data for API endpoints
    
    Args:
        file_path: Path to Excel file (optional, will auto-detect if not provided)
        as_dict: If True, returns list of dictionaries; else returns DataFrame
    
    Returns:
        DataFrame or list of dictionaries with clean lease data
    """
    if file_path is None:
        # Auto-detect file location - check multiple root locations
        possible_paths = [
            Path(r"C:\Users\Kunguma.Balaji\Downloads\HSBC_Leases_Fixed.xlsx"),
            Path("HSBC_Leases_Fixed.xlsx"),
            Path("../HSBC_Leases_Fixed.xlsx"),
            Path(".").absolute().parent / "HSBC_Leases_Fixed.xlsx",
            Path("HSBC_Leases.xlsx"),
            Path("../HSBC_Leases.xlsx"),
            Path(".").absolute().parent / "HSBC_Leases.xlsx",
        ]
        
        for path in possible_paths:
            if path.exists():
                file_path = str(path.absolute())
                print(f"[INFO] Found HSBC_Leases.xlsx at: {file_path}")
                break
        
        if file_path is None:
            # Final fallback - look in project root
            raise FileNotFoundError(
                "HSBC_Leases.xlsx not found. Expected locations:\n"
                + "\n".join(str(p) for p in possible_paths)
            )
    
    # Read and clean the data
    df = read_and_clean_hsbc_leases(file_path, verbose=False)
    
    if as_dict:
        return df.to_dict('records')
    else:
        return df


def get_lease_by_identifier(identifier):
    """
    Get all leases for a specific identifier (e.g., 'HSBC 15')
    
    Args:
        identifier: Lease identifier (e.g., 'HSBC 15')
    
    Returns:
        DataFrame filtered by identifier
    """
    df = get_lease_data()
    return df[df['Identifier'] == identifier]


def get_leases_by_type(lease_type):
    """
    Get all leases of a specific type (Motor Vehicle or Equipment)
    
    Args:
        lease_type: 'Motor Vehicle' or 'Equipment'
    
    Returns:
        DataFrame filtered by type
    """
    df = get_lease_data()
    return df[df['Type'] == lease_type]


def get_financial_summary():
    """
    Get financial summary of all leases
    
    Returns:
        Dictionary with financial metrics
    """
    df = get_lease_data()
    
    return {
        'total_records': len(df),
        'motor_vehicles': len(df[df['Type'] == 'Motor Vehicle']),
        'equipment': len(df[df['Type'] == 'Equipment']),
        'total_net_capital': float(df['Net Capital'].sum()),
        'total_capital_cost': float(df['Capital Cost'].sum()),
        'total_repayment': float(df['Total Repayment'].sum()),
        'avg_net_capital': float(df['Net Capital'].mean()),
        'avg_capital_cost': float(df['Capital Cost'].mean()),
        'avg_repayment': float(df['Total Repayment'].mean()),
    }


def get_trade_groups():
    """
    Get trade group data from Salesforce for all leases
    Maps registration numbers to their trade groups
    
    Returns:
        Dictionary mapping registration -> trade group name
    """
    try:
        from salesforce_service import SalesforceService
        
        sf = SalesforceService()
        vehicle_query = """
            SELECT Reg_No__c, Trade_Group__c
            FROM Vehicle__c
            WHERE Reg_No__c != NULL
        """
        
        vehicles = sf.sf.query_all(vehicle_query).get('records', [])
        return {v.get('Reg_No__c', '').upper(): v.get('Trade_Group__c', 'Not Assigned') for v in vehicles}
    except Exception as e:
        print(f"[WARNING] Could not load trade groups from Salesforce: {e}")
        # Return empty dict if Salesforce unavailable
        return {}


def get_lease_data_with_trade_groups(file_path=None, as_dict=False):
    """
    Load lease data enriched with trade group information
    
    Args:
        file_path: Path to Excel file (optional)
        as_dict: If True, returns list of dicts; else returns DataFrame
    
    Returns:
        DataFrame or list of dicts with 'Trade Group' column added
    """
    df = get_lease_data(file_path, as_dict=False)
    
    # Get trade group mapping
    reg_to_trade = get_trade_groups()
    
    # Add trade group column
    df['Trade Group'] = df['Registration Doc'].str.upper().map(
        lambda x: reg_to_trade.get(x, 'Not Assigned') if pd.notna(x) else 'Not Assigned'
    )
    
    if as_dict:
        return df.to_dict('records')
    else:
        return df


def get_unique_trade_groups():
    """
    Get all unique trade groups from leases
    
    Returns:
        Sorted list of unique trade group names
    """
    df = get_lease_data_with_trade_groups()
    trade_groups = df['Trade Group'].unique().tolist()
    return sorted([t for t in trade_groups if t])


def get_leases_by_trade_group(trade_group):
    """
    Get all leases with a specific trade group
    
    Args:
        trade_group: Trade group name (e.g., 'Drainage & Plumbing')
    
    Returns:
        DataFrame filtered by trade group
    """
    df = get_lease_data_with_trade_groups()
    return df[df['Trade Group'] == trade_group]


# Example API endpoint usage (for Flask app.py)
"""
Example integration in Flask app:

from flask import Flask, jsonify
from lease_data_helper import get_lease_data, get_lease_by_identifier, get_financial_summary

app = Flask(__name__)

@app.route('/api/leases', methods=['GET'])
def get_all_leases():
    '''Get all lease data'''
    try:
        data = get_lease_data(as_dict=True)
        return jsonify({
            'success': True,
            'count': len(data),
            'data': data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/lease/<identifier>', methods=['GET'])
def get_lease(identifier):
    '''Get specific lease by identifier'''
    try:
        df = get_lease_by_identifier(identifier)
        if len(df) == 0:
            return jsonify({
                'success': False,
                'error': f'No lease found with identifier {identifier}'
            }), 404
        
        return jsonify({
            'success': True,
            'count': len(df),
            'data': df.to_dict('records')
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/summary', methods=['GET'])
def get_summary():
    '''Get financial summary'''
    try:
        summary = get_financial_summary()
        return jsonify({
            'success': True,
            'data': summary
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
"""

if __name__ == "__main__":
    # Test the module
    print("Testing lease data loader...\n")
    
    try:
        # Load data as DataFrame
        print("Loading lease data...")
        df = get_lease_data()
        print(f"Loaded {len(df)} records\n")
        
        # Get financial summary
        print("Financial Summary:")
        summary = get_financial_summary()
        for key, value in summary.items():
            if isinstance(value, float):
                print(f"  {key}: {value:,.2f}")
            else:
                print(f"  {key}: {value}")
        
        # Get specific identifier
        print(f"\nLeases for HSBC 15:")
        hsbc_15 = get_lease_by_identifier('HSBC 15')
        print(f"  Found {len(hsbc_15)} records")
        
        # Get by type
        print(f"\nMotor Vehicles:")
        vehicles = get_leases_by_type('Motor Vehicle')
        print(f"  Found {len(vehicles)} records")
        print(f"  Total value: £{vehicles['Capital Cost'].sum():,.2f}")
        
    except Exception as e:
        print(f"Error: {e}")
