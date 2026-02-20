from flask import Flask, request, jsonify, render_template_string, redirect, session
from flask_cors import CORS
import os
import traceback
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-change-this-in-production')
CORS(app, supports_credentials=True)

# Environment variables
BASE_URL = os.getenv('BASE_URL', 'http://localhost:5000')
MICROSOFT_CLIENT_ID = os.getenv('MICROSOFT_CLIENT_ID')
MICROSOFT_CLIENT_SECRET = os.getenv('MICROSOFT_CLIENT_SECRET')
MICROSOFT_TENANT_ID = os.getenv('MICROSOFT_TENANT_ID', 'common')

# Validate required environment variables on startup
print("\n" + "="*60)
print("🚀 ASPECT FLEET AI - PRODUCTION MODE")
print("="*60)
print("CHECKING ENVIRONMENT VARIABLES")
print("="*60)

# Microsoft Auth
if not MICROSOFT_CLIENT_ID:
    print("❌ ERROR: MICROSOFT_CLIENT_ID is not set!")
else:
    print(f"✅ MICROSOFT_CLIENT_ID: {MICROSOFT_CLIENT_ID[:10]}...")

if not MICROSOFT_CLIENT_SECRET:
    print("❌ ERROR: MICROSOFT_CLIENT_SECRET is not set!")
else:
    print(f"✅ MICROSOFT_CLIENT_SECRET: {MICROSOFT_CLIENT_SECRET[:10]}...")

if not MICROSOFT_TENANT_ID:
    print("❌ ERROR: MICROSOFT_TENANT_ID is not set!")
else:
    print(f"✅ MICROSOFT_TENANT_ID: {MICROSOFT_TENANT_ID}")

print(f"✅ BASE_URL: {BASE_URL}")

# Webfleet credentials
WEBFLEET_USERNAME = os.getenv('WEBFLEET_USERNAME')
WEBFLEET_ACCOUNT = os.getenv('WEBFLEET_ACCOUNT')
if WEBFLEET_USERNAME and WEBFLEET_ACCOUNT:
    print(f"✅ WEBFLEET_USERNAME: {WEBFLEET_USERNAME}")
    print(f"✅ WEBFLEET_ACCOUNT: {WEBFLEET_ACCOUNT}")
else:
    print("⚠️  WARNING: Webfleet credentials not found")

print("="*60 + "\n")

# Global services
sf_service = None
wf_service = None
groq_service = None
init_error = None


