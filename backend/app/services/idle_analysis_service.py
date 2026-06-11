from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.sync_job import SyncJob
from app.models.vm_asset import VMAsset
from app.repositories.idle_vm_snapshot_repository import IdleVMSnapshotRepository


IDLE_ANALYSIS_JOB_NAME = "idle_analysis"


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

        for asset in assets:
            reference_time = asset.last_rdp_login_at or asset.last_seen_at
            if reference_time is None:
                continue

            idle_level = classify_idle_days(reference_time, as_of)
            if idle_level.idle_days < idle_days_threshold:
                continue

            reason = (
                f"连续 {idle_level.idle_days} 天未发生 RDP 登录"
                if asset.last_rdp_login_at is not None
                else "自纳管以来未登录"
            )
            snapshot_rows.append(
                {
                    "snapshot_date": as_of.date(),
                    "ip": asset.ip,
                    "idle_days": idle_level.idle_days,
                    "owner": asset.owner,
                    "department": asset.department,
                    "lab": asset.lab,
                    "recycle_level": idle_level.recycle_level,
                    "reason": reason,
                    "last_rdp_login_at": asset.last_rdp_login_at,
                }
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
