import traceback
from fastapi import APIRouter, HTTPException
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from salesforce_service import SalesforceService

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


# ─────────────────────────────────────────────────────────────────────────────
# UTILITY HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _safe_float(val, default=0.0) -> float:
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def _safe_count(sf, query: str, fallback: int = 0) -> int:
    try:
        if "COUNT" in query.upper():
            return sf.execute_soql_count(query)
        count_query = f"SELECT COUNT() FROM {query.split('FROM ')[1].strip()}"
        return sf.execute_soql_count(count_query)
    except Exception as e:
        print(f"[WARNING] COUNT query failed: {e}")
        return fallback


def _get_type_id_to_name_map(sf) -> dict:
    id_to_name: dict = {}
    for obj in ["Asset_Type__c", "AssetType__c", "Asset_Types__c"]:
        try:
            rows = sf.execute_soql(f"SELECT Id, Name FROM {obj} LIMIT 2000")
            if rows:
                for r in rows:
                    if r.get("Id") and r.get("Name"):
                        id_to_name[r["Id"]] = r["Name"]
                if id_to_name:
                    print(f"✅ ID→Name map from [{obj}]: {len(id_to_name)} entries")
                    return id_to_name
        except Exception:
            continue

    # Fallback: relationship traversal
    offset = 0
    while True:
        try:
            rows = sf.execute_soql(f"""
                SELECT Asset_Type__c, Asset_Type__r.Name
                FROM Asset WHERE Asset_Type__c != NULL
                LIMIT 2000 OFFSET {offset}
            """)
            if not rows:
                break
            for r in rows:
                tid  = r.get("Asset_Type__c")
                rel  = r.get("Asset_Type__r")
                name = rel.get("Name") if isinstance(rel, dict) else None
                if tid and name:
                    id_to_name[tid] = name
            if len(rows) < 2000:
                break
            offset += 2000
        except Exception as e:
            print(f"⚠️  Relationship traversal failed: {e}")
            break

    print(f"✅ ID→Name map via relationship: {len(id_to_name)} entries")
    return id_to_name


def _fetch_all_assets_paginated(sf, fields: str) -> list:
    results = []
    offset  = 0
    while offset <= 2000:
        try:
            batch = sf.execute_soql(f"""
                SELECT {fields} FROM Asset
                LIMIT 2000 OFFSET {offset}
            """)
            if not batch:
                break
            results.extend(batch)
            if len(batch) < 2000:
                break
            offset += 2000
        except Exception as e:
            print(f"[ERROR] Paginated fetch at offset={offset}: {e}")
            break
    print(f"[OK] Paginated fetch: {len(results)} assets")
    return results


def _discover_price_field(sf) -> str:
    for field in ["Price", "UnitPrice", "Purchase_Price__c", "Cost__c", "Asset_Cost__c"]:
        try:
            rows = sf.execute_soql(f"SELECT {field} FROM Asset WHERE {field} != NULL LIMIT 5")
            if rows and any(_safe_float(r.get(field)) > 0 for r in rows):
                print(f"✅ Price field: [{field}]")
                return field
        except Exception:
            continue
    print("⚠️  No price field found — defaulting to Price")
    return "Price"


def _discover_available_field(sf) -> tuple:
    for expr in ["Is_Available__c = true", "Is_Available__c = TRUE", "Is_Available__c != false"]:
        try:
            count = _safe_count(sf, f"SELECT COUNT() FROM Asset WHERE {expr}")
            if count > 0:
                return expr, count
        except Exception:
            continue
    try:
        sample = sf.execute_soql("SELECT Is_Available__c FROM Asset LIMIT 100")
        count  = sum(1 for r in sample if r.get("Is_Available__c") in [True, "true", "TRUE", 1])
        return None, count
    except Exception:
        return None, 0


