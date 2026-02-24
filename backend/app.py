# -*- coding: utf-8 -*-

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import sys
import os

# Try to import Groq for AI features (optional)
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    print("[WARNING] Groq library not installed. Install with: pip install groq")

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from routes.dashboard import router as dashboard_router      # handles /api/dashboard/*
from routes.assetdashboad import router as asset_dashboard_router  # handles /api/dashboard/* (asset-specific routes)
from routes.Asset_allocation import router as allocation_router    # handles /api/allocation/*
from routes.Asset_cost import router as asset_cost_router          # handles /api/cost/* (asset costs)
from routes.Assetpercost import router as asset_per_cost_router    # handles /api/asset-cost/* (per-asset costs)
from routes.webfleet import router as webfleet_router, load_engineers_with_scores, start_scheduler
from routes.vehicles import router as vehicles_router
from routes.assets import router as assets_router
from routes.ai import router as ai_router
from routes.chat import router as chat_router
from routes.auth import router as auth_router
from routes.uploadvehicle import router as upload_router
from routes.cost import router as cost_router
from routes.vehicle_condition import router as vehicle_condition_router

# ─────────────────────────────────────────────────────────
# GLOBAL DRIVER CACHE
# ─────────────────────────────────────────────────────────
GLOBAL_DRIVER_CACHE = []

# Initialize FastAPI app
app = FastAPI(
    title="Fleet Health Monitor API",
    description="Backend API for fleet management dashboard",
    version="1.0.0"
)

# Add CORS middleware
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

# ─────────────────────────────────────────────────────────
# ROUTERS
# ─────────────────────────────────────────────────────────
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

# ─────────────────────────────────────────────────────────
# STARTUP EVENT
# ─────────────────────────────────────────────────────────
@app.on_event("startup")
async def load_driver_cache():
    """Preload all engineers with Webfleet scores at startup."""
    global GLOBAL_DRIVER_CACHE
    try:
        print("\n" + "="*80)
        print("[STARTUP] Initializing driver cache...")
        print("="*80)

        start_scheduler()
        result = load_engineers_with_scores()

        if result and result.get("engineers"):
            GLOBAL_DRIVER_CACHE = result["engineers"]
            total       = len(GLOBAL_DRIVER_CACHE)
            with_scores = result.get("with_scores", 0)
            print(f"[OK] Cache loaded: {total} engineers ({with_scores} with scores)\n")

            from routes.chat import initialize_groq_service
            initialize_groq_service(driver_cache=GLOBAL_DRIVER_CACHE)
        else:
            print("[WARNING] Cache load returned no data\n")
            GLOBAL_DRIVER_CACHE = []
    except Exception as e:
        print(f"[WARNING] Failed to preload driver cache: {e}\n")
        import traceback
        traceback.print_exc()
        GLOBAL_DRIVER_CACHE = []


# ─────────────────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "healthy"}


# ─────────────────────────────────────────────────────────
# SERVE FRONTEND STATIC FILES
# ─────────────────────────────────────────────────────────
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=f"{static_dir}/assets"), name="assets")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    return FileResponse(f"{static_dir}/index.html")


if __name__ == "__main__":
    import uvicorn
    port = 8080
    print(f"[LAUNCH] Starting server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
