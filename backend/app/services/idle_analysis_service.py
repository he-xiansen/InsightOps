from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.idle_vm_snapshot import IdleVMSnapshot
from app.models.sync_job import SyncJob
from app.models.vm_asset import VMAsset
from app.repositories.idle_vm_snapshot_repository import IdleVMSnapshotRepository
from app.schemas.vm_asset import IdleVMListItem, IdleVMListResponse


IDLE_ANALYSIS_JOB_NAME = "idle_analysis"
DEFAULT_IDLE_DAYS = 30


@dataclass(frozen=True)
class IdleLevel:
    idle_days: int
    recycle_level: str


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def classify_idle_days(last_login_at: datetime, now: datetime) -> IdleLevel:
    idle_days = max((ensure_utc(now) - ensure_utc(last_login_at)).days, 0)

    if idle_days >= 90:
        recycle_level = "high"
    elif idle_days >= 60:
        recycle_level = "medium"
    else:
        recycle_level = "low"

    return IdleLevel(idle_days=idle_days, recycle_level=recycle_level)


class IdleAnalysisService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = IdleVMSnapshotRepository(session)

    def analyze_idle_assets(self, *, as_of: datetime, idle_days_threshold: int) -> int:
        started_at = datetime.now(UTC)
        snapshot_rows: list[dict[str, object]] = []
        assets = self.session.scalars(select(VMAsset).order_by(VMAsset.ip)).all()
        previous_snapshots = self.repository.get_latest_before_date_by_ips(
            ips=[asset.ip for asset in assets],
            snapshot_date=as_of.date(),
        )

        for asset in assets:
            snapshot_payload = self._build_snapshot_payload(
                asset=asset,
                as_of=as_of,
                idle_days_threshold=idle_days_threshold,
                previous_snapshot=previous_snapshots.get(asset.ip),
            )
            if snapshot_payload is None:
                continue

            snapshot_rows.append(
                snapshot_payload
            )

        processed_count = self.repository.replace_for_snapshot_date(as_of.date(), snapshot_rows)
        self.session.add(
            SyncJob(
                job_type=IDLE_ANALYSIS_JOB_NAME,
                started_at=started_at,
                finished_at=datetime.now(UTC),
                status="success",
                processed_count=processed_count,
            )
        )
        self.session.commit()
        return processed_count

    def list_idle_assets(self, *, idle_days_threshold: int = DEFAULT_IDLE_DAYS) -> IdleVMListResponse:
        snapshots = self.repository.list_latest(idle_days_threshold=idle_days_threshold)
        return IdleVMListResponse(
            items=[
                IdleVMListItem(
                    snapshot_date=snapshot.snapshot_date,
                    ip=snapshot.ip,
                    idle_days=snapshot.idle_days,
                    owner=snapshot.owner,
                    department=snapshot.department,
                    lab=snapshot.lab,
                    recycle_level=snapshot.recycle_level,
                    reason=snapshot.reason,
                    last_rdp_login_at=snapshot.last_rdp_login_at,
                )
                for snapshot in snapshots
            ]
        )

    def _build_snapshot_payload(
        self,
        *,
        asset: VMAsset,
        as_of: datetime,
        idle_days_threshold: int,
        previous_snapshot: IdleVMSnapshot | None,
    ) -> dict[str, object] | None:
        if asset.last_rdp_login_at is not None:
            idle_level = classify_idle_days(asset.last_rdp_login_at, as_of)
            if idle_level.idle_days < idle_days_threshold:
                return None

            return {
                "snapshot_date": as_of.date(),
                "ip": asset.ip,
                "idle_days": idle_level.idle_days,
                "owner": asset.owner,
                "department": asset.department,
                "lab": asset.lab,
                "recycle_level": idle_level.recycle_level,
                "reason": f"连续 {idle_level.idle_days} 天未发生 RDP 登录",
                "last_rdp_login_at": asset.last_rdp_login_at,
            }

        if asset.last_seen_at is None and previous_snapshot is None:
            return None

        idle_days = idle_days_threshold
        if previous_snapshot is not None:
            days_since_last_snapshot = max((as_of.date() - previous_snapshot.snapshot_date).days, 0)
            idle_days = max(previous_snapshot.idle_days + days_since_last_snapshot, idle_days_threshold)

        idle_level = classify_idle_days(as_of - timedelta(days=idle_days), as_of)
        return {
            "snapshot_date": as_of.date(),
            "ip": asset.ip,
            "idle_days": idle_level.idle_days,
            "owner": asset.owner,
            "department": asset.department,
            "lab": asset.lab,
            "recycle_level": idle_level.recycle_level,
            "reason": "自纳管以来未登录",
            "last_rdp_login_at": None,
        }
