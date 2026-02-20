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

# Store sessions in memory (in production, use Redis or database)
sessions: Dict[str, Dict[str, Any]] = {}

# Microsoft OAuth Configuration
MICROSOFT_CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID", "")
MICROSOFT_CLIENT_SECRET = os.getenv("MICROSOFT_CLIENT_SECRET", "")
MICROSOFT_TENANT_ID = os.getenv("MICROSOFT_TENANT_ID", "common")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# Optional: Set to restrict to specific domain (e.g., "@aspect.co.uk")
# Leave empty to allow any Microsoft account
ALLOWED_EMAIL_DOMAIN = os.getenv("ALLOWED_EMAIL_DOMAIN", "")


class AuthSession(BaseModel):
    user: Dict[str, str]
    session: str


def create_session(user_data: Dict[str, str]) -> str:
    """Create a new session"""
    session_id = secrets.token_urlsafe(32)
    sessions[session_id] = {
        "user": user_data,
        "created_at": datetime.now(),
        "expires_at": datetime.now() + timedelta(hours=24)
    }
    print(f"✅ Session created: {session_id}")
    return session_id


def get_session_user(session_id: str) -> Optional[Dict[str, str]]:
    """Get user from session"""
    session = sessions.get(session_id)
    if session:
        if datetime.now() < session["expires_at"]:
            return session["user"]
        else:
            del sessions[session_id]
    return None


def clear_session(session_id: str) -> bool:
    """Clear a session"""
    if session_id in sessions:
        del sessions[session_id]
        print(f"✅ Session cleared: {session_id}")
        return True
    return False


@router.get("/microsoft")
async def microsoft_signin():
    """Redirect to Microsoft OAuth"""
    if not MICROSOFT_CLIENT_ID or not MICROSOFT_CLIENT_SECRET:
        raise HTTPException(
            status_code=500, 
            detail="Microsoft OAuth not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET"
        )
    
    redirect_uri = f"{BACKEND_URL}/api/auth/callback/microsoft"
    
    # Build OAuth URL with proper scopes
    params = {
        "client_id": MICROSOFT_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "response_mode": "query",
        "scope": "openid profile email User.Read",
    }
    
    microsoft_auth_url = f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?{urlencode(params)}"
    
    print(f"🔐 Redirecting to Microsoft OAuth")
    print(f"   Redirect URI: {redirect_uri}")
    return RedirectResponse(url=microsoft_auth_url)


