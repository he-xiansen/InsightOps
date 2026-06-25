import os
import threading
import time
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse

from app.api.routes.ai import router as ai_router
from app.api.routes.auth import router as auth_router
from app.api.routes.assets import router as asset_router
from app.api.routes.idle import router as idle_router
from app.api.routes.perf import router as perf_router
from app.api.routes.rdp import router as rdp_router
from app.api.routes.settings import router as settings_router
from app.api.routes.sync import router as sync_router
from app.api.routes.upload import router as upload_router
from app.core.settings import MissingSettingsError


app = FastAPI(title="InsightOps API", version="0.2.0")

# ========== Startup: DB Init ==========
def _init_database():
    print("[startup] Initializing database...", flush=True)
    retries = 10
    for i in range(retries):
        try:
            from app.core.database import build_project_session_factory, get_project_settings
            from app.models.base import Base
            import app.models  # noqa: F401
            settings = get_project_settings()
            sf = build_project_session_factory(settings)
            Base.metadata.create_all(bind=sf.kw["bind"])
            print("[startup] Database ready.", flush=True)
            return
        except Exception as e:
            print(f"[startup] DB init attempt {i+1}/{retries}: {e}", flush=True)
            if i < retries - 1:
                time.sleep(3)
    print("[startup] WARNING: DB init failed after retries, continuing anyway...", flush=True)

_init_database()

# ========== Startup: Collector Daemon ==========
_daemon_started = False
_daemon_lock = threading.Lock()

def _start_collector_daemon():
    global _daemon_started
    with _daemon_lock:
        if _daemon_started:
            return
        _daemon_started = True
    try:
        from app.collector_daemon import run_loop
        t = threading.Thread(target=run_loop, daemon=True, name="collector-daemon")
        t.start()
        print("[startup] Collector daemon started", flush=True)
    except Exception as e:
        print(f"[startup] Collector daemon failed: {e}", flush=True)

_start_collector_daemon()

# ========== API Routes ==========
os.makedirs("/app/backend/uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="/app/backend/uploads"), name="uploads")

app.include_router(auth_router)
app.include_router(ai_router)
app.include_router(asset_router)
app.include_router(idle_router)
app.include_router(perf_router)
app.include_router(rdp_router)
app.include_router(settings_router)
app.include_router(sync_router)
app.include_router(upload_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# ========== Frontend SPA (must be last) ==========
FRONTEND_DIR = "/app/frontend"
API_PREFIXES = ("/api", "/health", "/uploads", "/docs", "/openapi.json")

if os.path.isdir(FRONTEND_DIR):
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith(API_PREFIXES):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        file_path = os.path.join(FRONTEND_DIR, full_path) if full_path else ""
        if file_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
    print(f"[startup] Frontend served from {FRONTEND_DIR}", flush=True)

# ========== Error Handlers ==========
@app.exception_handler(MissingSettingsError)
def handle_missing_settings(
    _request: Request,
    exc: MissingSettingsError,
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "detail": {
                "code": "missing_configuration",
                "message": exc.message,
                "fields": exc.fields,
            }
        },
    )
