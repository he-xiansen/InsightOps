from fastapi import FastAPI

from app.api.routes.assets import router as asset_router
from app.api.routes.idle import router as idle_router
from app.api.routes.rdp import router as rdp_router
from app.api.routes.sync import router as sync_router


app = FastAPI(title="InsightOps API", version="0.1.0")
app.include_router(asset_router)
app.include_router(idle_router)
app.include_router(rdp_router)
app.include_router(sync_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
