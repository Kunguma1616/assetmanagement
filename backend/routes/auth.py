from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
from datetime import datetime, timedelta
import secrets
import requests
import base64
import json
from dotenv import load_dotenv
from urllib.parse import urlencode

load_dotenv()

router = APIRouter(prefix="/api/auth", tags=["authentication"])

sessions: Dict[str, Dict[str, Any]] = {}

MICROSOFT_CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID", "")
MICROSOFT_CLIENT_SECRET = os.getenv("MICROSOFT_CLIENT_SECRET", "")
MICROSOFT_TENANT_ID = os.getenv("MICROSOFT_TENANT_ID", "common")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")
ALLOWED_EMAIL_DOMAIN = os.getenv("ALLOWED_EMAIL_DOMAIN", "")

# ✅ All 24 allowed users with name + trade restriction
# trade = None means they see ALL trades (no restriction)
ALLOWED_USERS = {
    "4bd0b467-ff3d-4c1b-a071-0d432ff4491a": {"name": "Alex Bacon",            "trade": None},
    "02dec93c-b6ea-4313-b221-3ad8399e15d9": {"name": "Aman Bisht",             "trade": None},
    "3ff75853-a734-4fb6-a042-ce2bf7b04bd7": {"name": "Amandeep Singh",         "trade": None},
    "03504aac-0843-4bdc-9370-27a41140ca0b": {"name": "Artsiom Dzemiadziuk",    "trade": None},
    "d4b49bbd-eb4d-4cd6-b852-e753342437d7": {"name": "Ben Daldry",             "trade": None},
    "0b996f8b-95d1-4120-a0e9-f58728e2a543": {"name": "Daniyal Junjua",         "trade": None},
    "7e057fc2-f33a-459b-b9a1-5d1e08a295a1": {"name": "Hemanth Methukumalli",   "trade": None},
    "104efaf0-777a-499c-9180-0eb1c131bb66": {"name": "James Parkinson",         "trade": "Gas, HVAC & Electrical"},
    "c8ed9225-5ef3-4b33-9963-156bd42630be": {"name": "Jebarsan Mangalarajah",  "trade": None},
    "5d1cb14a-9e88-489f-8c97-bdeb85d8f87e": {"name": "Kabilraj Baskaran",      "trade": None},
    "1f7e5c0e-77a3-46f4-8650-8e8537248e19": {"name": "Kunguma Balaji",          "trade": None},
    "e4577b87-8ead-4992-8c48-d658fc006f5f": {"name": "Lee Merryweather",        "trade": "Building Fabric"},
    "2a41287a-2343-4c0c-b65d-28f932de6e37": {"name": "Mariia Pyvovarchuk",     "trade": None},
    "a8e114bc-03a7-4104-a89a-83ddec10df90": {"name": "Marjan Kola",            "trade": "LDR"},
    "444c382f-c4ae-43b2-b7fe-9863f10fae8b": {"name": "Martin Mackie",          "trade": "Drainage & Plumbing"},
    "a8ebfd7e-70a0-4b29-8cce-94f767bbe9df": {"name": "Michael Truelove",       "trade": None},
    "40972b54-91e6-4503-8f35-36ccc55ef187": {"name": "Nick Bizley",            "trade": None},
    "ebd1d58b-428d-4105-8429-3f2f06dbff22": {"name": "Paul McGee",             "trade": "Fire Safety"},
    "1a38b7d5-4e5b-48d7-bc48-d71ac15455af": {"name": "Pavlo Manko",            "trade": None},
    "a494cee2-da8d-412b-acb3-718c9dcd20d4": {"name": "Pavlo Manko Admin",      "trade": None},
    "48e4b779-7878-4d05-a8b1-126397391de4": {"name": "Peter Raynsford",        "trade": "Drainage & Plumbing"},
    "d3f76307-d826-4697-817e-51aea95bcb17": {"name": "Scott Johnstone",        "trade": None},
    "215c5295-61fd-428d-bddd-a3c2574ac73f": {"name": "Tuan Sihan",             "trade": None},
    "1aa6f209-8841-4526-9f90-4e695b6d8673": {"name": "Yarema Pyvovarchuk",     "trade": None},
}


class AuthSession(BaseModel):
    user: Dict[str, str]
    session: str


def create_session(user_data: Dict[str, Any]) -> str:
    session_id = secrets.token_urlsafe(32)
    sessions[session_id] = {
        "user": user_data,
        "created_at": datetime.now(),
        "expires_at": datetime.now() + timedelta(hours=24)
    }
    print(f"✅ Session created: {session_id}")
    return session_id


def get_session_user(session_id: str) -> Optional[Dict[str, Any]]:
    session = sessions.get(session_id)
    if session:
        if datetime.now() < session["expires_at"]:
            return session["user"]
        else:
            del sessions[session_id]
    return None


