from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Union
import os
from datetime import datetime, timedelta
import secrets, requests, hmac, hashlib, time, base64
import jwt as pyjwt
from dotenv import load_dotenv
from urllib.parse import urlencode

_ROUTES_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_ROUTES_DIR)
_ROOT_DIR = os.path.dirname(_BACKEND_DIR)

# Load backend/.env explicitly so the auth config works no matter where uvicorn
# is started from.
load_dotenv(os.path.join(_BACKEND_DIR, ".env"), override=True)
load_dotenv(os.path.join(_ROOT_DIR, ".env"), override=True)


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()

router = APIRouter(prefix="/api/auth", tags=["authentication"])
sessions: Dict[str, Dict[str, Any]] = {}

MICROSOFT_CLIENT_ID     = _env("MICROSOFT_CLIENT_ID")
MICROSOFT_CLIENT_SECRET = _env("MICROSOFT_CLIENT_SECRET")
MICROSOFT_TENANT_ID     = _env("MICROSOFT_TENANT_ID", "common")
FRONTEND_URL            = _env("FRONTEND_URL", "http://localhost:5174")
BACKEND_URL             = _env("BACKEND_URL", "http://localhost:8080")
EMBED_SECRET            = _env("EMBED_JWT_SECRET")
MICROSOFT_REDIRECT_URI  = _env("MICROSOFT_REDIRECT_URI") or f"{BACKEND_URL}/api/auth/callback/microsoft"

print(f"[auth] CLIENT_ID loaded: {'✅' if MICROSOFT_CLIENT_ID else '❌ MISSING'}")
print(f"[auth] CLIENT_SECRET loaded: {'✅' if MICROSOFT_CLIENT_SECRET else '❌ MISSING'}")

# =============================================================================
#  ROLE → TRADE MAP
#
#  ✅ This is the ONLY thing you ever edit in this file.
#  To give a new user access  → assign them a role in Azure (zero code changes)
#  To change what a role sees → edit the list below + redeploy once
#  To add a brand new role    → add it here + create the App Role in Azure
#
#  None = Admin (sees everything, no trade filter)
#  list = restricted to those trades only
#
#  NOTE: Both "app.admin" and "Admin" are listed below because Azure sends the
#  App Role *value* in the token — if the role was created with value "Admin"
#  (matching its display name) instead of "app.admin", both are covered here.
# =============================================================================

ROLE_TRADE_MAP: Dict[str, Optional[List[str]]] = {

    # ── Admin ─────────────────────────────────────────────────────────────────
    "app.admin": None,   # App Role value set to "app.admin" in Azure
    "Admin":     None,   # ✅ FIX: App Role value set to "Admin" in Azure (display name used as value)
    "admin":     None,   # Lowercase role sent by Navigator/custom JWT

    # ── TGMs ──────────────────────────────────────────────────────────────────
    "tgm.hvac_gas_elec": [
        "HVAC", "Gas", "Electrical N", "Electrical S",
    ],
    "tgm.hvac_gas": [
        "HVAC", "Gas",
    ],
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
    "tgm.fire_safety": [
        "Fire Safety",
    ],

    # ── TMs ───────────────────────────────────────────────────────────────────
    "tm.drainage_e":          ["Drainage E", "Plumbing E"],
    "tm.drainage_sw":         ["Drainage SW", "Plumbing SW"],
    "tm.drainage_nw":         ["Drainage NW", "Plumbing NW"],
    "tm.leak_detection":      ["Leak Detection NW", "Leak Detection SW", "Leak Detection E"],
    "tm.leak_detection_sw":   ["Leak Detection SW"],
    "tm.leak_detection_n":    ["Leak Detection N"],
    "tm.roofing_multi":       ["Roofing", "Multi", "Decoration"],
    "tm.roofing_multi_ext":   ["Roofing", "Multi", "Decoration", "Carpentry", "General Builders", "Building Fabric"],
    "tm.building_fabric_n":   ["Building Fabric N"],
    "tm.building_fabric_s":   ["Building Fabric S"],
    "tm.electrical_n":        ["Electrical N"],
    "tm.electrical_s":        ["Electrical S"],
    "tm.gas_hvac":            ["Gas", "HVAC"],
}

EMBED_TOKEN_TTL_SECONDS = 120


# =============================================================================
#  HELPERS
# =============================================================================

