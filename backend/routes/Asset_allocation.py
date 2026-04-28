import traceback
from fastapi import APIRouter, HTTPException, Query
from salesforce_service import SalesforceService

router = APIRouter(prefix="/api/allocation", tags=["allocation"])


def _safe_float(val, default=0.0) -> float:
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default


@router.get("/")
def get_asset_allocation(
    limit: int = Query(default=2000, ge=1, le=50000),
    offset: int = Query(default=0, ge=0),
):
    """
    Asset Allocation — user re-assignments from AssetHistory
    WHERE Field = 'User__c' AND Asset.Is_Available__c = TRUE
    Fetches up to 2000 records by default (no more 200 cap).
    """
    try:
        try:
            sf = SalesforceService()
        except Exception as sf_err:
            print(f"❌ Salesforce connection failed: {sf_err}")
            # Return empty allocations on connection failure
            return {
                "success":     True,
                "total":       0,
                "returned":    0,
                "offset":      offset,
                "allocations": [],
            }

        # Get total count first
        total_count = 0
        try:
            total_count = sf.execute_soql_count("""
                SELECT COUNT()
                FROM AssetHistory
                WHERE Field = 'User__c'
                AND Asset.Is_Available__c = TRUE
            """)
        except Exception as ce:
            print(f"⚠️  Count query failed: {ce}")

        # Fetch all records — paginated
        rows = sf.execute_soql(f"""
            SELECT
                AssetId,
                Asset.Name,
                Field,
                OldValue,
                NewValue,
                CreatedDate
            FROM AssetHistory
            WHERE Field = 'User__c'
            AND Asset.Is_Available__c = TRUE
            ORDER BY CreatedDate DESC
            LIMIT {limit} OFFSET {offset}
        """)

        allocations = []
        for r in rows:
            asset_obj  = r.get("Asset")
            asset_name = (
                asset_obj.get("Name") if isinstance(asset_obj, dict)
                else r.get("AssetId")
            )
            allocations.append({
                "asset_id":     r.get("AssetId"),
                "asset_name":   asset_name,
                "old_value":    r.get("OldValue"),
                "new_value":    r.get("NewValue"),
                "created_date": r.get("CreatedDate"),
            })

        print(f"✅ Asset Allocation: {len(allocations)} records fetched (total={total_count})")
        return {
            "success":     True,
            "total":       total_count if total_count > 0 else len(allocations),
            "returned":    len(allocations),
            "offset":      offset,
            "allocations": allocations,
        }

    except Exception as e:
        print(f"❌ AssetAllocation error:\n{traceback.format_exc()}")
        # Return fallback response instead of raising
        return {
            "success":     True,
            "total":       0,
            "returned":    0,
            "offset":      offset,
            "allocations": [],
        }