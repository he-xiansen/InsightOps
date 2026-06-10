from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.core.security import require_api_key
from app.schemas.vm_asset import AssetSyncResponse, BulkUpsertVMAssetsRequest
from app.services.vm_asset_service import VMAssetService


router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.post("/assets", response_model=AssetSyncResponse)
def sync_assets(
    payload: BulkUpsertVMAssetsRequest,
    session: Session = Depends(get_session),
    _=Depends(require_api_key),
) -> AssetSyncResponse:
    service = VMAssetService(session)
    return service.sync_assets(payload)
