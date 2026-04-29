from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Union
import os
from datetime import datetime, timedelta, timezone
import secrets, requests, hmac, hashlib, time, base64
import jwt as pyjwt
from dotenv import load_dotenv
from urllib.parse import urlencode

# =============================================================================
#  FIRESTORE SETUP
#  Falls back to in-memory if Firestore isn't available (local dev)
# =============================================================================
try:
    from google.cloud import firestore as _firestore
    _db = _firestore.Client()
    _db.collection("aspect_sessions").limit(1).get()   # quick connectivity test
    _FIRESTORE_OK = True
    print("✅ [FIRESTORE] Connected — sessions persist across Cloud Run instances")
except Exception as _fs_err:
    _db = None
    _FIRESTORE_OK = False
    print(f"⚠️  [FIRESTORE] NOT available ({_fs_err})")
    print("⚠️  [FIRESTORE] Falling back to in-memory — WILL BREAK on multiple instances!")

# =============================================================================
#  ENV SETUP
# =============================================================================
_ROUTES_DIR  = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_ROUTES_DIR)
_ROOT_DIR    = os.path.dirname(_BACKEND_DIR)

load_dotenv(os.path.join(_BACKEND_DIR, ".env"), override=True)
load_dotenv(os.path.join(_ROOT_DIR,    ".env"), override=True)

def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()

router    = APIRouter(prefix="/api/auth", tags=["authentication"])
_sessions: Dict[str, Dict[str, Any]] = {}   # in-memory fallback only

MICROSOFT_CLIENT_ID     = _env("MICROSOFT_CLIENT_ID")
MICROSOFT_CLIENT_SECRET = _env("MICROSOFT_CLIENT_SECRET")
MICROSOFT_TENANT_ID     = _env("MICROSOFT_TENANT_ID", "common")
FRONTEND_URL            = _env("FRONTEND_URL", "http://localhost:5174")
BACKEND_URL             = _env("BACKEND_URL",  "http://localhost:8080")
EMBED_SECRET            = _env("EMBED_JWT_SECRET")
MICROSOFT_REDIRECT_URI  = _env("MICROSOFT_REDIRECT_URI") or f"{BACKEND_URL}/api/auth/callback/microsoft"

# Startup config — visible in Cloud Run logs on every cold start
print("=" * 60)
print("[auth] STARTUP CONFIG CHECK")
print("=" * 60)
print(f"[auth] MICROSOFT_CLIENT_ID     : {'✅ loaded' if MICROSOFT_CLIENT_ID     else '❌ MISSING — OAuth will fail'}")
print(f"[auth] MICROSOFT_CLIENT_SECRET : {'✅ loaded' if MICROSOFT_CLIENT_SECRET else '❌ MISSING — OAuth will fail'}")
print(f"[auth] MICROSOFT_TENANT_ID     : {MICROSOFT_TENANT_ID}")
print(f"[auth] EMBED_JWT_SECRET        : {'✅ loaded' if EMBED_SECRET            else '❌ MISSING — embed login will fail'}")
print(f"[auth] FRONTEND_URL            : {FRONTEND_URL}")
print(f"[auth] MICROSOFT_REDIRECT_URI  : {MICROSOFT_REDIRECT_URI}")
print(f"[auth] FIRESTORE               : {'✅ connected' if _FIRESTORE_OK else '❌ in-memory fallback'}")
print(f"[auth] CLOUD_RUN_INSTANCE      : {os.getenv('K_REVISION', 'local/unknown')}")
print("=" * 60)

