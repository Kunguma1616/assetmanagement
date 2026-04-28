from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware   # ✅ NEW: for iframe headers
import jwt                                                  # ✅ NEW: for embed token
import datetime                                             # ✅ NEW: for token expiry
import sys
import os
import asyncio
import traceback

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    print("[WARNING] Groq library not installed. Install with: pip install groq")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ─── SAFE IMPORT HELPER ───────────────────────────────────────────────────────
def safe_import(import_fn, name):
    try:
        result = import_fn()
        print(f"[OK] Imported: {name}")
        return result
    except Exception as e:
        print(f"[FATAL] Failed to import {name}: {e}", file=sys.stderr)
        traceback.print_exc()
        raise RuntimeError(f"Critical import failed: {name} — {e}") from e

# ─── IMPORTS ──────────────────────────────────────────────────────────────────
def _import_dashboard():
    from routes.dashboard import router as r
    return r
def _import_assetdashboard():
    from routes.assetdashboad import router as r
    return r
def _import_allocation():
    from routes.Asset_allocation import router as r
    return r
def _import_asset_cost():
    from routes.Asset_cost import router as r
    return r
def _import_assetpercost():
    from routes.Assetpercost import router as r
    return r
def _import_webfleet():
    from routes.webfleet import router as r, load_engineers_with_scores as lews, start_scheduler as ss
    return r, lews, ss
def _import_vehicles():
    from routes.vehicles import router as r
    return r
def _import_assets():
    from routes.assets import router as r
    return r
def _import_ai():
    from routes.ai import router as r
    return r
def _import_chat():
    from routes.chat import router as r
    return r
def _import_auth():
    from routes.auth import router as r
    return r
def _import_upload():
    from routes.uploadvehicle import router as r
    return r
def _import_cost():
    from routes.cost import router as r, leases_router as lr
    return r, lr
def _import_vehicle_condition():
    from routes.vehicle_condition import router as r
    return r
def _import_register_asset():
    from routes.register_asset import router as r
    return r
def _import_approvals():
    from routes.approvals import router as r
    return r

dashboard_router         = safe_import(_import_dashboard,         "routes.dashboard")
asset_dashboard_router   = safe_import(_import_assetdashboard,    "routes.assetdashboad")
allocation_router        = safe_import(_import_allocation,         "routes.Asset_allocation")
asset_cost_router        = safe_import(_import_asset_cost,         "routes.Asset_cost")
asset_per_cost_router    = safe_import(_import_assetpercost,       "routes.Assetpercost")
webfleet_tuple           = safe_import(_import_webfleet,           "routes.webfleet")
webfleet_router, load_engineers_with_scores, start_scheduler = webfleet_tuple
vehicles_router          = safe_import(_import_vehicles,           "routes.vehicles")
assets_router            = safe_import(_import_assets,             "routes.assets")
ai_router                = safe_import(_import_ai,                 "routes.ai")
chat_router              = safe_import(_import_chat,               "routes.chat")
auth_router              = safe_import(_import_auth,               "routes.auth")
upload_router            = safe_import(_import_upload,             "routes.uploadvehicle")
cost_tuple               = safe_import(_import_cost,               "routes.cost")
cost_router, leases_router = cost_tuple
vehicle_condition_router = safe_import(_import_vehicle_condition,  "routes.vehicle_condition")
register_asset_router    = safe_import(_import_register_asset,     "routes.register_asset")
approvals_router         = safe_import(_import_approvals,          "routes.approvals")

print("[OK] All imports successful — starting FastAPI app")

# ─── APP ──────────────────────────────────────────────────────────────────────
GLOBAL_DRIVER_CACHE = []

app = FastAPI(
    title="Fleet Health Monitor API",
    description="Backend API for fleet management dashboard",
    version="1.0.0"
)

# ✅ NEW: Iframe / embed headers middleware (allows app to be embedded in iframes)
class FrameHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "ALLOWALL"
        response.headers["Content-Security-Policy"] = "frame-ancestors *"
        return response