def initialize_services():
    """Initialize Salesforce, Webfleet, and Groq services (robust + fallback)."""
    global sf_service, wf_service, groq_service, init_error
    try:
        print("🚀 Starting Aspect Fleet AI with FULL Webfleet Integration...")
        print("=" * 60)

        # SALESFORCE (required for master data if available)
        try:
            from salesforce_service import SalesforceService
            sf_service = SalesforceService()
            print("📡 Salesforce: CONNECTED")
        except Exception as e:
            sf_service = None
            print(f"⚠️ Salesforce not available: {e}")

        # WEBFLEET - try known module names (webfleet_api.py or webfleet_service.py)
        try:
            try:
                from webfleet_api import WebfleetService
            except ImportError:
                from webfleet_service import WebfleetService  # fallback name if present

            wf_service = WebfleetService()
            print("👁️ Webfleet: CONNECTED")
        except Exception as e:
            wf_service = None
            print(f"⚠️ Webfleet not available: {e}")

        # GROQ AI - try to initialize; if missing, provide a safe local fallback
        try:
            from groq_service import GroqService
            try:
                groq_service = GroqService()
                print("🤖 Groq AI: INITIALIZED")
            except Exception as e:
                print(f"⚠️ GroqService failed to initialize: {e}")
                groq_service = None
        except ImportError:
            groq_service = None
            print("⚠️ groq_service.py not installed/available - using local fallback AI")

        # If Groq isn't available, attach a lightweight fallback that still uses SF/Webfleet
        if groq_service is None:
            class LocalFallbackAI:
                def __init__(self):
                    self.salesforce_service = None
                    self.webfleet_service = None

                def set_salesforce_service(self, sf):
                    self.salesforce_service = sf

                def set_webfleet_service(self, wf):
                    self.webfleet_service = wf

                def classify_intent_and_execute(self, user_message: str, conversation_history: list = None):
                    # Very small intent parse + direct calls when possible
                    m = user_message.lower()
                    if 'fleet' in m or 'fleet health' in m:
                        if self.webfleet_service:
                            data = self.webfleet_service.get_fleet_health_summary()
                            return {'intent': {'intent': 'get_fleet_health', 'confidence': 0.8}, 'data': data, 'source': 'webfleet', 'context': 'fleet_health', 'count': data.get('total_vehicles') if isinstance(data, dict) else 0}
                        return {'intent': {'intent': 'get_fleet_health', 'confidence': 0.6}, 'data': None, 'error': 'Webfleet not configured'}

                    if 'driving score' in m or 'driver' in m:
                        if self.webfleet_service:
                            data = self.webfleet_service.get_driving_scores(days=7)
                            return {'intent': {'intent': 'get_driving_scores', 'confidence': 0.8}, 'data': data, 'source': 'webfleet', 'context': 'driver_performance', 'count': len(data)}
                        return {'intent': {'intent': 'get_driving_scores', 'confidence': 0.6}, 'data': []}

                    # vehicle lookup like "VEH-00330"
                    import re
                    match = re.search(r'VEH-\d{2,6}', user_message.upper())
                    if match and self.salesforce_service:
                        vid = match.group(0)
                        vehicle = self.salesforce_service.get_vehicle_by_identifier(vid)
                        return {'intent': {'intent': 'get_vehicle_health', 'confidence': 0.85}, 'data': {'vehicle_info': vehicle} if vehicle else None, 'source': 'salesforce', 'context': 'vehicle_health', 'vehicle_id': vid}

                    # fallback help
                    return {'intent': {'intent': 'help'}, 'data': None, 'error': 'Try: "VEH-00330 health", "driving scores", "maintenance due", "fleet health"'}

                def generate_natural_response(self, user_message: str, intent_result: dict) -> str:
                    if intent_result.get('error'):
                        return f"ℹ️ {intent_result.get('error')}"
                    data = intent_result.get('data')
                    if intent_result.get('context') == 'fleet_health' and isinstance(data, dict):
                        return f"Fleet total vehicles: {data.get('total_vehicles', 'N/A')}, active: {data.get('active_vehicles', 'N/A')}, speeding incidents (24h): {data.get('speeding_incidents_24h', 0)}"
                    if intent_result.get('context') == 'driver_performance':
                        cnt = intent_result.get('count', 0)
                        return f"Driver scores retrieved for {cnt} drivers." if cnt else "No driver scores available."
                    if intent_result.get('context') == 'vehicle_health' and data:
                        v = data.get('vehicle_info') or {}
                        return f"Vehicle {intent_result.get('vehicle_id', '')}: {v.get('Reg_No__c', 'N/A')} - status: {v.get('Status__c', 'Unknown')}" if v else "No vehicle info found."
                    return "I can show fleet health, driver scores, or lookup vehicles. Try: 'fleet health' or 'VEH-00330 health'."

            groq_service = LocalFallbackAI()
            print("🤖 LocalFallbackAI: READY (limited intelligence, uses Salesforce/Webfleet where available)")

        # Attach platform services to AI if they exist
        try:
            if hasattr(groq_service, 'set_salesforce_service') and sf_service:
                groq_service.set_salesforce_service(sf_service)
            if hasattr(groq_service, 'set_webfleet_service') and wf_service:
                groq_service.set_webfleet_service(wf_service)
            print("🔗 Services attached to AI where available")
        except Exception as e:
            print(f"⚠️ Failed attaching services to AI: {e}")

        print("\n" + "="*60)
        print("INITIALIZATION COMPLETE (services may be partially available)")
        print("="*60 + "\n")

    except Exception as e:
        init_error = str(e)
        print(f"❌ Initialization Error: {init_error}")
        import traceback
        traceback.print_exc()


