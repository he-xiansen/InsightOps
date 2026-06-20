import os
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
