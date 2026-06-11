from datetime import date

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models.idle_vm_snapshot import IdleVMSnapshot


class IdleVMSnapshotRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def replace_for_snapshot_date(self, snapshot_date: date, payloads: list[dict[str, object]]) -> int:
        self.session.execute(
            delete(IdleVMSnapshot).where(IdleVMSnapshot.snapshot_date == snapshot_date)
        )

        for payload in payloads:
            self.session.add(IdleVMSnapshot(**payload))

        self.session.flush()
        return len(payloads)
