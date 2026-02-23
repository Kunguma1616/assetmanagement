import traceback
from fastapi import APIRouter, HTTPException
from salesforce_service import SalesforceService

router = APIRouter(prefix="/api/asset-cost", tags=["asset-cost"])


def _safe_float(val, default=0.0) -> float:
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default


@router.get("/total")
def get_total_cost():
    """SUM(Price) FROM Asset WHERE Price != NULL"""
    try:
        sf = SalesforceService()
        rows = sf.execute_soql(
            "SELECT SUM(Price) totalPurchaseSpend FROM Asset WHERE Price != NULL"
        )
        total = _safe_float(rows[0].get("expr0") if rows else 0)
        print(f"✅ Total Cost: £{round(total, 2)}")
        return {"success": True, "total_spend": round(total, 2)}
    except Exception as e:
        print(f"❌ Total cost error:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/per-asset")
def get_cost_per_asset():
    """Name, Price FROM Asset WHERE Price != NULL ORDER BY Price DESC"""
    try:
        sf = SalesforceService()
        rows = sf.execute_soql("""
            SELECT Name, Price
            FROM Asset
            WHERE Price != NULL
            ORDER BY Price DESC
            LIMIT 500
        """)
        data = [
            {"name": r.get("Name") or "—", "price": round(_safe_float(r.get("Price")), 2)}
            for r in rows
        ]
        total = sum(d["price"] for d in data)
        print(f"✅ Cost per asset: {len(data)} records, total £{round(total, 2)}")
        return {"success": True, "total": len(data), "total_spend": round(total, 2), "data": data}
    except Exception as e:
        print(f"❌ Cost per asset error:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/per-type")
def get_cost_per_type():
    """SUM(Price) GROUP BY Asset_Type__r.Name"""
    try:
        sf = SalesforceService()
        rows = sf.execute_soql("""
            SELECT Asset_Type__r.Name typeName, SUM(Price) totalSpend
            FROM Asset
            WHERE Price != NULL
            GROUP BY Asset_Type__r.Name
            ORDER BY SUM(Price) DESC
        """)
        data = []
        for r in rows:
            name = r.get("Asset_Type__r")
            name = name.get("Name", "Unknown") if isinstance(name, dict) else str(name or "Unknown")
            data.append({"type_name": name, "total_spend": round(_safe_float(r.get("expr0")), 2)})
        print(f"✅ Cost per type: {len(data)} types")
        return {"success": True, "total": len(data), "data": data}
    except Exception as e:
        print(f"❌ Cost per type error:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))