"""
Integration module for HSBC Leases data
Provides helper functions to load and process lease data
"""

import sys
import os

# Ensure the current directory is in path so excel_handler can be found
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from excel_handler import read_and_clean_hsbc_leases
except ImportError as e:
    print(f"[WARNING] excel_handler not available: {e}")
    read_and_clean_hsbc_leases = None

import pandas as pd
from pathlib import Path

_trade_group_cache = None
_trade_group_cache_df = None


def get_lease_data(file_path=None, as_dict=False):
    if read_and_clean_hsbc_leases is None:
        print("[WARNING] excel_handler unavailable, returning empty DataFrame")
        return [] if as_dict else pd.DataFrame()

    if file_path is None:
        possible_paths = [
            Path("/app/HSBC_Leases_Fixed.xlsx"),
            Path("/app/HSBC_Leases.xlsx"),
            Path(os.path.dirname(os.path.abspath(__file__))) / "HSBC_Leases_Fixed.xlsx",
            Path(os.path.dirname(os.path.abspath(__file__))) / "HSBC_Leases.xlsx",
            Path(os.path.dirname(os.path.abspath(__file__))) / ".." / "HSBC_Leases_Fixed.xlsx",
            Path(os.path.dirname(os.path.abspath(__file__))) / ".." / "HSBC_Leases.xlsx",
        ]

        for path in possible_paths:
            if path.exists():
                file_path = str(path.absolute())
                print(f"[INFO] Found HSBC_Leases file at: {file_path}")
                break

        if file_path is None:
            print("[WARNING] HSBC_Leases.xlsx not found — returning empty data")
            return [] if as_dict else pd.DataFrame()

    try:
        df = read_and_clean_hsbc_leases(file_path, verbose=False)
        if as_dict:
            return df.to_dict('records')
        return df
    except Exception as e:
        print(f"[WARNING] Failed to read lease data: {e}")
        return [] if as_dict else pd.DataFrame()


def get_lease_by_identifier(identifier):
    df = get_lease_data()
    if df.empty:
        return pd.DataFrame()
    return df[df['Identifier'] == identifier]


def get_leases_by_type(lease_type):
    df = get_lease_data()
    if df.empty:
        return pd.DataFrame()
    return df[df['Type'] == lease_type]


def get_financial_summary():
    df = get_lease_data()
    if df.empty:
        return {'total_records': 0, 'motor_vehicles': 0, 'equipment': 0,
                'total_net_capital': 0, 'total_capital_cost': 0, 'total_repayment': 0,
                'avg_net_capital': 0, 'avg_capital_cost': 0, 'avg_repayment': 0}

    return {
        'total_records': len(df),
        'motor_vehicles': len(df[df['Type'] == 'Motor Vehicle']) if 'Type' in df.columns else 0,
        'equipment': len(df[df['Type'] == 'Equipment']) if 'Type' in df.columns else 0,
        'total_net_capital': float(df['Net Capital'].sum()) if 'Net Capital' in df.columns else 0,
        'total_capital_cost': float(df['Capital Cost'].sum()) if 'Capital Cost' in df.columns else 0,
        'total_repayment': float(df['Total Repayment'].sum()) if 'Total Repayment' in df.columns else 0,
        'avg_net_capital': float(df['Net Capital'].mean()) if 'Net Capital' in df.columns else 0,
        'avg_capital_cost': float(df['Capital Cost'].mean()) if 'Capital Cost' in df.columns else 0,
        'avg_repayment': float(df['Total Repayment'].mean()) if 'Total Repayment' in df.columns else 0,
    }


def get_trade_groups():
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
        return {}


def get_lease_data_with_trade_groups(file_path=None, as_dict=False):
    df = get_lease_data(file_path, as_dict=False)

    if df is None or (isinstance(df, pd.DataFrame) and df.empty):
        return [] if as_dict else pd.DataFrame()

    reg_to_trade = get_trade_groups()

    if 'Registration Doc' in df.columns:
        df['Trade Group'] = df['Registration Doc'].apply(
            lambda x: reg_to_trade.get(str(x).upper(), 'Not Assigned') if pd.notna(x) else 'Not Assigned'
        )
    else:
        df['Trade Group'] = 'Not Assigned'

    if as_dict:
        return df.to_dict('records')
    return df


def get_unique_trade_groups():
    df = get_lease_data_with_trade_groups()
    if isinstance(df, pd.DataFrame) and df.empty:
        return []
    trade_groups = df['Trade Group'].unique().tolist()
    return sorted([t for t in trade_groups if t])


def get_leases_by_trade_group(trade_group):
    df = get_lease_data_with_trade_groups()
    if isinstance(df, pd.DataFrame) and df.empty:
        return pd.DataFrame()
    return df[df['Trade Group'] == trade_group]