@router.get("/callback/microsoft")
async def microsoft_callback(code: str = Query(None), error: str = Query(None), error_description: str = Query(None)):
    """Handle Microsoft OAuth callback"""
    print("\n" + "="*60)
    print("Microsoft OAuth Callback")
    print("="*60)
    
    # Handle OAuth errors
    if error:
        print(f"❌ OAuth Error: {error}")
        if error_description:
            print(f"   Description: {error_description}")
        return RedirectResponse(
            url=f"{FRONTEND_URL}/?error=oauth_error&message={error}"
        )
    
    if not code:
        print("❌ No authorization code received")
        return RedirectResponse(
            url=f"{FRONTEND_URL}/?error=no_code"
        )
    
    print(f"✅ Authorization code received")
    
    try:
        # Exchange code for access token
        token_url = f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/oauth2/v2.0/token"
        redirect_uri = f"{BACKEND_URL}/api/auth/callback/microsoft"
        
        print(f"📝 Exchanging code for token...")
        print(f"   Token URL: {token_url}")
        print(f"   Client ID: {MICROSOFT_CLIENT_ID[:10]}...")
        
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
            print(f"   Description: {token_data.get('error_description', 'No description')}")
            return RedirectResponse(
                url=f"{FRONTEND_URL}/?error=token_exchange_failed&message={token_data.get('error_description', 'Unknown error')}"
            )
        
        access_token = token_data.get('access_token')
        if not access_token:
            print("❌ No access token received")
            return RedirectResponse(
                url=f"{FRONTEND_URL}/?error=no_token"
            )
        
        print(f"✅ Access token received")
        
        # Get user info from Microsoft Graph API
        print(f"👤 Fetching user information...")
        user_response = requests.get(
            'https://graph.microsoft.com/v1.0/me',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        
        if user_response.status_code != 200:
            print(f"❌ User info request failed: {user_response.status_code}")
            return RedirectResponse(
                url=f"{FRONTEND_URL}/?error=user_info_failed"
            )
        
        user_data = user_response.json()
        
        if 'error' in user_data:
            print(f"❌ User info error: {user_data}")
            return RedirectResponse(
                url=f"{FRONTEND_URL}/?error=user_info_failed"
            )
        
        user_email = user_data.get('mail') or user_data.get('userPrincipalName')
        user_name = user_data.get('displayName') or user_email
        
        print(f"✅ User info retrieved:")
        print(f"   Name: {user_name}")
        print(f"   Email: {user_email}")
        
        # Optional: Organization validation
        if ALLOWED_EMAIL_DOMAIN:
            if not user_email or ALLOWED_EMAIL_DOMAIN.lower() not in user_email.lower():
                print(f"❌ REJECTED: Email domain not authorized")
                print(f"   User email: {user_email}")
                print(f"   Required domain: {ALLOWED_EMAIL_DOMAIN}")
                return RedirectResponse(
                    url=f"{FRONTEND_URL}/?error=unauthorized_domain&required={ALLOWED_EMAIL_DOMAIN}"
                )
            print(f"✅ Email domain validated")
        
        # Optional: Verify tenant from ID token
        id_token = token_data.get('id_token')
        if id_token and MICROSOFT_TENANT_ID != "common":
            try:
                # Decode JWT payload (no signature verification needed for tenant check)
                parts = id_token.split('.')
                if len(parts) >= 2:
                    payload = parts[1]
                    payload += '=' * (4 - len(payload) % 4)
                    decoded = base64.urlsafe_b64decode(payload)
                    token_claims = json.loads(decoded)
                    
                    token_tenant_id = token_claims.get('tid')
                    if token_tenant_id and token_tenant_id != MICROSOFT_TENANT_ID:
                        print(f"❌ REJECTED: Wrong tenant")
                        print(f"   Token tenant: {token_tenant_id}")
                        print(f"   Expected tenant: {MICROSOFT_TENANT_ID}")
                        return RedirectResponse(
                            url=f"{FRONTEND_URL}/?error=wrong_tenant"
                        )
                    print(f"✅ Tenant verified: {token_tenant_id}")
            except Exception as e:
                print(f"⚠️  Could not verify tenant: {e}")
        
        # Create session
        user_info = {
            "name": user_name,
            "email": user_email,
            "id": user_data.get('id', '')
        }
        session_id = create_session(user_info)
        
        # Redirect to frontend with session info
        redirect_params = {
            "user": user_name,
            "email": user_email,
            "session": session_id
        }
        redirect_url = f"{FRONTEND_URL}/?{urlencode(redirect_params)}"
        
        print(f"✅ Authentication successful!")
        print(f"   Session ID: {session_id[:10]}...")
        print(f"   Redirecting to: {FRONTEND_URL}")
        print("="*60 + "\n")
        
        return RedirectResponse(url=redirect_url)
    
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {str(e)}")
        return RedirectResponse(
            url=f"{FRONTEND_URL}/?error=network_error"
        )
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return RedirectResponse(
            url=f"{FRONTEND_URL}/?error=server_error"
        )


@router.get("/session/{session_id}")
async def get_session_endpoint(session_id: str) -> AuthSession:
    """Get session info"""
    user = get_session_user(session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return AuthSession(
        user=user,
        session="active"
    )


@router.post("/logout/{session_id}")
async def logout(session_id: str) -> Dict[str, bool]:
    """Logout user"""
    success = clear_session(session_id)
    return {"success": success}


@router.get("/verify/{session_id}")
async def verify_session(session_id: str) -> Dict[str, Any]:
    """Verify if session is valid"""
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
    """Check if auth system is properly configured"""
    return {
        "status": "ok",
        "microsoft_oauth_configured": bool(MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET),
        "tenant_id": MICROSOFT_TENANT_ID,
        "domain_restriction": ALLOWED_EMAIL_DOMAIN if ALLOWED_EMAIL_DOMAIN else "none",
        "active_sessions": len(sessions)
    }