def normalise_trade(trade: Union[None, str, list]) -> str:
    """None → 'ALL',  list → comma-joined,  str → as-is."""
    if trade is None:
        return "ALL"
    if isinstance(trade, list):
        return ",".join(trade)
    return trade


def get_trade_from_role_claim(role_value: str) -> Any:
    """
    Resolve a single role claim from an embed JWT before falling back to Graph.
    Returns "UNAUTHORIZED" when the claim is empty or unknown.
    """
    role = (role_value or "").strip()
    if not role:
        return "UNAUTHORIZED"

    for candidate in (role, role.lower()):
        if candidate in ROLE_TRADE_MAP:
            return ROLE_TRADE_MAP[candidate]

    return "UNAUTHORIZED"


def resolve_trade_from_roles(roles: List[str]) -> Any:
    """
    Given roles[] from Azure token → return trade filter.
    Returns "UNAUTHORIZED" if no known role found.
    """
    if not roles:
        return "UNAUTHORIZED"

    all_trades: List[str] = []
    has_known_role = False

    for role in roles:
        if role not in ROLE_TRADE_MAP:
            continue
        has_known_role = True
        trade = ROLE_TRADE_MAP[role]
        if trade is None:
            return None      # Admin — full access, stop checking
        all_trades.extend(trade)

    if not has_known_role:
        return "UNAUTHORIZED"

    # Deduplicate while preserving order
    seen: set = set()
    return [t for t in all_trades if not (t in seen or seen.add(t))]


def decode_id_token_roles(id_token: str) -> List[str]:
    """Extract roles[] claim from the id_token Microsoft returns after login."""
    try:
        payload = pyjwt.decode(id_token, options={"verify_signature": False})
        roles = payload.get("roles", [])
        # ✅ FIX: Debug log so you can see exactly what Azure sends in the token
        print(f"🔍 Raw roles from id_token: {roles}")
        return roles
    except Exception as e:
        print(f"❌ Failed to decode id_token: {e}")
        return []


def _get_app_only_token() -> str:
    """Client-credentials token for Graph API (used in embed-login flow)."""
    resp = requests.post(
        f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/oauth2/v2.0/token",
        data={
            "grant_type":    "client_credentials",
            "client_id":     MICROSOFT_CLIENT_ID,
            "client_secret": MICROSOFT_CLIENT_SECRET,
            "scope":         "https://graph.microsoft.com/.default",
        },
    )
    return resp.json().get("access_token", "")


def _get_user_roles_from_graph(email: str) -> List[str]:
    """
    Fetch a user's app role assignments via Graph API.
    Used by embed-login / exchange-embed-token flows.
    Requires: AppRoleAssignment.Read.All application permission + admin consent.
    """
    app_token = _get_app_only_token()
    if not app_token:
        return []

    user_resp = requests.get(
        f"https://graph.microsoft.com/v1.0/users"
        f"?$filter=mail eq '{email}' or userPrincipalName eq '{email}'&$select=id",
        headers={"Authorization": f"Bearer {app_token}"},
    )
    users = user_resp.json().get("value", [])
    if not users:
        print(f"⚠️  Graph: no user found for {email}")
        return []
    user_id = users[0]["id"]

    assignments = requests.get(
        f"https://graph.microsoft.com/v1.0/users/{user_id}/appRoleAssignments",
        headers={"Authorization": f"Bearer {app_token}"},
    ).json().get("value", [])

    sp_data = requests.get(
        f"https://graph.microsoft.com/v1.0/servicePrincipals"
        f"?$filter=appId eq '{MICROSOFT_CLIENT_ID}'&$select=appRoles",
        headers={"Authorization": f"Bearer {app_token}"},
    ).json().get("value", [])

    role_id_to_value: Dict[str, str] = {}
    if sp_data:
        for app_role in sp_data[0].get("appRoles", []):
            role_id_to_value[app_role["id"]] = app_role["value"]

    return [
        role_id_to_value[a["appRoleId"]]
        for a in assignments
        if a["appRoleId"] in role_id_to_value
    ]


def _verify_embed_token(token: str, email: str) -> bool:
    """Verify the HMAC-SHA256 embed token signed by Navigator."""
    if not EMBED_SECRET:
        raise HTTPException(status_code=500, detail="EMBED_JWT_SECRET not configured.")
    try:
        encoded_payload, sig = token.rsplit(".", 1)
        payload = base64.b64decode(encoded_payload).decode()
        token_email, ts_str = payload.split("|", 1)
        if token_email.lower() != email.lower():
            return False
        token_age = int(time.time()) - int(ts_str)
        if token_age > EMBED_TOKEN_TTL_SECONDS or token_age < -10:
            return False
        expected_sig = hmac.new(
            EMBED_SECRET.encode(), payload.encode(), hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected_sig, sig)
    except Exception:
        return False


