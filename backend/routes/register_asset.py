# -*- coding: utf-8 -*-
"""
register_asset.py — Register / list Salesforce Asset records.
Uses per-request SalesforceService (same pattern as assets.py / uploadvehicle.py).
Images are stored locally in backend/asset_images.json keyed by Salesforce Id.
"""

from fastapi import APIRouter, HTTPException, Request
from typing import Optional
from pathlib import Path
import json
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from salesforce_service import SalesforceService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/register-asset", tags=["Register Asset"])

# ── Local image store ─────────────────────────────────────────────────────────
_IMAGES_PATH = Path(__file__).parent.parent / "asset_images.json"


def _load_images() -> dict:
    try:
        if _IMAGES_PATH.exists():
            return json.loads(_IMAGES_PATH.read_text(encoding="utf-8"))
    except Exception as e:
        logger.warning(f"[IMAGES] Load failed: {e}")
    return {}


def _save_images(data: dict) -> None:
    try:
        _IMAGES_PATH.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    except Exception as e:
        logger.warning(f"[IMAGES] Save failed: {e}")


# ── Per-request helpers ────────────────────────────────────────────────────────

def _new_sf() -> SalesforceService:
    """Create a fresh Salesforce connection for this request (like other routes)."""
    return SalesforceService()


# ── Purchase Type mapping and validation ───────────────────────────────────
def _normalize_purchase_type(value: str) -> str:
    """
    Normalize purchase type values to valid Salesforce picklist values.
    Maps common variations to standard Salesforce values.
    """
    if not value:
        return ""
    
    value_lower = value.lower().strip()
    
    # Mapping of common input values to valid Salesforce values
    mapping = {
        "hsbc lease": "Lease",
        "lease": "Lease",
        "purchase": "Purchase",
        "owned": "Owned",
        "equipment": "Equipment",
        "other": "Other",
    }
    
    # Try exact mapping first
    normalized = mapping.get(value_lower, value)
    
    # If normalization changed it, use normalized; otherwise use original
    if normalized != value and normalized in mapping.values():
        logger.info(f"[NORMALIZE] Purchase Type: '{value}' → '{normalized}'")
        return normalized
    
    # Return original if not in mapping (Salesforce will validate)
    return value


def _lookup(sf: SalesforceService, obj: str, name: str) -> Optional[str]:
    """Resolve Salesforce Name → Id."""
    if not name or not name.strip():
        return None
    try:
        escaped = name.strip().replace("'", "\\'")
        rows = sf.execute_soql(f"SELECT Id FROM {obj} WHERE Name = '{escaped}' LIMIT 1")
        return rows[0]["Id"] if rows else None
    except Exception as e:
        logger.warning(f"[LOOKUP] {obj} '{name}': {e}")
        return None


def _lookup_asset_type(sf: SalesforceService, name: str) -> Optional[str]:
    """Try all known asset-type object names to resolve Id."""
    escaped = name.strip().replace("'", "\\'")
    for obj in ["Asset_Type__c", "AssetType__c", "Asset_Types__c"]:
        try:
            rows = sf.execute_soql(f"SELECT Id FROM {obj} WHERE Name = '{escaped}' LIMIT 1")
            if rows:
                return rows[0]["Id"]
        except Exception:
            continue
    return None


def _rel(record: dict, key: str, sub: str = "Name") -> Optional[str]:
    val = record.get(key)
    return val.get(sub) if isinstance(val, dict) else None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/ping")
async def ping():
    """Health check — verifies the router is registered and reachable."""
    sf = _new_sf()
    return {
        "ok": True,
        "mock_mode": sf.mock_mode,
        "sf_connected": sf.sf is not None,
    }


@router.get("/users")
async def get_salesforce_users():
    """Fetch active Salesforce users. Always returns 200."""
    sf = _new_sf()
    try:
        results = sf.execute_soql("""
            SELECT Id, Name, Email
            FROM User
            WHERE IsActive = true
            ORDER BY Name ASC
            LIMIT 500
        """)
        return {"success": True, "users": results}
    except Exception as e:
        logger.error(f"[USERS] {e}")
        return {"success": True, "users": []}