# ─────────────────────────────────────────────────────────────────────────────
# ASSET DASHBOARD — /api/dashboard/summary
# Called by AssetDashboard.tsx
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/summary")
def get_summary():
    try:
        sf = SalesforceService()
    except Exception as e:
        print(f"❌ Salesforce connection failed: {e}")
        return {
            "total_assets": 0, "available_assets": 0,
            "distinct_types": 0, "asset_types": [],
            "total_cost": 0, "avg_cost_per_asset": 0,
            "cost_by_type": [], "cost_per_asset": [], "allocations": [],
        }

    def safe(fn, fallback=None):
        try: return fn()
        except Exception as exc:
            print(f"⚠️  sub-query failed: {exc}")
            return fallback

    total_assets     = safe(lambda: _safe_count(sf, "SELECT COUNT() FROM Asset"), 0)
    _, available     = _discover_available_field(sf)
    price_field      = _discover_price_field(sf)
    type_id_to_name  = _get_type_id_to_name_map(sf)
    all_assets       = safe(lambda: _fetch_all_assets_paginated(sf, f"Id, Name, Asset_Type__c, {price_field}"), [])

    type_counts: dict = {}
    type_costs:  dict = {}
    cost_per_asset_list = []
    total_cost = 0.0

    for a in all_assets:
        raw_id    = a.get("Asset_Type__c")
        type_name = (type_id_to_name.get(raw_id) if raw_id and raw_id in type_id_to_name
                     else (raw_id[:12] + "…" if raw_id and len(str(raw_id)) > 12 else (raw_id or "Unassigned")))

        type_counts[type_name] = type_counts.get(type_name, 0) + 1
        price = _safe_float(a.get(price_field))
        if price > 0:
            type_costs[type_name] = type_costs.get(type_name, 0.0) + price
            total_cost += price
            cost_per_asset_list.append({"name": a.get("Name") or "—", "price": round(price, 2)})

    total_cost = round(total_cost, 2)
    avg_cost   = round(total_cost / len(all_assets), 2) if all_assets and total_cost else 0.0
    sorted_types = sorted(type_counts.items(), key=lambda x: -x[1])
    named_types  = [{"type_name": k, "count": v} for k, v in sorted_types]
    cost_by_type = [
        {"type_name": k, "total_spend": round(type_costs.get(k, 0.0), 2)}
        for k, _ in sorted_types if type_costs.get(k, 0.0) > 0
    ]
    cost_per_asset_list.sort(key=lambda x: -x["price"])

    allocations = []
    try:
        alloc_rows = sf.execute_soql("""
            SELECT AssetId, Asset.Name, OldValue, NewValue, CreatedDate
            FROM AssetHistory WHERE Field = 'User__c'
            ORDER BY CreatedDate DESC LIMIT 50
        """)
        for r in alloc_rows:
            asset_obj = r.get("Asset")
            allocations.append({
                "asset_name":   asset_obj.get("Name") if isinstance(asset_obj, dict) else r.get("AssetId"),
                "old_value":    r.get("OldValue"),
                "new_value":    r.get("NewValue"),
                "created_date": r.get("CreatedDate"),
            })
    except Exception as e:
        print(f"⚠️  Allocations: {e}")

    print(f"✅ Summary: total={total_assets}, available={available}, types={len(named_types)}, cost=£{total_cost}")
    return {
        "total_assets":       total_assets,
        "available_assets":   available,
        "distinct_types":     len([t for t in named_types if t["type_name"] != "Unassigned"]),
        "asset_types":        named_types,
        "total_cost":         total_cost,
        "avg_cost_per_asset": avg_cost,
        "cost_by_type":       cost_by_type,
        "cost_per_asset":     cost_per_asset_list[:500],
        "allocations":        allocations,
        "price_field_used":   price_field,
    }


# ─────────────────────────────────────────────────────────────────────────────
# ASSET LOOKUP — /api/dashboard/asset-lookup
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/asset-lookup")
def get_asset_lookup(limit: int = 500, offset: int = 0):
    try:
        sf = SalesforceService()
    except Exception as e:
        return {"success": True, "total": 0, "returned": 0, "offset": offset, "assets": []}

    try:
        type_id_to_name = _get_type_id_to_name_map(sf)
        price_field     = _discover_price_field(sf)
        safe_offset     = min(offset, 2000)
        safe_limit      = min(limit, 2000)

        assets = sf.execute_soql(f"""
            SELECT Id, Name, SerialNumber, Asset_Type__c,
                   User__c, Status, Is_Available__c,
                   Description, InstallDate, PurchaseDate,
                   CreatedDate, LastModifiedDate, {price_field}
            FROM Asset ORDER BY CreatedDate DESC
            LIMIT {safe_limit} OFFSET {safe_offset}
        """)
        total = _safe_count(sf, "SELECT COUNT() FROM Asset")

        return {
            "success": True, "total": total,
            "returned": len(assets), "offset": offset,
            "assets": [{
                "id":            a.get("Id"),
                "name":          a.get("Name") or "—",
                "serial_number": a.get("SerialNumber"),
                "asset_type":    type_id_to_name.get(a.get("Asset_Type__c"), a.get("Asset_Type__c")),
                "user":          a.get("User__c"),
                "status":        a.get("Status") or "Unknown",
                "is_available":  bool(a.get("Is_Available__c")),
                "description":   a.get("Description"),
                "install_date":  a.get("InstallDate"),
                "purchase_date": a.get("PurchaseDate"),
                "created_date":  a.get("CreatedDate"),
                "modified_date": a.get("LastModifiedDate"),
                "price":         _safe_float(a.get(price_field)),
            } for a in assets],
        }
    except Exception as e:
        print(f"❌ asset-lookup:\n{traceback.format_exc()}")
        return {"success": True, "total": 0, "returned": 0, "offset": offset, "assets": []}


