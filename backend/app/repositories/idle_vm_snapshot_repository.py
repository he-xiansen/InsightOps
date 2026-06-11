from datetime import date

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.idle_vm_snapshot import IdleVMSnapshot


class IdleVMSnapshotRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_latest_before_date_by_ips(
        self,
        *,
        ips: list[str],
        snapshot_date: date,
    ) -> dict[str, IdleVMSnapshot]:
        if not ips:
            return {}

        snapshots = self.session.scalars(
            select(IdleVMSnapshot)
            .where(
                IdleVMSnapshot.ip.in_(ips),
                IdleVMSnapshot.snapshot_date < snapshot_date,
            )
            .order_by(IdleVMSnapshot.ip, IdleVMSnapshot.snapshot_date.desc())
        ).all()

        latest_snapshots: dict[str, IdleVMSnapshot] = {}
        for snapshot in snapshots:
            latest_snapshots.setdefault(snapshot.ip, snapshot)

        return latest_snapshots

    def replace_for_snapshot_date(self, snapshot_date: date, payloads: list[dict[str, object]]) -> int:
        self.session.execute(
            delete(IdleVMSnapshot).where(IdleVMSnapshot.snapshot_date == snapshot_date)
        )

        for payload in payloads:
            self.session.add(IdleVMSnapshot(**payload))

        self.session.flush()
        return len(payloads)