# =============================================================================
#  ROLE → TRADE MAP  — only thing you ever edit
# =============================================================================
ROLE_TRADE_MAP: Dict[str, Optional[List[str]]] = {

    # ── Admin ─────────────────────────────────────────────────────────────────
    "app.admin": None,
    "Admin":     None,
    "admin":     None,

    # ── TGMs ──────────────────────────────────────────────────────────────────
    "tgm.hvac_gas_elec":       ["HVAC", "Gas", "Electrical N", "Electrical S"],
    "tgm.hvac_gas":            ["HVAC", "Gas"],
    "tgm.building_fabric_env": [
        "Roofing", "Multi", "Decoration", "Building Fabric",
        "Building Fabric N", "Building Fabric S",
        "Carpentry", "General Builders", "Environmental Services",
        "Pest Control", "Sanitisation", "Waste Clearance",
    ],
    "tgm.leak_damp_restore": [
        "Leak Detection", "Leak Detection NW", "Leak Detection SW",
        "Leak Detection E", "Leak Detection N",
        "Damp", "Mould", "Damp and Mould", "Drying", "Restoration",
    ],
    "tgm.drainage_plumbing": [
        "Drainage", "Plumbing",
        "Drainage E",  "Plumbing E",
        "Drainage SW", "Plumbing SW",
        "Drainage NW", "Plumbing NW",
    ],
    "tgm.fire_safety": ["Fire Safety"],

    # ── TMs ───────────────────────────────────────────────────────────────────
    "tm.drainage_e":         ["Drainage E",        "Plumbing E"],
    "tm.drainage_sw":        ["Drainage SW",       "Plumbing SW"],
    "tm.drainage_nw":        ["Drainage NW",       "Plumbing NW"],
    "tm.leak_detection":     ["Leak Detection NW", "Leak Detection SW", "Leak Detection E"],
    "tm.leak_detection_sw":  ["Leak Detection SW"],
    "tm.leak_detection_n":   ["Leak Detection N"],
    "tm.roofing_multi":      ["Roofing", "Multi", "Decoration"],
    "tm.roofing_multi_ext":  ["Roofing", "Multi", "Decoration", "Carpentry", "General Builders", "Building Fabric"],
    "tm.building_fabric_n":  ["Building Fabric N"],
    "tm.building_fabric_s":  ["Building Fabric S"],
    "tm.electrical_n":       ["Electrical N"],
    "tm.electrical_s":       ["Electrical S"],
    "tm.gas_hvac":           ["Gas", "HVAC"],
}

EMBED_TOKEN_TTL_SECONDS = 120


# =============================================================================
#  SESSION STORE  (Firestore first, in-memory fallback)
# =============================================================================

def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_session(user_data: Dict[str, Any]) -> str:
    session_id = secrets.token_urlsafe(32)
    expires_at = _now() + timedelta(hours=24)

    if _FIRESTORE_OK:
        try:
            _db.collection("aspect_sessions").document(session_id).set({
                "user":       user_data,
                "created_at": _now(),
                "expires_at": expires_at,
                "instance":   os.getenv("K_REVISION", "local"),
            })
            print(f"✅ [SESSION] Created in Firestore for '{user_data.get('name')}' | id={session_id[:12]}...")
        except Exception as e:
            print(f"❌ [SESSION] Firestore write FAILED: {e} — using in-memory fallback")
            _sessions[session_id] = {"user": user_data, "expires_at": expires_at}
    else:
        _sessions[session_id] = {"user": user_data, "expires_at": expires_at}
        print(f"✅ [SESSION] Created in-memory for '{user_data.get('name')}' | id={session_id[:12]}...")
        print(f"⚠️  [SESSION] In-memory count={len(_sessions)} — lost on instance restart!")

    return session_id


def get_session_user(session_id: str) -> Optional[Dict[str, Any]]:
    print(f"🔍 [SESSION] Looking up id={session_id[:12]}...")

    if _FIRESTORE_OK:
        try:
            doc = _db.collection("aspect_sessions").document(session_id).get()
            if not doc.exists:
                print(f"❌ [SESSION] Not found in Firestore | id={session_id[:12]}...")
                return None
            data       = doc.to_dict()
            expires_at = data.get("expires_at")
            if expires_at and _now() > expires_at:
                print(f"⏰ [SESSION] Expired — deleting | id={session_id[:12]}...")
                _db.collection("aspect_sessions").document(session_id).delete()
                return None
            user = data.get("user")
            print(f"✅ [SESSION] Found: '{user.get('name')}' | trade={user.get('trade')}")
            return user
        except Exception as e:
            print(f"❌ [SESSION] Firestore read error: {e}")
            return None
    else:
        session = _sessions.get(session_id)
        if not session:
            print(f"❌ [SESSION] Not found in-memory | id={session_id[:12]}...")
            print(f"⚠️  [SESSION] Total in-memory sessions on THIS instance: {len(_sessions)}")
            print(f"⚠️  [SESSION] If this number is 0 right after login, you have a multi-instance problem!")
            print(f"⚠️  [SESSION] FIX: Enable Firestore — see auth.py setup instructions")
            return None
        if _now() > session["expires_at"]:
            print(f"⏰ [SESSION] Expired in-memory | id={session_id[:12]}...")
            del _sessions[session_id]
            return None
        user = session["user"]
        print(f"✅ [SESSION] Found in-memory: '{user.get('name')}' | trade={user.get('trade')}")
        return user


