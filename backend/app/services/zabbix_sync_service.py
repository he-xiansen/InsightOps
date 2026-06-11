from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.collector.zabbix_reader import normalize_host_row
from app.models.sync_job import SyncJob
from app.repositories.zabbix_host_mapping_repository import ZabbixHostMappingRepository


ZABBIX_HOST_SYNC_JOB_NAME = "zabbix_host_sync"


class ZabbixSyncService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = ZabbixHostMappingRepository(session)

    def sync_host_rows(self, rows: list[dict[str, object]]) -> int:
        started_at = datetime.now(timezone.utc)
        synced_at = datetime.now(timezone.utc)
        normalized_rows = [
            {
                **normalize_host_row(row),
                "last_sync_at": synced_at,
            }
            for row in rows
            if row.get("ip") is not None and str(row["ip"]).strip()
        ]
        processed_count = self.repository.upsert_many(normalized_rows)
        self.session.add(
            SyncJob(
                job_type=ZABBIX_HOST_SYNC_JOB_NAME,
                started_at=started_at,
                finished_at=datetime.now(timezone.utc),
                status="success",
                processed_count=processed_count,
            )
        )
        self.session.commit()
        return processed_count
