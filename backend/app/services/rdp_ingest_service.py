from datetime import UTC, datetime

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

    def ingest_events(self, events: list[dict[str, object]]) -> dict[str, int]:
        started_at = datetime.now(UTC)
        accepted_count = 0
        inserted_count = 0

        for event in events:
            if not is_rdp_logon_event(event):
                continue

            accepted_count += 1
            normalized_event = normalize_rdp_event(event)

            if not self.repository.add_if_absent(normalized_event):
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
                finished_at=datetime.now(UTC),
                status="success",
                processed_count=inserted_count,
            )
        )
        self.session.commit()
        return {
            "received_count": len(events),
            "accepted_count": accepted_count,
            "inserted_count": inserted_count,
        }

    def _update_asset_last_login(self, *, ip: str, login_at: datetime) -> None:
        asset = self.session.get(VMAsset, ip)
        if asset is None:
            return

        if asset.last_rdp_login_at is not None and asset.last_rdp_login_at.tzinfo is None:
            asset.last_rdp_login_at = asset.last_rdp_login_at.replace(tzinfo=UTC)

        if asset.last_rdp_login_at is None or asset.last_rdp_login_at < login_at:
            asset.last_rdp_login_at = login_at
