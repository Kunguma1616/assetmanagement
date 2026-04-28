import json
import os
from functools import lru_cache
import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, firestore, storage
load_dotenv()
_db = None

@lru_cache(maxsize=1)
def _service_account_info() -> dict:
    key_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
    with open(key_path, "r", encoding="utf-8") as f:
        return json.load(f)


def _get_storage_bucket_name() -> str:
    explicit_bucket = os.getenv("FIREBASE_STORAGE_BUCKET")
    if explicit_bucket:
        return explicit_bucket
    service_account = _service_account_info()
    project_id = service_account.get("project_id")
    if not project_id:
        raise ValueError("serviceAccountKey.json is missing project_id")
    return f"{project_id}.firebasestorage.app"


def get_db():
    global _db
    if _db is not None:
        return _db
    if not firebase_admin._apps:
        key_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(
            cred,
            {"storageBucket": _get_storage_bucket_name()},
        )
    _db = firestore.client()
    return _db

def get_bucket():
    get_db()
    return storage.bucket()