@router.get("/purchase-types")
async def get_purchase_types():
    """Fetch valid Purchase_Type__c picklist values. Always returns 200."""
    sf = _new_sf()
    
    # Default valid purchase types (common values)
    default_types = [
        {"id": "Lease", "name": "Lease"},
        {"id": "Purchase", "name": "Purchase"},
        {"id": "Equipment", "name": "Equipment"},
        {"id": "Owned", "name": "Owned"},
        {"id": "HSBC Lease", "name": "HSBC Lease"},
        {"id": "Other", "name": "Other"},
    ]
    
    # Try to fetch from Salesforce metadata if connected
    if not sf.mock_mode and sf.sf:
        try:
            # Query Asset object field metadata
            metadata = sf.sf.Asset.metadata()
            if metadata:
                # Find Purchase_Type__c field
                for field in metadata.get("fields", []):
                    if field.get("name") == "Purchase_Type__c":
                        picklistValues = field.get("picklistValues", [])
                        if picklistValues:
                            types = [
                                {"id": pv.get("value"), "name": pv.get("label", pv.get("value"))}
                                for pv in picklistValues if pv.get("active", True)
                            ]
                            if types:
                                logger.info(f"[PURCHASE_TYPES] Fetched {len(types)} from Salesforce metadata")
                                return {"success": True, "purchase_types": types}
        except Exception as e:
            logger.warning(f"[PURCHASE_TYPES] Metadata fetch failed: {e}. Using defaults.")
    
    logger.info(f"[PURCHASE_TYPES] Using {len(default_types)} default values")
    return {"success": True, "purchase_types": default_types}


@router.get("/asset-types")
async def get_asset_types():
    """Fetch available Asset Types. Always returns 200."""
    sf = _new_sf()
    id_to_name: dict = {}

    try:
        for obj in ["Asset_Type__c", "AssetType__c", "Asset_Types__c"]:
            try:
                rows = sf.execute_soql(f"SELECT Id, Name FROM {obj} LIMIT 2000")
                if rows:
                    for r in rows:
                        if r.get("Id") and r.get("Name"):
                            id_to_name[r["Id"]] = r["Name"]
                    if id_to_name:
                        logger.info(f"[TYPES] {len(id_to_name)} from {obj}")
                        break
            except Exception:
                continue

        if not id_to_name:
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
                        tid = r.get("Asset_Type__c")
                        rel = r.get("Asset_Type__r")
                        if tid and isinstance(rel, dict) and rel.get("Name"):
                            id_to_name[tid] = rel["Name"]
                    if len(rows) < 2000:
                        break
                    offset += 2000
                except Exception as e:
                    logger.warning(f"[TYPES] Traversal: {e}")
                    break
    except Exception as e:
        logger.error(f"[TYPES] Outer error: {e}")

    types = sorted(
        [{"id": k, "name": v} for k, v in id_to_name.items() if v],
        key=lambda x: x["name"],
    )
    return {"success": True, "count": len(types), "asset_types": types}


