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
from pydantic import BaseModel
from typing import Optional


class UpdateAssetRequest(BaseModel):
    hostname: Optional[str] = None
    department: Optional[str] = None
    owner: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    os_type: Optional[str] = None


class UpdateAssetResponse(BaseModel):
    ip: str
    hostname: str | None = None
    department: str | None = None
    owner: str | None = None
    phone: str | None = None
    mobile: str | None = None
    os_type: str | None = None
    status: str


router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.put("/{ip}", response_model=UpdateAssetResponse)
def update_asset(
    ip: str,
    payload: UpdateAssetRequest,
    session: Session = Depends(get_session),
) -> UpdateAssetResponse:
    """更新指定主机的基本信息"""
    service = VMAssetService(session)
    return service.update_asset(ip, payload)


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


@router.delete("/{ip}")
def delete_asset(ip: str, session: Session = Depends(get_session)):
    """软删除指定主机（标记 deleted=1，Zabbix 同步不再加回）"""
    from app.models.vm_asset import VMAsset
    asset = session.query(VMAsset).filter(VMAsset.ip == ip).first()
    if not asset:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Host {ip} not found")
    asset.deleted = True
    session.commit()
    return {"deleted": ip}


@router.get("/perf", response_model=VMAssetPerfListResponse)
def list_assets_with_perf(
    session: Session = Depends(get_session),
) -> VMAssetPerfListResponse:
    """返回带闲置天数和性能评估的资产列表"""
    service = VMAssetService(session)
    return service.list_assets_with_perf()
