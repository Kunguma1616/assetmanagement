import traceback

from fastapi import APIRouter, HTTPException

from salesforce_service import SalesforceService


router = APIRouter(prefix="/api/dashboard", tags=["asset-cost"])


def _safe_float(val, default=0.0) -> float:
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def _extract_aggregate(row: dict) -> float:
    """
    Salesforce aggregate responses may return the numeric value under the
    alias name, "expr0", or another auto-generated key.
    Try every non-metadata key until we find a positive float.
    """
    if not row:
        return 0.0

    for key, value in row.items():
        if key == "attributes" or value is None:
            continue
        try:
            parsed = float(value)
            if parsed > 0:
                return parsed
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

        # Fallback: Python-side sum if SOQL aggregate returned 0.
        if total == 0.0:
            print("[WARN] Aggregate returned 0 - using Python SUM fallback")
            price_rows = sf.execute_soql(
                "SELECT Price FROM Asset WHERE Price != NULL LIMIT 2000"
            )
            total = sum(_safe_float(row.get("Price")) for row in price_rows)

        total = round(total, 2)
        print(f"[OK] asset-cost-summary: GBP {total}")
        return {"success": True, "total_spend": total}

    except Exception as exc:
        print(f"[ERROR] asset-cost-summary:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/asset-costs")
def get_asset_costs():
    """Every asset with a Price, sorted descending."""
    try:
        sf = SalesforceService()

        rows = sf.execute_soql(
            """
            SELECT Id, Name, Price, Asset_Type__r.Name,
                   PurchaseDate, Status
            FROM Asset
            WHERE Price != NULL
            ORDER BY Price DESC
            LIMIT 500
            """
        )

        print(f"[DEBUG] asset-costs: {len(rows)} rows")

        assets = []
        for row in rows:
            price = _safe_float(row.get("Price"))
            if price <= 0:
                continue

            asset_type_raw = row.get("Asset_Type__r")
            asset_type = (
                asset_type_raw.get("Name", "N/A")
                if isinstance(asset_type_raw, dict)
                else str(asset_type_raw)
                if asset_type_raw
                else "N/A"
            )

            assets.append(
                {
                    "id": row.get("Id", ""),
                    "name": row.get("Name") or "-",
                    "price": round(price, 2),
                    "asset_type": asset_type,
                    "purchase_date": row.get("PurchaseDate"),
                    "status": row.get("Status") or "N/A",
                }
            )

        print(f"[OK] asset-costs: {len(assets)} records")
        return {"success": True, "total": len(assets), "assets": assets}

    except Exception as exc:
        print(f"[ERROR] asset-costs:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/asset-cost-by-type")
def get_asset_cost_by_type():
    """Total spend per asset type."""
    try:
        sf = SalesforceService()
        data = []

        # Strategy 1: SOQL GROUP BY.
        try:
            rows = sf.execute_soql(
                """
                SELECT Asset_Type__r.Name typeName,
                       SUM(Price) totalSpend,
                       COUNT(Id) assetCount
                FROM Asset
                WHERE Price != NULL
                GROUP BY Asset_Type__r.Name
                ORDER BY SUM(Price) DESC
                """
            )

            print(f"[DEBUG] asset-cost-by-type GROUP BY: {len(rows)} rows")

            for row in rows:
                raw_name = row.get("Asset_Type__r") or row.get("typeName")
                type_name = (
                    raw_name.get("Name", "Unknown")
                    if isinstance(raw_name, dict)
                    else str(raw_name)
                    if raw_name
                    else "Unassigned"
                )

                spend = _extract_aggregate(
                    {
                        key: value
                        for key, value in row.items()
                        if key
                        not in ("attributes", "Asset_Type__r", "typeName", "assetCount")
                    }
                )
                count = int(_safe_float(row.get("assetCount") or row.get("expr1") or 0))

                if spend > 0:
                    data.append(
                        {
                            "type_id": type_name,
                            "type_name": type_name,
                            "total_spend": round(spend, 2),
                            "asset_count": count,
                            "average_cost": round(spend / count, 2) if count else 0,
                        }
                    )

            if data:
                print(f"[OK] asset-cost-by-type (GROUP BY): {len(data)} types")
                return {"success": True, "total": len(data), "cost_by_type": data}

            print("[WARN] GROUP BY returned no data - using Python fallback")

        except Exception as group_err:
            print(f"[WARN] GROUP BY failed: {group_err} - using Python fallback")

        # Strategy 2: Python-side grouping.
        all_rows = []
        offset = 0
        while True:
            batch = sf.execute_soql(
                f"""
                SELECT Asset_Type__r.Name, Price
                FROM Asset
                WHERE Price != NULL
                LIMIT 2000 OFFSET {offset}
                """
            )
            if not batch:
                break
            all_rows.extend(batch)
            if len(batch) < 2000:
                break
            offset += 2000

        print(f"[DEBUG] Python grouping: {len(all_rows)} rows")

        type_costs = {}
        type_counts = {}

        for row in all_rows:
            price = _safe_float(row.get("Price"))
            raw_name = row.get("Asset_Type__r")
            type_name = (
                raw_name.get("Name", "Unassigned")
                if isinstance(raw_name, dict)
                else str(raw_name)
                if raw_name
                else "Unassigned"
            )
            type_costs[type_name] = type_costs.get(type_name, 0.0) + price
            type_counts[type_name] = type_counts.get(type_name, 0) + 1

        data = [
            {
                "type_id": key,
                "type_name": key,
                "total_spend": round(value, 2),
                "asset_count": type_counts.get(key, 0),
                "average_cost": round(value / type_counts[key], 2)
                if type_counts.get(key)
                else 0,
            }
            for key, value in sorted(type_costs.items(), key=lambda item: -item[1])
            if value > 0
        ]

        print(f"[OK] asset-cost-by-type (Python): {len(data)} types")
        return {"success": True, "total": len(data), "cost_by_type": data}

    except Exception as exc:
        print(f"[ERROR] asset-cost-by-type:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(exc))


def get_total_cost():
    return get_asset_cost_summary()


def get_cost_per_asset():
    return get_asset_costs()


def get_cost_per_type():
    return get_asset_cost_by_type()
