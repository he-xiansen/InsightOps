from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.collector.zabbix_reader import fetch_host_rows, fetch_os_info, normalize_os_type
from app.services.zabbix_sync_service import ZabbixSyncService
from app.repositories.vm_asset_repository import VMAssetRepository


def build_host_sync_job_name() -> str:
    return "zabbix_host_sync"


def run_zabbix_host_sync(session: Session, zabbix_engine: Engine) -> int:
    rows = fetch_host_rows(zabbix_engine)

    # 同步主机映射
    service = ZabbixSyncService(session)
    count = service.sync_host_rows(rows)

    # 同步 OS 信息到 vm_assets
    _sync_os_info(session, zabbix_engine, rows)

    return count


def _sync_os_info(session: Session, zabbix_engine: Engine, rows: list[dict]) -> None:
    """从 Zabbix 读取每台主机的 OS 信息，写入 vm_assets.os_type"""
    asset_repo = VMAssetRepository(session)
    existing = asset_repo.get_by_ips([str(r["ip"]) for r in rows if r.get("ip")])

    updates = []
    for row in rows:
        ip = str(row.get("ip", ""))
        if not ip:
            continue
        hostid = int(row.get("hostid", 0))
        if not hostid:
            continue

        # 读取 OS 信息
        raw_os = fetch_os_info(zabbix_engine, hostid)
        os_type = normalize_os_type(raw_os)
        if not os_type:
            continue

        # 只更新原来没有 os_type 或 os_type 变化的
        asset = existing.get(ip)
        if asset and asset.os_type != os_type:
            updates.append({"ip": ip, "os_type": os_type})

    if updates:
        asset_repo.upsert_many(updates)
        session.commit()