def clear_session(session_id: str) -> bool:
    if session_id in sessions:
        del sessions[session_id]
        print(f"✅ Session cleared: {session_id}")
        return True
    return False


@router.get("/microsoft")
async def microsoft_signin():
    if not MICROSOFT_CLIENT_ID or not MICROSOFT_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Microsoft OAuth not configured.")

    redirect_uri = f"{BACKEND_URL}/api/auth/callback/microsoft"

    params = {
        "client_id": MICROSOFT_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "response_mode": "query",
        "scope": "openid profile email User.Read",
        "prompt": "select_account",
    }

    microsoft_auth_url = f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?{urlencode(params)}"
    print(f"🔐 Redirecting to Microsoft OAuth (prompt=select_account)")
    return RedirectResponse(url=microsoft_auth_url)


@router.get("/callback/microsoft")
async def microsoft_callback(code: str = Query(None), error: str = Query(None), error_description: str = Query(None)):
    print("\n" + "="*60)
    print("Microsoft OAuth Callback")
    print("="*60)

    if error:
        print(f"❌ OAuth Error: {error}")
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=oauth_error&message={error}")

    if not code:
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=no_code")

    try:
        token_url = f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/oauth2/v2.0/token"
        redirect_uri = f"{BACKEND_URL}/api/auth/callback/microsoft"

        token_response = requests.post(
            token_url,
            data={
                'client_id': MICROSOFT_CLIENT_ID,
                'client_secret': MICROSOFT_CLIENT_SECRET,
                'code': code,
                'redirect_uri': redirect_uri,
                'grant_type': 'authorization_code',
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )

        token_data = token_response.json()

        if 'error' in token_data:
            print(f"❌ Token exchange error: {token_data.get('error')}")
            return RedirectResponse(
                url=f"{FRONTEND_URL}/?error=token_exchange_failed&message={token_data.get('error_description', 'Unknown error')}"
            )

        access_token = token_data.get('access_token')
        if not access_token:
            return RedirectResponse(url=f"{FRONTEND_URL}/?error=no_token")

        user_response = requests.get(
            'https://graph.microsoft.com/v1.0/me',
            headers={'Authorization': f'Bearer {access_token}'}
        )

        if user_response.status_code != 200:
            return RedirectResponse(url=f"{FRONTEND_URL}/?error=user_info_failed")

        user_data = user_response.json()
        user_email = user_data.get('mail') or user_data.get('userPrincipalName')
        user_id = user_data.get('id', '')

        # ✅ Whitelist check
        user_record = ALLOWED_USERS.get(user_id)
        if not user_record:
            print(f"❌ REJECTED: {user_id}")
            return RedirectResponse(url=f"{FRONTEND_URL}/?error=unauthorized_user")

        user_name = user_record["name"]
        user_trade = user_record["trade"]  # None = all trades, string = restricted to that trade

        print(f"✅ Access granted: {user_name} | Trade: {user_trade or 'ALL'}")

        # ✅ Build session with trade info
        user_info = {
            "name": user_name,
            "email": user_email,
            "id": user_id,
            "trade": user_trade or "ALL",  # "ALL" means no restriction
        }
        session_id = create_session(user_info)

        # ✅ Pass trade in redirect so frontend knows immediately
        redirect_params = {
            "user": user_name,
            "email": user_email,
            "session": session_id,
            "trade": user_trade or "ALL",
        }
        redirect_url = f"{FRONTEND_URL}/?{urlencode(redirect_params)}"

        print(f"✅ Auth successful! {user_name} | Trade filter: {user_trade or 'ALL'}")
        print("="*60 + "\n")

        return RedirectResponse(url=redirect_url)

    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {str(e)}")
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=network_error")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=server_error")


@router.get("/session/{session_id}")
async def get_session_endpoint(session_id: str) -> Dict[str, Any]:
    user = get_session_user(session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return {"user": user, "session": "active"}


@router.post("/logout/{session_id}")
async def logout(session_id: str) -> Dict[str, bool]:
    success = clear_session(session_id)
    return {"success": success}


@router.get("/verify/{session_id}")
async def verify_session(session_id: str) -> Dict[str, Any]:
    user = get_session_user(session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    session = sessions.get(session_id)
    expires_at = session.get("expires_at") if session else None
    return {
        "valid": True,
        "user": user,
        "expires_at": expires_at.isoformat() if expires_at else None
    }


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "microsoft_oauth_configured": bool(MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET),
        "tenant_id": MICROSOFT_TENANT_ID,
        "allowed_users_count": len(ALLOWED_USERS),
        "active_sessions": len(sessions)
    }
