import csv
from io import StringIO

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.idle_vm_snapshot import IdleVMSnapshot


class IdleExportService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def export_csv(self) -> str:
        rows = self.session.scalars(
            select(IdleVMSnapshot).order_by(IdleVMSnapshot.snapshot_date, IdleVMSnapshot.ip)
        ).all()

        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["ip", "owner", "idle_days", "recycle_level"])

        for row in rows:
            writer.writerow(
                [
                    row.ip,
                    row.owner or "",
                    row.idle_days,
                    row.recycle_level,
                ]
            )

        return buffer.getvalue()