@router.post("/create")
async def create_asset(request: Request):
    """Register a new Salesforce Asset and store images locally."""
    try:
        data = await request.json()
        logger.info(f"[CREATE] Keys received: {list(data.keys())}")

        asset_name = (data.get("asset_name") or "").strip()
        if not asset_name:
            raise HTTPException(status_code=400, detail="Asset Name is required")

        sf = _new_sf()
        payload: dict = {"Name": asset_name}

        # Text / picklist fields
        for src, dest in [
            ("serial_number",   "SerialNumber"),
            ("status",          "Status"),
            ("description",     "Description"),
        ]:
            v = data.get(src)
            if v and str(v).strip():
                payload[dest] = str(v).strip()

        # Handle purchase_type with normalization
        if data.get("purchase_type"):
            normalized_type = _normalize_purchase_type(data.get("purchase_type", ""))
            if normalized_type:
                payload["Purchase_Type__c"] = normalized_type

        # Numeric
        if data.get("price") not in (None, ""):
            try:
                payload["Price"] = float(data["price"])
            except (ValueError, TypeError):
                pass

        # Date
        if data.get("purchase_date"):
            payload["PurchaseDate"] = data["purchase_date"]

        # Lookup resolution
        if data.get("account_name"):
            acc_id = _lookup(sf, "Account", data["account_name"])
            if acc_id:
                payload["AccountId"] = acc_id
                logger.info(f"[LOOKUP] Account → {acc_id}")
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Account not found: '{data['account_name']}'. Please verify the account name exists in Salesforce."
                )

        if data.get("user_name"):
            user_id = _lookup(sf, "User", data["user_name"])
            if user_id:
                payload["User__c"] = user_id
                logger.info(f"[LOOKUP] User → {user_id}")
            else:
                logger.warning(f"[LOOKUP] User not found: {data['user_name']}")

        if data.get("asset_type"):
            type_id = _lookup_asset_type(sf, data["asset_type"])
            if type_id:
                payload["Asset_Type__c"] = type_id
                logger.info(f"[LOOKUP] AssetType → {type_id}")
            else:
                logger.warning(f"[LOOKUP] AssetType not found: {data['asset_type']}")

        # Validate that either Account or Contact is present (Salesforce requirement)
        if "AccountId" not in payload and "ContactId" not in payload:
            raise HTTPException(
                status_code=400,
                detail="Every asset requires an Account or Contact. Please provide an Account name."
            )

        logger.info(f"[SALESFORCE] Sending fields: {list(payload.keys())}")

        # Mock mode
        if sf.mock_mode or not sf.sf:
            mock_id = f"MOCK-{asset_name[:10].replace(' ', '-').upper()}-001"
            images = data.get("images", [])
            if images:
                store = _load_images()
                store[mock_id] = images
                _save_images(store)
            logger.info(f"[MOCK] Asset would be created: {mock_id}")
            return {
                "success": True,
                "message": "Asset registered (Salesforce mock mode — check SF credentials)",
                "salesforce_id": mock_id,
            }

        # Create in Salesforce
        result = sf.sf.Asset.create(payload)
        logger.info(f"[SALESFORCE] Raw result: {result}")

        if not result.get("success"):
            raise HTTPException(status_code=400, detail=f"Salesforce rejected: {result}")

        sf_id = result.get("id")
        logger.info(f"[OK] Asset created in Salesforce: {sf_id}")

        # Store images locally
        images = data.get("images", [])
        if images and sf_id:
            store = _load_images()
            store[sf_id] = images
            _save_images(store)
            logger.info(f"[IMAGES] {len(images)} image(s) saved for {sf_id}")

        return {
            "success": True,
            "message": "Asset registered successfully in Salesforce!",
            "salesforce_id": sf_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ERROR] create_asset: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_assets():
    """All Salesforce Asset records for the gallery. Always returns 200."""
    sf = _new_sf()
    try:
        results = sf.execute_soql("""
            SELECT Id, Name, SerialNumber, Status, Price, PurchaseDate,
                   Account.Name, Asset_Type__r.Name, User__r.Name,
                   Description, CreatedDate
            FROM Asset
            ORDER BY CreatedDate DESC
            LIMIT 1000
        """)
        img_store = _load_images()
        assets = []
        for r in results:
            aid = r.get("Id")
            assets.append({
                "id":              aid,
                "name":            r.get("Name"),
                "serial_number":   r.get("SerialNumber"),
                "status":          r.get("Status"),
                "price":           r.get("Price"),
                "purchase_date":   r.get("PurchaseDate"),
                "account_name":    _rel(r, "Account"),
                "asset_type":      _rel(r, "Asset_Type__r"),
                "user_name":       _rel(r, "User__r"),
                "description":     r.get("Description"),
                "created_date":    r.get("CreatedDate"),
                "images":          img_store.get(aid, []),
            })
        return {"success": True, "count": len(assets), "assets": assets}
    except Exception as e:
        logger.error(f"[LIST] {e}")
        return {"success": True, "count": 0, "assets": []}


@router.get("/recent")
async def get_recent_assets():
    """20 most recently created assets."""
    sf = _new_sf()
    try:
        results = sf.execute_soql("""
            SELECT Id, Name, SerialNumber, Status, Price, PurchaseDate,
                   Account.Name, Asset_Type__r.Name, User__r.Name,
                   Description, CreatedDate
            FROM Asset ORDER BY CreatedDate DESC LIMIT 20
        """)
        img_store = _load_images()
        for r in results:
            r["images"] = img_store.get(r.get("Id"), [])
        return {"success": True, "count": len(results), "assets": results}
    except Exception as e:
        logger.error(f"[RECENT] {e}")
        return {"success": True, "count": 0, "assets": []}
