import traceback
from fastapi import APIRouter, HTTPException
from salesforce_service import SalesforceService

# ── Router — prefix matches what the frontend calls ──────────────────────────
router = APIRouter(prefix="/api/dashboard", tags=["asset-cost"])


def _safe_float(val, default=0.0) -> float:
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def _extract_aggregate(row: dict) -> float:
    """
    Salesforce aggregate responses may return the numeric value under the
    alias name, 'expr0', or another auto-generated key.
    Try every non-metadata key until we find a positive float.
    """
    if not row:
        return 0.0
    for k, v in row.items():
        if k == "attributes":
            continue
        if v is None:
            continue
        try:
            f = float(v)
            if f > 0:
                return f
        except (TypeError, ValueError):
            continue
    return 0.0


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/dashboard/asset-cost-summary
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/asset-cost-summary")
def get_asset_cost_summary():
    """Total spend across all assets that have a Price."""
    try:
        sf = SalesforceService()

        rows = sf.execute_soql(
            "SELECT SUM(Price) totalPurchaseSpend FROM Asset WHERE Price != NULL"
        )
        print(f"[DEBUG] asset-cost-summary raw: {rows}")

        total = _extract_aggregate(rows[0]) if rows else 0.0

        # Fallback: Python-side sum if SOQL aggregate returned 0
        if total == 0.0:
            print("⚠️  Aggregate returned 0 — Python SUM fallback")
            price_rows = sf.execute_soql(
                "SELECT Price FROM Asset WHERE Price != NULL LIMIT 2000"
            )
            total = sum(_safe_float(r.get("Price")) for r in price_rows)

        total = round(total, 2)
        print(f"✅ asset-cost-summary: £{total}")
        return {"success": True, "total_spend": total}

    except Exception as e:
        print(f"❌ asset-cost-summary:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/dashboard/asset-costs
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/asset-costs")
def get_asset_costs():
    """Every asset with a Price, sorted descending."""
    try:
        sf = SalesforceService()

        rows = sf.execute_soql("""
            SELECT Id, Name, Price, Asset_Type__r.Name,
                   PurchaseDate, Status
            FROM Asset
            WHERE Price != NULL
            ORDER BY Price DESC
            LIMIT 500
        """)

        print(f"[DEBUG] asset-costs: {len(rows)} rows")

        assets = []
        for r in rows:
            price = _safe_float(r.get("Price"))
            if price <= 0:
                continue

            asset_type_raw = r.get("Asset_Type__r")
            asset_type = (
                asset_type_raw.get("Name", "N/A")
                if isinstance(asset_type_raw, dict)
                else str(asset_type_raw) if asset_type_raw else "N/A"
            )

            assets.append({
                "id":            r.get("Id", ""),
                "name":          r.get("Name") or "—",
                "price":         round(price, 2),
                "asset_type":    asset_type,
                "purchase_date": r.get("PurchaseDate"),
                "status":        r.get("Status") or "N/A",
            })

        print(f"✅ asset-costs: {len(assets)} records")
        return {"success": True, "total": len(assets), "assets": assets}

    except Exception as e:
        print(f"❌ asset-costs:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/dashboard/asset-cost-by-type
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/asset-cost-by-type")
def get_asset_cost_by_type():
    """Total spend per asset type."""
    try:
        sf = SalesforceService()
        data = []

        # ── Strategy 1: SOQL GROUP BY ────────────────────────────────────────
        try:
            rows = sf.execute_soql("""
                SELECT Asset_Type__r.Name typeName,
                       SUM(Price) totalSpend,
                       COUNT(Id) assetCount
                FROM Asset
                WHERE Price != NULL
                GROUP BY Asset_Type__r.Name
                ORDER BY SUM(Price) DESC
            """)

            print(f"[DEBUG] asset-cost-by-type GROUP BY: {len(rows)} rows")

            for r in rows:
                raw = r.get("Asset_Type__r") or r.get("typeName")
                tname = (
                    raw.get("Name", "Unknown") if isinstance(raw, dict)
                    else str(raw) if raw else "Unassigned"
                )

                spend = _extract_aggregate({
                    k: v for k, v in r.items()
                    if k not in ("attributes", "Asset_Type__r", "typeName", "assetCount")
                })
                count = int(_safe_float(
                    r.get("assetCount") or r.get("expr1") or 0
                ))

                if spend > 0:
                    data.append({
                        "type_id":     tname,
                        "type_name":   tname,
                        "total_spend": round(spend, 2),
                        "asset_count": count,
                        "average_cost": round(spend / count, 2) if count else 0,
                    })

            if data:
                print(f"✅ asset-cost-by-type (GROUP BY): {len(data)} types")
                return {"success": True, "total": len(data), "cost_by_type": data}

            print("⚠️  GROUP BY returned no data — Python fallback")

        except Exception as grp_err:
            print(f"⚠️  GROUP BY failed: {grp_err} — Python fallback")

        # ── Strategy 2: Python-side grouping ─────────────────────────────────
        all_rows = []
        offset = 0
        while True:
            batch = sf.execute_soql(f"""
                SELECT Asset_Type__r.Name, Price
                FROM Asset
                WHERE Price != NULL
                LIMIT 2000 OFFSET {offset}
            """)
            if not batch:
                break
            all_rows.extend(batch)
            if len(batch) < 2000:
                break
            offset += 2000

        print(f"[DEBUG] Python grouping: {len(all_rows)} rows")

        type_costs:  dict = {}
        type_counts: dict = {}

        for r in all_rows:
            price = _safe_float(r.get("Price"))
            raw   = r.get("Asset_Type__r")
            tname = (
                raw.get("Name", "Unassigned") if isinstance(raw, dict)
                else str(raw) if raw else "Unassigned"
            )
            type_costs[tname]  = type_costs.get(tname, 0.0) + price
            type_counts[tname] = type_counts.get(tname, 0)  + 1

        data = [
            {
                "type_id":     k,
                "type_name":   k,
                "total_spend": round(v, 2),
                "asset_count": type_counts.get(k, 0),
                "average_cost": round(v / type_counts[k], 2) if type_counts.get(k) else 0,
            }
            for k, v in sorted(type_costs.items(), key=lambda x: -x[1])
            if v > 0
        ]

        print(f"✅ asset-cost-by-type (Python): {len(data)} types")
        return {"success": True, "total": len(data), "cost_by_type": data}

    except Exception as e:
        print(f"❌ asset-cost-by-type:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# BACKWARD-COMPAT ALIASES
# Any other file that does:
#   from routes.Asset_cost import get_total_cost, get_cost_per_asset, get_cost_per_type
# will still work without modification.
# ─────────────────────────────────────────────────────────────────────────────
def get_total_cost():
    return get_asset_cost_summary()

def get_cost_per_asset():
    return get_asset_costs()

def get_cost_per_type():
    return get_asset_cost_by_type()