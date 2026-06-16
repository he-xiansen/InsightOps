from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.core.security import require_api_key
from app.schemas.vm_asset import (
    BulkUpsertVMAssetsRequest,
    BulkUpsertVMAssetsResponse,
    VMAssetListResponse,
    VMAssetPerfListResponse,
)
from app.services.vm_asset_service import VMAssetService


router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("", response_model=VMAssetListResponse)
def list_assets(session: Session = Depends(get_session)) -> VMAssetListResponse:
    service = VMAssetService(session)
    return service.list_assets()


@router.post("/bulk-upsert", response_model=BulkUpsertVMAssetsResponse)
def bulk_upsert_assets(
    payload: BulkUpsertVMAssetsRequest,
    session: Session = Depends(get_session),
    _=Depends(require_api_key),
) -> BulkUpsertVMAssetsResponse:
    service = VMAssetService(session)
    return service.bulk_upsert(payload)


@router.get("/perf", response_model=VMAssetPerfListResponse)
def list_assets_with_perf(
    session: Session = Depends(get_session),
) -> VMAssetPerfListResponse:
    """返回带闲置天数和性能评估的资产列表"""
    service = VMAssetService(session)
    return service.list_assets_with_perf()
