from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.collector.zabbix_reader import fetch_host_rows
from app.services.zabbix_sync_service import ZabbixSyncService


def build_host_sync_job_name() -> str:
    return "zabbix_host_sync"


def run_zabbix_host_sync(session: Session, zabbix_engine: Engine) -> int:
    rows = fetch_host_rows(zabbix_engine)
    service = ZabbixSyncService(session)
    return service.sync_host_rows(rows)