def clear_session(session_id: str) -> bool:
    if _FIRESTORE_OK:
        try:
            _db.collection("aspect_sessions").document(session_id).delete()
            print(f"✅ [SESSION] Deleted from Firestore | id={session_id[:12]}...")
            return True
        except Exception as e:
            print(f"❌ [SESSION] Firestore delete error: {e}")
            return False
    elif session_id in _sessions:
        del _sessions[session_id]
        print(f"✅ [SESSION] Deleted from in-memory | id={session_id[:12]}...")
        return True
    return False


# =============================================================================
#  HELPERS
# =============================================================================

def normalise_trade(trade: Union[None, str, list]) -> str:
    if trade is None:   return "ALL"
    if isinstance(trade, list): return ",".join(trade)
    return trade


def get_trade_from_role_claim(role_value: str) -> Any:
    role = (role_value or "").strip()
    if not role:
        print(f"⚠️  [ROLE] Empty role claim")
        return "UNAUTHORIZED"
    for candidate in (role, role.lower()):
        if candidate in ROLE_TRADE_MAP:
            result = ROLE_TRADE_MAP[candidate]
            print(f"✅ [ROLE] '{role}' → trade={normalise_trade(result)}")
            return result
    print(f"❌ [ROLE] '{role}' not in ROLE_TRADE_MAP")
    print(f"   Known roles: {list(ROLE_TRADE_MAP.keys())}")
    return "UNAUTHORIZED"


def resolve_trade_from_roles(roles: List[str]) -> Any:
    print(f"🔍 [ROLE] Resolving from roles: {roles}")
    if not roles:
        print(f"❌ [ROLE] Empty roles list — UNAUTHORIZED")
        return "UNAUTHORIZED"
    all_trades: List[str] = []
    has_known_role        = False
    for role in roles:
        if role not in ROLE_TRADE_MAP:
            print(f"⚠️  [ROLE] Unknown role: '{role}' — skipping")
            continue
        has_known_role = True
        trade = ROLE_TRADE_MAP[role]
        if trade is None:
            print(f"✅ [ROLE] Admin role '{role}' — full access")
            return None
        print(f"✅ [ROLE] '{role}' → {trade}")
        all_trades.extend(trade)
    if not has_known_role:
        print(f"❌ [ROLE] No known roles in {roles} — UNAUTHORIZED")
        return "UNAUTHORIZED"
    seen: set = set()
    deduped = [t for t in all_trades if not (t in seen or seen.add(t))]
    print(f"✅ [ROLE] Final trades: {deduped}")
    return deduped


def decode_id_token_roles(id_token: str) -> List[str]:
    print(f"🔍 [TOKEN] Decoding id_token roles...")
    try:
        payload = pyjwt.decode(id_token, options={"verify_signature": False})
        roles   = payload.get("roles", [])
        print(f"✅ [TOKEN] Roles in id_token: {roles}")
        if not roles:
            print(f"⚠️  [TOKEN] No 'roles' claim found! Check Azure: App Registration → App roles → assign to user")
        return roles
    except Exception as e:
        print(f"❌ [TOKEN] Failed to decode id_token: {e}")
        return []


def _get_app_only_token() -> str:
    print(f"🔍 [GRAPH] Getting app-only token...")
    try:
        resp  = requests.post(
            f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/oauth2/v2.0/token",
            data={
                "grant_type":    "client_credentials",
                "client_id":     MICROSOFT_CLIENT_ID,
                "client_secret": MICROSOFT_CLIENT_SECRET,
                "scope":         "https://graph.microsoft.com/.default",
            },
            timeout=10,
        )
        token = resp.json().get("access_token", "")
        if token:
            print(f"✅ [GRAPH] App-only token obtained")
        else:
            print(f"❌ [GRAPH] App-only token FAILED: {resp.json()}")
        return token
    except Exception as e:
        print(f"❌ [GRAPH] App-only token exception: {e}")
        return ""


