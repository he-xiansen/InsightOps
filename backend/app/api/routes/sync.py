from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.core.security import require_api_key
from app.schemas.vm_asset import AssetSyncResponse, BulkUpsertVMAssetsRequest
from app.services.vm_asset_service import VMAssetService


router = APIRouter(prefix="/api/v1/sync", tags=["sync"])

class SearchHostsRequest(BaseModel):
    ips: list[str]

class SearchHostsResponse(BaseModel):
    hosts: list[dict]

@router.post("/search-zabbix-hosts", response_model=SearchHostsResponse)
def search_zabbix_hosts(payload: SearchHostsRequest, session: Session = Depends(get_session)):
    """从 Zabbix 查询匹配 IP/IP段的主机并返回，不写入平台数据库"""
    from app.collector.zabbix_reader import fetch_hosts_by_ips
    from app.core.database import build_zabbix_engine, get_zabbix_settings
    try:
        zs = get_zabbix_settings()
        if not zs.zabbix_database_url:
            return {"hosts": []}
        engine = build_zabbix_engine(zs)
        rows = fetch_hosts_by_ips(engine, payload.ips)
        engine.dispose()
        hosts = [{"ip": r["ip"], "hostname": r["host"], "hostid": r["hostid"], "available": r.get("available", 0)} for r in rows]
        return {"hosts": hosts}
    except Exception as e:
        return {"hosts": [], "error": str(e)}

@router.post("/add-zabbix-hosts")
def add_zabbix_hosts(payload: SearchHostsRequest, session: Session = Depends(get_session)):
    """从 Zabbix 查询匹配 IP 的主机并同步到平台（二次筛选后写入）"""
    from app.collector.zabbix_reader import fetch_hosts_by_ips, normalize_host_row
    from app.core.database import build_zabbix_engine, get_zabbix_settings
    from app.repositories.vm_asset_repository import VMAssetRepository
    
    try:
        zs = get_zabbix_settings()
        if not zs.zabbix_database_url:
            return {"hosts": [], "added": 0, "message": "Zabbix 数据库未配置"}
        engine = build_zabbix_engine(zs)
        rows = fetch_hosts_by_ips(engine, payload.ips)
        engine.dispose()
        
        if not rows:
            return {"hosts": [], "added": 0, "message": "未匹配到主机"}
        
        repo = VMAssetRepository(session)
        normalized = [normalize_host_row(r) for r in rows]
        # 手动添加不跳过已删除的
        count = repo.upsert_many([{"ip": n["ip"], "hostname": n["host_name"], "status": "active" if n["available"] else "inactive"} for n in normalized])
        session.commit()
        
        hosts = [{"ip": r["ip"], "hostname": r["host"]} for r in rows]
        return {"hosts": hosts, "added": count, "message": f"成功添加 {count} 台主机"}
    except Exception as e:
        return {"hosts": [], "added": 0, "message": f"错误: {str(e)}"}



@router.post("/vm-assets", response_model=AssetSyncResponse)
def sync_assets(
    payload: BulkUpsertVMAssetsRequest,
    session: Session = Depends(get_session),
    _=Depends(require_api_key),
) -> AssetSyncResponse:
    service = VMAssetService(session)
    return service.sync_assets(payload)
