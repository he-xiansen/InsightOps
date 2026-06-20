from app.core.settings import CN_TZ
from datetime import datetime

from sqlalchemy.orm import Session

from app.collector.rdp_ingest import is_rdp_logon_event, normalize_rdp_event
from app.models.sync_job import SyncJob
from app.models.vm_asset import VMAsset
from app.repositories.vm_rdp_login_repository import VMRdpLoginRepository


RDP_INGEST_JOB_NAME = "rdp_ingest"


class RDPIngestService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = VMRdpLoginRepository(session)

    def ingest_events(self, events: list[dict[str, object]], source_ip: str | None = None) -> dict[str, int]:
        started_at = datetime.now(CN_TZ)
        accepted_count = 0
        inserted_count = 0
        existing_count = 0
        now = datetime.now(CN_TZ)

        # 客户端有心跳即更新 last_seen_at（标记在线）
        if source_ip:
            self._update_asset_last_seen(ip=source_ip, seen_at=now)

        for event in events:
            ip = str(event.get("ip", "")).strip()
            if not ip:
                continue

            if not is_rdp_logon_event(event):
                continue

            accepted_count += 1
            normalized_event = normalize_rdp_event(event)

            added, _login = self.repository.add_if_absent(normalized_event)
            if not added:
                existing_count += 1
                continue

            inserted_count += 1
            self._update_asset_last_login(
                ip=str(normalized_event["ip"]),
                login_at=normalized_event["login_at"],
            )

        self.session.add(
            SyncJob(
                job_type=RDP_INGEST_JOB_NAME,
                started_at=started_at,
                finished_at=datetime.now(CN_TZ),
                status="success",
                processed_count=inserted_count,
            )
        )
        self.session.commit()
        return {
            "received_count": len(events),
            "accepted_count": accepted_count,
            "inserted_count": inserted_count,
            "existing_count": existing_count,
        }

    def _update_asset_last_seen(self, *, ip: str, seen_at: datetime) -> None:
        """客户端有任何请求即更新最后在线时间"""
        asset = self.session.get(VMAsset, ip)
        if asset is None:
            return
        if asset.last_seen_at is not None and asset.last_seen_at.tzinfo is None:
            asset.last_seen_at = asset.last_seen_at.replace(tzinfo=CN_TZ)
        if seen_at.tzinfo is None:
            seen_at = seen_at.replace(tzinfo=CN_TZ)
        if asset.last_seen_at is None or asset.last_seen_at < seen_at:
            asset.last_seen_at = seen_at

    def _update_asset_last_login(self, *, ip: str, login_at: datetime) -> None:
        asset = self.session.get(VMAsset, ip)
        if asset is None:
            return

        if asset.last_rdp_login_at is not None and asset.last_rdp_login_at.tzinfo is None:
            asset.last_rdp_login_at = asset.last_rdp_login_at.replace(tzinfo=CN_TZ)

        if asset.last_rdp_login_at is None or asset.last_rdp_login_at < login_at:
            asset.last_rdp_login_at = login_at
