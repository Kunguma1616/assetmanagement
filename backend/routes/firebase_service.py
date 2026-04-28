import mimetypes
import os
import re
import uuid
from datetime import datetime, timedelta

from .firebase_client import get_bucket, get_db
from google.cloud import firestore


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _slugify_folder_part(value: str) -> str:
    text = (value or "").strip()
    if not text:
        return "unknown"
    text = re.sub(r"[^A-Za-z0-9]+", "-", text)
    return text.strip("-").lower() or "unknown"


def _parse_dt(value) -> datetime | None:
    """Parse ISO string or Firestore Timestamp → datetime."""
    if value is None:
        return None
    if hasattr(value, "isoformat"):          # already datetime / Timestamp
        return value
    try:
        return datetime.fromisoformat(str(value))
    except Exception:
        return None


# ==================== VCR CREATE ====================

def create_vcr_record(
    vehicle_id: str,
    engineer_id: str,
    engineer_name: str,
    form_data: dict,
) -> str:
    """
    Save a new VCR to Firebase Firestore.
    Returns the new vcr_id (UUID string).
    """
    db = get_db()
    vcr_id = str(uuid.uuid4())
    created_at = datetime.utcnow()

    db.collection("vcr_reports").document(vcr_id).set(
        {
            "vehicle_id":        vehicle_id,
            "engineer_id":       engineer_id,
            "engineer_name":     engineer_name,
            "van_number":        form_data.get("van_number", ""),
            "description":       form_data.get("description", ""),
            "internal_notes":    form_data.get("internal_notes", ""),
            "inspection_result": form_data.get("inspection_result", ""),
            "created_at":        created_at.isoformat(),
            "photos":            [],
        }
    )

    return vcr_id


# ==================== PHOTO UPLOAD ====================

def upload_photo(
    vcr_id: str,
    file_name: str,
    file_content: bytes,
    content_type: str | None = None,
    engineer_name: str | None = None,
    van_number: str | None = None,
    created_at: str | None = None,
) -> str:
    """
    Upload a photo to Firebase Storage, store the signed URL on the VCR document.
    Returns the signed URL.
    """
    db = get_db()
    bucket = get_bucket()

    safe_name = os.path.basename(file_name or "").strip()
    guessed_ext = mimetypes.guess_extension(content_type or "") or ""
    if not safe_name:
        safe_name = f"{uuid.uuid4().hex}{guessed_ext}"
    elif "." not in safe_name and guessed_ext:
        safe_name = f"{safe_name}{guessed_ext}"

    created_folder = created_at or datetime.utcnow().strftime("%Y-%m-%d")
    folder_name = (
        f"{_slugify_folder_part(engineer_name)}__"
        f"{_slugify_folder_part(van_number)}__"
        f"{_slugify_folder_part(created_folder)}__"
        f"{vcr_id}"
    )

    blob = bucket.blob(f"vcr_photos/{folder_name}/{uuid.uuid4().hex}_{safe_name}")
    resolved_content_type = (
        content_type
        or mimetypes.guess_type(safe_name)[0]
        or "application/octet-stream"
    )

    blob.upload_from_string(file_content, content_type=resolved_content_type)

    # Signed URL (7 days) — works with uniform bucket access control
    image_url = blob.generate_signed_url(
        expiration=timedelta(days=7),
        method="GET",
        version="v4",
    )

    # Append URL to the VCR's photos array in Firestore
    db.collection("vcr_reports").document(vcr_id).update(
        {"photos": firestore.ArrayUnion([image_url])}
    )

    return image_url


# ==================== VCR READ — DASHBOARD ====================================

def get_all_vcrs_from_firebase(days: int = 200) -> list[dict]:
    """
    Return all VCR records created in the last `days` days, newest first.
    Each record is a plain dict with an extra 'id' key.
    """
    db = get_db()
    cutoff = datetime.utcnow() - timedelta(days=days)

    docs = (
        db.collection("vcr_reports")
        .order_by("created_at", direction=firestore.Query.DESCENDING)
        .stream()
    )

    results = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id

        # Filter by date (stored as ISO string)
        created = _parse_dt(data.get("created_at"))
        if created and created < cutoff:
            continue

        results.append(data)

    return results


def get_latest_vcr_for_engineer(engineer_name: str) -> dict | None:
    """
    Return the most recent VCR submitted by a given engineer, or None.
    Uses Python-side sorting to avoid requiring a composite Firestore index.
    """
    db = get_db()
    docs = (
        db.collection("vcr_reports")
        .where("engineer_name", "==", engineer_name)
        .stream()
    )
    results = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        results.append(data)
    if not results:
        return None
    results.sort(key=lambda d: str(d.get("created_at") or ""), reverse=True)
    return results[0]


def get_latest_vcr_by_van(van_number: str) -> dict | None:
    """
    Return the most recent VCR for a given van number, or None.
    Uses Python-side sorting to avoid requiring a composite Firestore index.
    """
    db = get_db()
    docs = (
        db.collection("vcr_reports")
        .where("van_number", "==", van_number)
        .stream()
    )
    results = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        results.append(data)
    if not results:
        return None
    results.sort(key=lambda d: str(d.get("created_at") or ""), reverse=True)
    return results[0]


def get_vcr_by_id(vcr_id: str) -> dict | None:
    """Return a single VCR by its document ID."""
    db = get_db()
    doc = db.collection("vcr_reports").document(vcr_id).get()
    if doc.exists:
        data = doc.to_dict()
        data["id"] = doc.id
        return data
    return None


def get_vcrs_for_van(van_number: str, limit: int = 20) -> list[dict]:
    """Return all VCRs for a van, newest first."""
    db = get_db()
    docs = (
        db.collection("vcr_reports")
        .where("van_number", "==", van_number)
        .order_by("created_at", direction=firestore.Query.DESCENDING)
        .limit(limit)
        .stream()
    )
    results = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        results.append(data)
    return results

def get_allocations_from_firebase(
    engineer_name: str,
    engineer_email: str | None = None,
) -> list[dict]:
    db = get_db()
    docs = (
        db.collection("allocations")
        .where("engineer_name", "==", engineer_name)
        .stream()
    )
    return [doc.to_dict() for doc in docs]

def get_inspection_results_from_firebase() -> list[str]:
    db = get_db()
    doc = db.collection("config").document("inspection_results").get()
    if doc.exists:
        return doc.to_dict().get("values", [])
    return ["Completed", "Incomplete", "Failed", "Passed"]