# ─────────────────────────────────────────────────────────────────────────────
# COST ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/asset-cost-summary")
def get_asset_cost_summary():
    try:
        sf          = SalesforceService()
        price_field = _discover_price_field(sf)
        result      = sf.execute_soql(f"""
            SELECT SUM({price_field}) totalSpend, COUNT(Id) assetCount
            FROM Asset WHERE {price_field} != NULL
        """)
        total_spend = 0.0
        asset_count = 0
        if result:
            row = result[0]
            # extract aggregate — try all keys
            for k, v in row.items():
                if k == "attributes": continue
                if "spend" in k.lower() or "sum" in k.lower() or k == "totalSpend":
                    val = _safe_float(v)
                    if val > 0:
                        total_spend = val
                if "count" in k.lower() or k == "assetCount":
                    try: asset_count = int(v or 0)
                    except: pass
            # fallback python sum
            if total_spend == 0:
                rows = sf.execute_soql(f"SELECT {price_field} FROM Asset WHERE {price_field} != NULL LIMIT 2000")
                total_spend = sum(_safe_float(r.get(price_field)) for r in rows)

        total_spend = round(total_spend, 2)
        print(f"✅ asset-cost-summary: £{total_spend}")
        return {"success": True, "total_spend": total_spend, "priced_asset_count": asset_count}
    except Exception as e:
        print(f"❌ asset-cost-summary: {e}")
        return {"success": False, "total_spend": 0, "error": str(e)}


@router.get("/asset-costs")
def get_asset_costs():
    try:
        sf              = SalesforceService()
        type_id_to_name = _get_type_id_to_name_map(sf)
        price_field     = _discover_price_field(sf)

        all_priced = []
        offset = 0
        while True:
            batch = sf.execute_soql(f"""
                SELECT Id, Name, {price_field}, Asset_Type__c, PurchaseDate, Status
                FROM Asset WHERE {price_field} != NULL
                ORDER BY {price_field} DESC
                LIMIT 2000 OFFSET {offset}
            """)
            if not batch: break
            all_priced.extend(batch)
            if len(batch) < 2000: break
            offset += 2000

        asset_list = []
        total_cost = 0.0
        for a in all_priced:
            price = _safe_float(a.get(price_field))
            total_cost += price
            asset_list.append({
                "id":           a.get("Id"),
                "name":         a.get("Name", "Unknown"),
                "price":        price,
                "asset_type":   type_id_to_name.get(a.get("Asset_Type__c"), a.get("Asset_Type__c")),
                "purchase_date":a.get("PurchaseDate"),
                "status":       a.get("Status"),
            })

        print(f"✅ asset-costs: {len(asset_list)} assets, £{round(total_cost, 2)}")
        return {"success": True, "assets": asset_list, "total": len(asset_list), "total_cost": round(total_cost, 2)}
    except Exception as e:
        print(f"❌ asset-costs: {e}")
        return {"success": False, "assets": [], "total": 0, "total_cost": 0, "error": str(e)}