app.add_middleware(FrameHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://192.168.54.48:5174",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(asset_dashboard_router)
app.include_router(dashboard_router)
app.include_router(allocation_router)
app.include_router(asset_cost_router)
app.include_router(asset_per_cost_router)
app.include_router(webfleet_router)
app.include_router(vehicles_router)
app.include_router(assets_router)
app.include_router(ai_router)
app.include_router(chat_router)
app.include_router(upload_router)
app.include_router(auth_router)
app.include_router(vehicle_condition_router)
app.include_router(cost_router)
app.include_router(leases_router)
app.include_router(register_asset_router)
app.include_router(approvals_router)


# ─── BACKGROUND CACHE ─────────────────────────────────────────────────────────
async def _background_cache_load():
    global GLOBAL_DRIVER_CACHE
    loop = asyncio.get_event_loop()

    def _load():
        try:
            print("\n" + "="*80)
            print("[STARTUP] Initializing driver cache...")
            print("="*80)
            start_scheduler()
            return load_engineers_with_scores()
        except Exception as e:
            print(f"[WARNING] Cache load failed: {e}")
            traceback.print_exc()
            return None

    try:
        result = await asyncio.wait_for(
            loop.run_in_executor(None, _load),
            timeout=60
        )

        if result and result.get("engineers"):
            GLOBAL_DRIVER_CACHE = result["engineers"]
            total = len(GLOBAL_DRIVER_CACHE)
            with_scores = result.get("with_scores", 0)
            print(f"[OK] Cache loaded: {total} engineers ({with_scores} with scores)\n")

            try:
                from routes.chat import initialize_groq_service
                initialize_groq_service(driver_cache=GLOBAL_DRIVER_CACHE)
            except Exception as e:
                print(f"[WARNING] Groq service init failed: {e}")
        else:
            print("[WARNING] Cache load returned no data\n")
            GLOBAL_DRIVER_CACHE = []

    except asyncio.TimeoutError:
        print("[WARNING] Cache load timed out after 60s — app running without cache\n")
        GLOBAL_DRIVER_CACHE = []
    except Exception as e:
        print(f"[WARNING] Unexpected error during cache load: {e}\n")
        GLOBAL_DRIVER_CACHE = []


@app.on_event("startup")
async def startup_event():
    print("[STARTUP] App is up. Scheduling background cache load...")
    asyncio.create_task(_background_cache_load())


@app.get("/health")
async def health():
    return {"status": "healthy"}


# ✅ NEW: Embed token endpoint — visit this URL once to get your 1-year token
EMBED_SECRET_KEY = os.environ.get("EMBED_SECRET_KEY", "aspect-asset-embed-secret-2024")

@app.get("/api/generate-embed-token")
async def generate_embed_token():
    expiry = datetime.datetime.utcnow() + datetime.timedelta(days=365)
    payload = {
        "app": "aspect-asset-management",
        "access": "embed",
        "exp": expiry
    }
    token = jwt.encode(payload, EMBED_SECRET_KEY, algorithm="HS256")
    base_url = "https://aspect-asset-850122601904.europe-west1.run.app"
    return {
        "token": token,
        "expires": expiry.strftime("%Y-%m-%d"),
        "embed_url": f"{base_url}?token={token}",
        "iframe_code": f'<iframe src="{base_url}?token={token}" width="100%" height="100%" frameborder="0"></iframe>'
    }


# ─── SERVE FRONTEND ───────────────────────────────────────────────────────────
static_dir = "/app/static"

assets_path = f"{static_dir}/assets"
if os.path.isdir(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
else:
    print(f"[WARNING] Assets directory not found: {assets_path}")


@app.get("/")
async def serve_root():
    return FileResponse(f"{static_dir}/index.html")


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail=f"API route not found: /{full_path}")
    file_path = os.path.join(static_dir, full_path)
    if full_path and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(f"{static_dir}/index.html")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    print(f"[LAUNCH] Starting server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
