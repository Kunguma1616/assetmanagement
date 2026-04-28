"""
FastAPI routes for HSBC Lease Data
Provides API endpoints for lease information, filtering, and financial summaries
"""

from fastapi import APIRouter, HTTPException, Query, Path
from lease_data_helper import (
    get_lease_data,
    get_lease_by_identifier,
    get_leases_by_type,
    get_leases_by_trade_group,
    get_unique_trade_groups,
    get_lease_data_with_trade_groups,
    get_financial_summary
)
from pydantic import BaseModel
from typing import Optional, List

# Create router
router = APIRouter(
    prefix="/api/leases",
    tags=["leases"],
    responses={404: {"description": "Not found"}}
)


# Pydantic models for responses
class FinancialSummary(BaseModel):
    total_records: int
    motor_vehicles: int
    equipment: int
    total_net_capital: float
    total_capital_cost: float
    total_repayment: float
    avg_net_capital: float
    avg_capital_cost: float
    avg_repayment: float


class LeaseResponse(BaseModel):
    success: bool
    count: int
    data: List[dict]


class SummaryResponse(BaseModel):
    success: bool
    data: dict


# Routes

@router.get("", response_model=LeaseResponse)
async def list_all_leases():
    """
    Get all lease records with trade group information
    
    Returns:
        - success: Boolean indicating success
        - count: Number of records
        - data: List of lease records as dictionaries with Trade Group
    """
    try:
        data = get_lease_data_with_trade_groups(as_dict=True)
        return {
            "success": True,
            "count": len(data),
            "data": data
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading lease data: {str(e)}"
        )


@router.get("/identifier/{identifier}", response_model=LeaseResponse)
async def get_lease_by_id(identifier: str):
    """
    Get lease records by identifier
    
    Args:
        identifier: Lease identifier (e.g., 'HSBC 15')
    
    Returns:
        - success: Boolean indicating success
        - count: Number of records
        - data: List of matching lease records
    """
    try:
        df = get_lease_by_identifier(identifier)
        if len(df) == 0:
            raise HTTPException(
                status_code=404,
                detail=f"No lease found with identifier: {identifier}"
            )
        
        return {
            "success": True,
            "count": len(df),
            "data": df.to_dict('records')
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading lease data: {str(e)}"
        )


@router.get("/trade-groups")
async def get_trade_groups():
    """
    Get all available trade groups
    
    Returns:
        - success: Boolean
        - data: List of unique trade group names
    """
    try:
        trade_groups = get_unique_trade_groups()
        return {
            "success": True,
            "data": trade_groups
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching trade groups: {str(e)}"
        )


@router.get("/trade/{trade_group}", response_model=LeaseResponse)
async def get_leases_by_trade(trade_group: str = Path(..., description="Trade group name")):
    """
    Get lease records filtered by trade group
    
    Args:
        trade_group: Trade group name (e.g., 'Drainage & Plumbing', 'Not Assigned')
    
    Returns:
        - success: Boolean indicating success
        - count: Number of records
        - data: List of matching lease records
    """
    try:
        df = get_leases_by_trade_group(trade_group)
        if len(df) == 0:
            raise HTTPException(
                status_code=404,
                detail=f"No leases found for trade group: {trade_group}"
            )
        
        return {
            "success": True,
            "count": len(df),
            "data": df.to_dict('records')
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading lease data: {str(e)}"
        )


@router.get("/type/{lease_type}", response_model=LeaseResponse)
async def get_leases_by_asset_type(lease_type: str = Path(..., description="Motor Vehicle or Equipment")):
    """
    Get lease records by type (Motor Vehicle or Equipment)
    
    Args:
        lease_type: Type of asset - either 'Motor Vehicle' or 'Equipment'
    
    Returns:
        - success: Boolean indicating success
        - count: Number of records
        - data: List of matching lease records
    """
    try:
        if lease_type not in ['Motor Vehicle', 'Equipment']:
            raise HTTPException(
                status_code=400,
                detail="lease_type must be 'Motor Vehicle' or 'Equipment'"
            )
        
        df = get_leases_by_type(lease_type)
        if len(df) == 0:
            raise HTTPException(
                status_code=404,
                detail=f"No leases found of type: {lease_type}"
            )
        
        return {
            "success": True,
            "count": len(df),
            "data": df.to_dict('records')
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading lease data: {str(e)}"
        )


