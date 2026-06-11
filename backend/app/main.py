from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.api.routes.assets import router as asset_router
from app.api.routes.idle import router as idle_router
from app.api.routes.rdp import router as rdp_router
from app.api.routes.sync import router as sync_router
from app.core.settings import MissingSettingsError


app = FastAPI(title="InsightOps API", version="0.1.0")
app.include_router(asset_router)
app.include_router(idle_router)
app.include_router(rdp_router)
app.include_router(sync_router)


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
