from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import sys
import os
import asyncio
 
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    print("[WARNING] Groq library not installed. Install with: pip install groq")
 
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
 
from routes.dashboard import router as dashboard_router
from routes.assetdashboad import router as asset_dashboard_router
from routes.Asset_allocation import router as allocation_router
from routes.Asset_cost import router as asset_cost_router
from routes.Assetpercost import router as asset_per_cost_router
from routes.webfleet import router as webfleet_router, load_engineers_with_scores, start_scheduler
from routes.vehicles import router as vehicles_router
from routes.assets import router as assets_router
from routes.ai import router as ai_router
from routes.chat import router as chat_router
from routes.auth import router as auth_router
from routes.uploadvehicle import router as upload_router
from routes.cost import router as cost_router
from routes.vehicle_condition import router as vehicle_condition_router
from routes.register_asset import router as register_asset_router  # ← NEW
 
GLOBAL_DRIVER_CACHE = []
 
app = FastAPI(
    title="Fleet Health Monitor API",
    description="Backend API for fleet management dashboard",
    version="1.0.0"
)
 
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
app.include_router(register_asset_router)  # ← NEW
 
 
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
            import traceback
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
 
 
# ─── SERVE FRONTEND ───────────────────────────────────────
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
    file_path = os.path.join(static_dir, full_path)
    if full_path and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(f"{static_dir}/index.html")
 
 
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    print(f"[LAUNCH] Starting server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)