@router.get("/asset-cost-by-type")
def get_asset_cost_by_type():
    try:
        sf              = SalesforceService()
        type_id_to_name = _get_type_id_to_name_map(sf)
        price_field     = _discover_price_field(sf)

        all_assets = []
        offset = 0
        while True:
            batch = sf.execute_soql(f"""
                SELECT Asset_Type__c, {price_field}
                FROM Asset WHERE {price_field} != NULL
                LIMIT 2000 OFFSET {offset}
            """)
            if not batch: break
            all_assets.extend(batch)
            if len(batch) < 2000: break
            offset += 2000

        type_costs:  dict = {}
        type_counts: dict = {}
        for a in all_assets:
            tid   = a.get("Asset_Type__c")
            price = _safe_float(a.get(price_field))
            tname = type_id_to_name.get(tid, f"Unknown ({tid})" if tid else "Unassigned")
            type_costs[tname]  = type_costs.get(tname, 0.0) + price
            type_counts[tname] = type_counts.get(tname, 0)  + 1

        cost_by_type = [
            {
                "type_name":    k,
                "total_spend":  round(type_costs[k], 2),
                "asset_count":  type_counts[k],
                "average_cost": round(type_costs[k] / type_counts[k], 2) if type_counts[k] else 0,
            }
            for k in sorted(type_costs, key=lambda x: -type_costs[x])
            if type_costs[k] > 0
        ]
        print(f"✅ asset-cost-by-type: {len(cost_by_type)} types")
        return {"success": True, "cost_by_type": cost_by_type, "total_types": len(cost_by_type)}
    except Exception as e:
        print(f"❌ asset-cost-by-type: {e}")
        return {"success": False, "cost_by_type": [], "error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# NOTE: Vehicle endpoints (vehicle-summary, vehicles-by-status, mot-due,
# tax-due, cost-analysis, cost/vehicle, drivers/excel) are handled by
# routes/dashboard.py — do NOT duplicate them here.
# ─────────────────────────────────────────────────────────────────────────────


# ─────────────────────────────────────────────────────────────────────────────
# LEGACY / MISC ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/get-assets")
def get_all_assets():
    try:
        sf = SalesforceService()
        type_id_to_name = _get_type_id_to_name_map(sf)
        price_field     = _discover_price_field(sf)
        assets = _fetch_all_assets_paginated(sf, f"Id, Name, SerialNumber, Asset_Type__c, {price_field}, PurchaseDate, Status, Description, CreatedDate")
        return {"assets": [{
            "id": idx, "sf_id": a.get("Id"),
            "engineer_name": "Engineer", "engineer_category": "Team",
            "asset_name": a.get("Name", "Unknown"),
            "asset_type": type_id_to_name.get(a.get("Asset_Type__c"), a.get("Asset_Type__c")),
            "manufacturer": "", "model_number": a.get("SerialNumber"),
            "condition": "Good" if a.get("Status") == "Active" else "Fair",
            "ai_description": a.get("Description"), "category": "Asset",
            "image_base64": "", "stored_location": "Salesforce",
            "created_at": a.get("CreatedDate", ""),
            "price": _safe_float(a.get(price_field)),
        } for idx, a in enumerate(assets, 1)]}
    except Exception as e:
        return {"assets": []}


@router.get("/get-asset-types")
def get_asset_types():
    try:
        sf = SalesforceService()
        id_map = _get_type_id_to_name_map(sf)
        return {"success": True, "asset_types": [{"id": k, "name": v} for k, v in id_map.items()]}
    except Exception as e:
        return {"success": False, "asset_types": [], "error": str(e)}


@router.get("/asset-summary")
def get_asset_summary():
    data = get_summary()
    return {
        "total": data["total_assets"], "fetched": data["total_assets"],
        "total_value": data["total_cost"],
        "asset_type_counts": {t["type_name"]: t["count"] for t in data["asset_types"]},
    }


@router.get("/recent-assets")
def get_recent_assets():
    try:
        sf     = SalesforceService()
        assets = sf.execute_soql("SELECT Id, Name, Status, SerialNumber, InstallDate, PurchaseDate, User__c, Is_Available__c FROM Asset ORDER BY CreatedDate DESC LIMIT 10")
        return {"success": True, "total": len(assets), "assets": [{"id": a.get("Id"), "name": a.get("Name"), "status": a.get("Status") or "Unknown", "serial_number": a.get("SerialNumber"), "install_date": a.get("InstallDate"), "purchase_date": a.get("PurchaseDate"), "user": a.get("User__c"), "is_available": bool(a.get("Is_Available__c"))} for a in assets]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/debug-discover")
def debug_discover():
    try:
        sf = SalesforceService()
        total = _safe_count(sf, "SELECT COUNT() FROM Asset")
        _, avail = _discover_available_field(sf)
        price_field = _discover_price_field(sf)
        id_map = _get_type_id_to_name_map(sf)
        return {"total_assets": total, "available": avail, "price_field": price_field, "type_map_count": len(id_map), "type_map_sample": dict(list(id_map.items())[:5])}
    except Exception as e:
        return {"error": str(e)}


# NOTE: /debug-statuses is handled by routes/dashboard.py