# Initialize on startup
initialize_services()

# -------------------------
# Minimal routes (chat/auth/health)
# -------------------------
@app.route('/api/auth/signin/microsoft-entra-id', methods=['GET'])
def microsoft_signin():
    redirect_uri = f"{BASE_URL}/api/auth/callback/microsoft-entra-id"
    microsoft_auth_url = (
        f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize"
        f"?client_id={MICROSOFT_CLIENT_ID}"
        f"&response_type=code"
        f"&redirect_uri={redirect_uri}"
        f"&response_mode=query"
        f"&scope=openid%20profile%20email%20User.Read"
    )
    return redirect(microsoft_auth_url)


@app.route('/api/auth/callback/microsoft-entra-id', methods=['GET'])
def microsoft_callback():
    code = request.args.get('code')
    error = request.args.get('error')
    error_description = request.args.get('error_description')
    if error:
        return redirect(f'{BASE_URL}?error={error}')
    if not code:
        return redirect(f'{BASE_URL}?error=no_code')
    try:
        token_url = f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/oauth2/v2.0/token"
        redirect_uri = f"{BASE_URL}/api/auth/callback/microsoft-entra-id"
        token_response = requests.post(
            token_url,
            data={
                'client_id': MICROSOFT_CLIENT_ID,
                'client_secret': MICROSOFT_CLIENT_SECRET,
                'code': code,
                'redirect_uri': redirect_uri,
                'grant_type': 'authorization_code',
            }
        )
        token_data = token_response.json()
        if 'error' in token_data:
            return redirect(f'{BASE_URL}?error={token_data.get("error")}')
        access_token = token_data.get('access_token')
        if not access_token:
            return redirect(f'{BASE_URL}?error=no_token')
        user_response = requests.get(
            'https://graph.microsoft.com/v1.0/me',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        user_data = user_response.json()
        user_email = user_data.get('mail') or user_data.get('userPrincipalName')
        user_name = user_data.get('displayName') or user_email
        session['user'] = {
            'name': user_name,
            'email': user_email,
            'access_token': access_token
        }
        return redirect(f'{BASE_URL}?user={user_name}&email={user_email}')
    except Exception as e:
        traceback.print_exc()
        return redirect(f'{BASE_URL}?error=exception')


@app.route('/api/auth/session', methods=['GET'])
def get_session():
    if 'user' in session:
        return jsonify({'user': {'name': session['user']['name'], 'email': session['user']['email']}, 'session': 'active'})
    return jsonify({'user': None, 'session': None})


@app.route('/api/auth/signout', methods=['POST'])
def signout():
    session.clear()
    return jsonify({'success': True, 'logout_url': f'https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/oauth2/v2.0/logout?post_logout_redirect_uri={BASE_URL}'})


@app.route('/api/chat', methods=['POST'])
def chat():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    if groq_service is None:
        # allow local fallback to respond (it will be set to LocalFallbackAI)
        pass

    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        user_message = data.get('message', '').strip()
        conversation_history = data.get('history', [])
        if not user_message:
            return jsonify({'error': 'Message required'}), 400

        intent_result = groq_service.classify_intent_and_execute(user_message, conversation_history)
        natural_response = groq_service.generate_natural_response(user_message, intent_result)

        return jsonify({'response': natural_response, 'intent': intent_result.get('intent', {}).get('intent'), 'source': intent_result.get('source', 'unknown'), 'data_count': intent_result.get('count', 0)})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e), 'response': f'❌ Error: {str(e)}'}), 500


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'auth_configured': bool(MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET), 'salesforce_connected': sf_service is not None, 'webfleet_connected': wf_service is not None, 'groq_initialized': groq_service is not None, 'production_ready': all([sf_service, wf_service, groq_service])})


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"\n🌐 Flask Aspect AI starting on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