# =============================================================================
#  SESSION HELPERS
# =============================================================================

def create_session(user_data: Dict[str, Any]) -> str:
    session_id = secrets.token_urlsafe(32)
    sessions[session_id] = {
        "user":       user_data,
        "created_at": datetime.now(),
        "expires_at": datetime.now() + timedelta(hours=24),
    }
    print(f"✅ Session created for {user_data.get('name')}")
    return session_id


def get_session_user(session_id: str) -> Optional[Dict[str, Any]]:
    session = sessions.get(session_id)
    if session:
        if datetime.now() < session["expires_at"]:
            return session["user"]
        del sessions[session_id]
    return None


def clear_session(session_id: str) -> bool:
    if session_id in sessions:
        del sessions[session_id]
        print(f"✅ Session cleared: {session_id}")
        return True
    return False


# =============================================================================
#  ROUTES
# =============================================================================

@router.get("/microsoft")
async def microsoft_signin():
    if not MICROSOFT_CLIENT_ID or not MICROSOFT_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Microsoft OAuth not configured.")
    params = {
        "client_id":     MICROSOFT_CLIENT_ID,
        "response_type": "code",
        "redirect_uri":  MICROSOFT_REDIRECT_URI,
        "response_mode": "query",
        "scope":         "openid profile email User.Read",
        "prompt":        "select_account",
    }
    print("🔐 Redirecting to Microsoft OAuth")
    return RedirectResponse(
        url=f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize"
            f"?{urlencode(params)}"
    )