@router.get("/summary", response_model=SummaryResponse)
async def get_lease_summary():
    """
    Get financial summary of all leases
    
    Returns:
        - success: Boolean indicating success
        - data: Dictionary containing financial metrics
            - total_records: Total number of lease records
            - motor_vehicles: Count of motor vehicles
            - equipment: Count of equipment items
            - total_net_capital: Sum of all net capital values (£)
            - total_capital_cost: Sum of all capital costs (£)
            - total_repayment: Sum of all repayment amounts (£)
            - avg_net_capital: Average net capital (£)
            - avg_capital_cost: Average capital cost (£)
            - avg_repayment: Average repayment (£)
    """
    try:
        summary = get_financial_summary()
        return {
            "success": True,
            "data": summary
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error calculating summary: {str(e)}"
        )


@router.get("/stats/by-type")
async def get_stats_by_type():
    """
    Get statistics grouped by asset type
    
    Returns:
        - success: Boolean indicating success
        - data: Dictionary with stats for each type
    """
    try:
        motor_vehicles = get_leases_by_type('Motor Vehicle')
        equipment = get_leases_by_type('Equipment')
        
        return {
            "success": True,
            "data": {
                "Motor Vehicle": {
                    "count": len(motor_vehicles),
                    "total_capital": float(motor_vehicles['Capital Cost'].sum()),
                    "total_repayment": float(motor_vehicles['Total Repayment'].sum()),
                    "avg_capital": float(motor_vehicles['Capital Cost'].mean()),
                    "avg_repayment": float(motor_vehicles['Total Repayment'].mean())
                },
                "Equipment": {
                    "count": len(equipment),
                    "total_capital": float(equipment['Capital Cost'].sum()),
                    "total_repayment": float(equipment['Total Repayment'].sum()),
                    "avg_capital": float(equipment['Capital Cost'].mean()),
                    "avg_repayment": float(equipment['Total Repayment'].mean())
                }
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error calculating statistics: {str(e)}"
        )


@router.get("/search")
async def search_leases(
    identifier: Optional[str] = Query(None, description="Filter by identifier"),
    lease_type: Optional[str] = Query(None, description="Filter by type"),
    registration: Optional[str] = Query(None, description="Filter by registration/vehicle model")
):
    """
    Search leases with optional filters
    
    Args:
        identifier: Optional lease identifier filter
        lease_type: Optional type filter ('Motor Vehicle' or 'Equipment')
        registration: Optional registration/model filter
    
    Returns:
        - success: Boolean indicating success
        - count: Number of matching records
        - data: List of matching lease records
    """
    try:
        df = get_lease_data()
        
        # Apply filters
        if identifier:
            df = df[df['Identifier'].str.contains(identifier, case=False, na=False)]
        
        if lease_type:
            if lease_type not in ['Motor Vehicle', 'Equipment']:
                raise HTTPException(
                    status_code=400,
                    detail="lease_type must be 'Motor Vehicle' or 'Equipment'"
                )
            df = df[df['Type'] == lease_type]
        
        if registration:
            df = df[df['Registration Doc'].str.contains(registration, case=False, na=False) |
                   df['Make and Model'].str.contains(registration, case=False, na=False)]
        
        if len(df) == 0:
            raise HTTPException(
                status_code=404,
                detail="No leases match the search criteria"
            )
        
        return {
            "success": True,
            "count": len(df),
            "data": df.to_dict('records')
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error searching leases: {str(e)}"
        )


# Health check
@router.get("/health")
async def health_check():
    """
    Health check endpoint to verify lease data is accessible
    """
    try:
        df = get_lease_data()
        return {
            "status": "healthy",
            "records_available": len(df),
            "columns_available": len(df.columns)
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Service unavailable: {str(e)}"
        )