def _get_user_roles_from_graph(email: str) -> List[str]:
    print(f"🔍 [GRAPH] Looking up roles for {email}...")
    app_token = _get_app_only_token()
    if not app_token:
        print(f"❌ [GRAPH] No app token — cannot look up roles")
        return []
    try:
        user_resp = requests.get(
            f"https://graph.microsoft.com/v1.0/users"
            f"?$filter=mail eq '{email}' or userPrincipalName eq '{email}'&$select=id",
            headers={"Authorization": f"Bearer {app_token}"},
            timeout=10,
        )
        users = user_resp.json().get("value", [])
        if not users:
            print(f"❌ [GRAPH] No Azure AD user found for: {email}")
            return []
        user_id = users[0]["id"]
        print(f"✅ [GRAPH] Azure user found: {user_id}")

        assignments = requests.get(
            f"https://graph.microsoft.com/v1.0/users/{user_id}/appRoleAssignments",
            headers={"Authorization": f"Bearer {app_token}"},
            timeout=10,
        ).json().get("value", [])
        print(f"🔍 [GRAPH] Role assignments found: {len(assignments)}")

        sp_data = requests.get(
            f"https://graph.microsoft.com/v1.0/servicePrincipals"
            f"?$filter=appId eq '{MICROSOFT_CLIENT_ID}'&$select=appRoles",
            headers={"Authorization": f"Bearer {app_token}"},
            timeout=10,
        ).json().get("value", [])

        role_id_to_value: Dict[str, str] = {}
        if sp_data:
            for app_role in sp_data[0].get("appRoles", []):
                role_id_to_value[app_role["id"]] = app_role["value"]
        print(f"🔍 [GRAPH] App roles on service principal: {list(role_id_to_value.values())}")

        resolved = [
            role_id_to_value[a["appRoleId"]]
            for a in assignments
            if a["appRoleId"] in role_id_to_value
        ]
        print(f"✅ [GRAPH] Resolved roles for {email}: {resolved}")
        return resolved
    except Exception as e:
        print(f"❌ [GRAPH] Role lookup exception: {e}")
        return []