@router.get("/callback/microsoft")
async def microsoft_callback(
    code: str = Query(None),
    error: str = Query(None),
    error_description: str = Query(None),
):
    print("\n" + "=" * 60)
    print("Microsoft OAuth Callback")
    print("=" * 60)

    if error:
        print(f"❌ OAuth Error: {error}")
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=oauth_error&message={error}")
    if not code:
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=no_code")

    try:
        token_data = requests.post(
            f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/oauth2/v2.0/token",
            data={
                "client_id":     MICROSOFT_CLIENT_ID,
                "client_secret": MICROSOFT_CLIENT_SECRET,
                "code":          code,
                "redirect_uri":  MICROSOFT_REDIRECT_URI,
                "grant_type":    "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        ).json()

        if "error" in token_data:
            print(f"❌ Token error: {token_data.get('error')}")
            return RedirectResponse(url=f"{FRONTEND_URL}/?error=token_exchange_failed")

        access_token = token_data.get("access_token")
        id_token     = token_data.get("id_token", "")

        if not access_token:
            return RedirectResponse(url=f"{FRONTEND_URL}/?error=no_token")

        graph = requests.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if graph.status_code != 200:
            return RedirectResponse(url=f"{FRONTEND_URL}/?error=user_info_failed")

        graph_data = graph.json()
        user_email = graph_data.get("mail") or graph_data.get("userPrincipalName", "")
        user_id    = graph_data.get("id", "")
        user_name  = graph_data.get("displayName", user_email)

        # ✅ Read roles from id_token — NO hardcoded dict
        roles = decode_id_token_roles(id_token)
        print(f"🔑 Roles for {user_email}: {roles}")

        trade_raw = resolve_trade_from_roles(roles)
        if trade_raw == "UNAUTHORIZED":
            print(f"❌ REJECTED — no app role assigned: {user_email}")
            return RedirectResponse(url=f"{FRONTEND_URL}/?error=unauthorized_user")

        user_trade = normalise_trade(trade_raw)
        print(f"✅ Access granted: {user_name} | Trade: {user_trade}")

        session_id = create_session({
            "name":  user_name,
            "email": user_email,
            "id":    user_id,
            "trade": user_trade,
        })

        print("=" * 60 + "\n")
        return RedirectResponse(
            url=f"{FRONTEND_URL}/?{urlencode({'user': user_name, 'email': user_email, 'session': session_id, 'trade': user_trade})}"
        )

    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=network_error")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback; traceback.print_exc()
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=server_error")


# ── Embed login ───────────────────────────────────────────────────────────────

class EmbedLoginRequest(BaseModel):
    embed_token: str
    email: str
    name: str


@router.post("/embed-login")
async def embed_login(body: EmbedLoginRequest) -> Dict[str, Any]:
    print(f"\n🔗 Embed-login: {body.email}")
    if not _verify_embed_token(body.embed_token, body.email):
        raise HTTPException(status_code=401, detail="Invalid or expired embed token.")

    trade_raw = "UNAUTHORIZED"
    try:
        payload = pyjwt.decode(body.embed_token, EMBED_SECRET, algorithms=["HS256"])
        jwt_role = payload.get("role", "")
        print(f"🔑 Embed-login JWT role claim: '{jwt_role}' for {body.email}")
        trade_raw = get_trade_from_role_claim(jwt_role)
        if trade_raw != "UNAUTHORIZED":
            print(f"✅ Using JWT role '{jwt_role}' directly for embed-login")
    except pyjwt.InvalidTokenError:
        # This route may still receive the custom HMAC token format.
        pass

    if trade_raw == "UNAUTHORIZED":
        roles     = _get_user_roles_from_graph(body.email)
        trade_raw = resolve_trade_from_roles(roles)

    if trade_raw == "UNAUTHORIZED":
        raise HTTPException(status_code=403, detail="User not authorised.")
    user_trade = normalise_trade(trade_raw)
    session_id = create_session({"name": body.name, "email": body.email, "id": "", "trade": user_trade})
    print(f"✅ Embed-login: {body.name} | Trade: {user_trade}")
    return {
        "session_id":    session_id,
        "user":          body.name,
        "email":         body.email,
        "trade":         user_trade,
        "iframe_params": urlencode({"user": body.name, "email": body.email, "session": session_id, "trade": user_trade}),
    }


@router.get("/exchange-embed-token")
async def exchange_embed_token(token: str = Query(...)) -> Dict[str, Any]:
    if not EMBED_SECRET:
        raise HTTPException(status_code=500, detail="EMBED_JWT_SECRET not configured.")
    try:
        payload = pyjwt.decode(token, EMBED_SECRET, algorithms=["HS256"])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Embed token has expired.")
    except pyjwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid embed token: {e}")
    email = payload.get("email", "").lower()
    name  = payload.get("name", "")
    if not email:
        raise HTTPException(status_code=400, detail="Token missing email claim.")

    jwt_role = payload.get("role", "")
    print(f"🔑 exchange-embed-token JWT role claim: '{jwt_role}' for {email}")
    trade_raw = get_trade_from_role_claim(jwt_role)

    if trade_raw != "UNAUTHORIZED":
        print(f"✅ Using JWT role '{jwt_role}' directly — skipping Graph lookup")
    else:
        print(f"⚠️ JWT role '{jwt_role}' not mapped — falling back to Graph lookup")
        roles     = _get_user_roles_from_graph(email)
        trade_raw = resolve_trade_from_roles(roles)

    if trade_raw == "UNAUTHORIZED":
        raise HTTPException(status_code=403, detail="User not authorised.")
    user_trade = normalise_trade(trade_raw)
    session_id = create_session({"name": name, "email": email, "id": "", "trade": user_trade})
    print(f"✅ exchange-embed-token — session for {name} | Trade: {user_trade}")
    return {
        "session_id":    session_id,
        "user":          name,
        "email":         email,
        "trade":         user_trade,
        "iframe_params": urlencode({"user": name, "email": email, "session": session_id, "trade": user_trade}),
    }


@router.get("/session/{session_id}")
async def get_session_endpoint(session_id: str) -> Dict[str, Any]:
    user = get_session_user(session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return {"user": user, "session": "active"}


@router.post("/logout/{session_id}")
async def logout(session_id: str) -> Dict[str, bool]:
    return {"success": clear_session(session_id)}


@router.get("/verify/{session_id}")
async def verify_session(session_id: str) -> Dict[str, Any]:
    user = get_session_user(session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    session    = sessions.get(session_id)
    expires_at = session.get("expires_at") if session else None
    return {"valid": True, "user": user, "expires_at": expires_at.isoformat() if expires_at else None}


@router.get("/health")
async def health_check():
    return {
        "status":                     "ok",
        "microsoft_oauth_configured": bool(MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET),
        "embed_login_configured":     bool(EMBED_SECRET),
        "tenant_id":                  MICROSOFT_TENANT_ID,
        "known_roles":                list(ROLE_TRADE_MAP.keys()),
        "active_sessions":            len(sessions),
    }