def _verify_embed_token(token: str, email: str) -> bool:
    print(f"🔍 [EMBED] Verifying HMAC token for {email}...")
    if not EMBED_SECRET:
        print(f"❌ [EMBED] EMBED_JWT_SECRET not set!")
        raise HTTPException(status_code=500, detail="EMBED_JWT_SECRET not configured.")
    try:
        encoded_payload, sig = token.rsplit(".", 1)
        payload              = base64.b64decode(encoded_payload).decode()
        token_email, ts_str  = payload.split("|", 1)
        if token_email.lower() != email.lower():
            print(f"❌ [EMBED] Email mismatch: token={token_email} vs request={email}")
            return False
        token_age = int(time.time()) - int(ts_str)
        if token_age > EMBED_TOKEN_TTL_SECONDS or token_age < -10:
            print(f"❌ [EMBED] Token age={token_age}s outside window (0–{EMBED_TOKEN_TTL_SECONDS}s)")
            return False
        expected_sig = hmac.new(EMBED_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
        valid = hmac.compare_digest(expected_sig, sig)
        print(f"{'✅' if valid else '❌'} [EMBED] HMAC {'valid' if valid else 'INVALID'}")
        return valid
    except Exception as e:
        print(f"❌ [EMBED] Verify exception: {e}")
        return False


# =============================================================================
#  ROUTES
# =============================================================================

@router.get("/microsoft")
async def microsoft_signin():
    print(f"🔐 [OAUTH] Starting Microsoft sign-in | redirect_uri={MICROSOFT_REDIRECT_URI}")
    if not MICROSOFT_CLIENT_ID or not MICROSOFT_CLIENT_SECRET:
        print(f"❌ [OAUTH] Missing credentials — cannot start OAuth")
        raise HTTPException(status_code=500, detail="Microsoft OAuth not configured.")
    params = {
        "client_id":     MICROSOFT_CLIENT_ID,
        "response_type": "code",
        "redirect_uri":  MICROSOFT_REDIRECT_URI,
        "response_mode": "query",
        "scope":         "openid profile email User.Read",
        "prompt":        "select_account",
    }
    return RedirectResponse(
        url=f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?{urlencode(params)}"
    )


@router.get("/callback/microsoft")
async def microsoft_callback(
    code:              str = Query(None),
    error:             str = Query(None),
    error_description: str = Query(None),
):
    print("\n" + "=" * 60)
    print("[OAUTH] Callback received")
    print("=" * 60)

    if error:
        print(f"❌ [OAUTH] Error from Microsoft: {error} — {error_description}")
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=oauth_error&message={error}")
    if not code:
        print(f"❌ [OAUTH] No code in callback params")
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=no_code")

    print(f"✅ [OAUTH] Auth code received — exchanging for tokens...")
    try:
        token_resp = requests.post(
            f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/oauth2/v2.0/token",
            data={
                "client_id":     MICROSOFT_CLIENT_ID,
                "client_secret": MICROSOFT_CLIENT_SECRET,
                "code":          code,
                "redirect_uri":  MICROSOFT_REDIRECT_URI,
                "grant_type":    "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
        )
        token_data = token_resp.json()

        if "error" in token_data:
            print(f"❌ [OAUTH] Token exchange failed: {token_data.get('error')} — {token_data.get('error_description')}")
            return RedirectResponse(url=f"{FRONTEND_URL}/?error=token_exchange_failed")

        access_token = token_data.get("access_token")
        id_token     = token_data.get("id_token", "")
        print(f"✅ [OAUTH] Tokens received | access={'✅' if access_token else '❌'} id={'✅' if id_token else '❌ MISSING'}")

        if not access_token:
            return RedirectResponse(url=f"{FRONTEND_URL}/?error=no_token")

        graph = requests.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        if graph.status_code != 200:
            print(f"❌ [OAUTH] Graph /me failed: status={graph.status_code}")
            return RedirectResponse(url=f"{FRONTEND_URL}/?error=user_info_failed")

        graph_data = graph.json()
        user_email = graph_data.get("mail") or graph_data.get("userPrincipalName", "")
        user_id    = graph_data.get("id", "")
        user_name  = graph_data.get("displayName", user_email)
        print(f"✅ [OAUTH] User: {user_name} | {user_email}")

        roles     = decode_id_token_roles(id_token)
        trade_raw = resolve_trade_from_roles(roles)

        if trade_raw == "UNAUTHORIZED":
            print(f"❌ [OAUTH] DENIED: {user_email} — roles={roles}")
            return RedirectResponse(url=f"{FRONTEND_URL}/?error=unauthorized_user")

        user_trade = normalise_trade(trade_raw)
        print(f"✅ [OAUTH] GRANTED: {user_name} | trade={user_trade}")

        session_id = create_session({"name": user_name, "email": user_email, "id": user_id, "trade": user_trade})

        print("=" * 60 + "\n")
        return RedirectResponse(
            url=f"{FRONTEND_URL}/?{urlencode({'user': user_name, 'email': user_email, 'session': session_id, 'trade': user_trade})}"
        )

    except requests.exceptions.Timeout:
        print(f"❌ [OAUTH] Timeout calling Microsoft/Graph")
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=network_error")
    except requests.exceptions.RequestException as e:
        print(f"❌ [OAUTH] Network error: {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=network_error")
    except Exception as e:
        print(f"❌ [OAUTH] Unexpected error: {e}")
        import traceback; traceback.print_exc()
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=server_error")


# ── Embed login ───────────────────────────────────────────────────────────────

class EmbedLoginRequest(BaseModel):
    embed_token: str
    email: str
    name: str


@router.post("/embed-login")
async def embed_login(body: EmbedLoginRequest) -> Dict[str, Any]:
    print(f"\n{'='*60}")
    print(f"[EMBED-LOGIN] {body.email}")
    print(f"{'='*60}")

    trade_raw = "UNAUTHORIZED"

    if EMBED_SECRET:
        try:
            payload   = pyjwt.decode(body.embed_token, EMBED_SECRET, algorithms=["HS256"])
            jwt_role  = payload.get("role", "")
            print(f"✅ [EMBED-LOGIN] JWT decoded | role='{jwt_role}'")
            trade_raw = get_trade_from_role_claim(jwt_role)
        except pyjwt.ExpiredSignatureError:
            print(f"❌ [EMBED-LOGIN] JWT expired")
            raise HTTPException(status_code=401, detail="Embed token has expired.")
        except pyjwt.InvalidTokenError as e:
            print(f"⚠️  [EMBED-LOGIN] JWT failed ({e}) — trying HMAC...")

    if trade_raw == "UNAUTHORIZED":
        if not _verify_embed_token(body.embed_token, body.email):
            raise HTTPException(status_code=401, detail="Invalid or expired embed token.")
        roles     = _get_user_roles_from_graph(body.email)
        trade_raw = resolve_trade_from_roles(roles)

    if trade_raw == "UNAUTHORIZED":
        print(f"❌ [EMBED-LOGIN] DENIED: {body.email}")
        raise HTTPException(status_code=403, detail="User not authorised.")

    user_trade = normalise_trade(trade_raw)
    session_id = create_session({"name": body.name, "email": body.email, "id": "", "trade": user_trade})
    print(f"✅ [EMBED-LOGIN] GRANTED: {body.name} | trade={user_trade}")
    return {
        "session_id":    session_id,
        "user":          body.name,
        "email":         body.email,
        "trade":         user_trade,
        "iframe_params": urlencode({"user": body.name, "email": body.email, "session": session_id, "trade": user_trade}),
    }


@router.get("/exchange-embed-token")
async def exchange_embed_token(token: str = Query(...)) -> Dict[str, Any]:
    print(f"\n{'='*60}")
    print(f"[EXCHANGE-EMBED] Token exchange request")
    print(f"{'='*60}")

    if not EMBED_SECRET:
        print(f"❌ [EXCHANGE-EMBED] EMBED_JWT_SECRET not configured!")
        raise HTTPException(status_code=500, detail="EMBED_JWT_SECRET not configured.")

    try:
        payload = pyjwt.decode(token, EMBED_SECRET, algorithms=["HS256"])
        print(f"✅ [EXCHANGE-EMBED] JWT decoded OK")
    except pyjwt.ExpiredSignatureError:
        print(f"❌ [EXCHANGE-EMBED] Token expired")
        raise HTTPException(status_code=401, detail="Embed token has expired.")
    except pyjwt.InvalidTokenError as e:
        print(f"❌ [EXCHANGE-EMBED] Invalid token: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid embed token: {e}")

    email    = payload.get("email", "").lower()
    name     = payload.get("name", "")
    jwt_role = payload.get("role", "")
    print(f"🔍 [EXCHANGE-EMBED] email={email} name={name} role='{jwt_role}'")

    if not email:
        print(f"❌ [EXCHANGE-EMBED] No email in token!")
        raise HTTPException(status_code=400, detail="Token missing email claim.")

    trade_raw = get_trade_from_role_claim(jwt_role)

    if trade_raw == "UNAUTHORIZED":
        print(f"⚠️  [EXCHANGE-EMBED] JWT role not mapped — falling back to Graph")
        roles     = _get_user_roles_from_graph(email)
        trade_raw = resolve_trade_from_roles(roles)

    if trade_raw == "UNAUTHORIZED":
        print(f"❌ [EXCHANGE-EMBED] DENIED: {email}")
        raise HTTPException(status_code=403, detail="User not authorised.")

    user_trade = normalise_trade(trade_raw)
    session_id = create_session({"name": name, "email": email, "id": "", "trade": user_trade})
    print(f"✅ [EXCHANGE-EMBED] GRANTED: {name} | trade={user_trade}")
    return {
        "session_id":    session_id,
        "user":          name,
        "email":         email,
        "trade":         user_trade,
        "iframe_params": urlencode({"user": name, "email": email, "session": session_id, "trade": user_trade}),
    }


@router.get("/session/{session_id}")
async def get_session_endpoint(session_id: str) -> Dict[str, Any]:
    print(f"🔍 [SESSION-API] GET /session/{session_id[:12]}...")
    user = get_session_user(session_id)
    if not user:
        print(f"❌ [SESSION-API] Not found — 401")
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    print(f"✅ [SESSION-API] Valid for '{user.get('name')}'")
    return {"user": user, "session": "active"}


@router.post("/logout/{session_id}")
async def logout(session_id: str) -> Dict[str, bool]:
    print(f"🔓 [LOGOUT] {session_id[:12]}...")
    return {"success": clear_session(session_id)}


@router.get("/verify/{session_id}")
async def verify_session(session_id: str) -> Dict[str, Any]:
    print(f"🔍 [VERIFY] {session_id[:12]}...")
    user = get_session_user(session_id)
    if not user:
        print(f"❌ [VERIFY] Invalid — 401")
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    print(f"✅ [VERIFY] Valid for '{user.get('name')}'")
    return {"valid": True, "user": user}


@router.get("/health")
async def health_check():
    return {
        "status":                     "ok",
        "firestore":                  "✅ connected" if _FIRESTORE_OK else "❌ in-memory fallback — sessions will break on multi-instance",
        "cloud_run_instance":         os.getenv("K_REVISION", "local"),
        "microsoft_oauth_configured": bool(MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET),
        "embed_login_configured":     bool(EMBED_SECRET),
        "tenant_id":                  MICROSOFT_TENANT_ID,
        "known_roles":                list(ROLE_TRADE_MAP.keys()),
        "active_sessions":            len(_sessions) if not _FIRESTORE_OK else "stored in firestore",
    }
