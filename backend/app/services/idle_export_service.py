import csv
from datetime import UTC, datetime
from io import StringIO

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.idle_vm_snapshot import IdleVMSnapshot
from app.schemas.idle_snapshot import IdleSnapshotExportRow


def serialize_datetime(value: datetime | None) -> str:
    if value is None:
        return ""
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    else:
        value = value.astimezone(UTC)
    return value.isoformat()


class IdleExportService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def export_csv(self) -> str:
        rows = self.session.scalars(
            select(IdleVMSnapshot).order_by(IdleVMSnapshot.snapshot_date, IdleVMSnapshot.ip)
        ).all()

        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow(
            [
                "snapshot_date",
                "ip",
                "owner",
                "department",
                "lab",
                "idle_days",
                "recycle_level",
                "reason",
                "last_rdp_login_at",
            ]
        )

        for row in rows:
            export_row = IdleSnapshotExportRow.model_validate(row, from_attributes=True)
            writer.writerow(
                [
                    export_row.snapshot_date.isoformat(),
                    export_row.ip,
                    export_row.owner or "",
                    export_row.department or "",
                    export_row.lab or "",
                    export_row.idle_days,
                    export_row.recycle_level,
                    export_row.reason or "",
                    serialize_datetime(export_row.last_rdp_login_at),
                ]
            )

        return buffer.getvalue()
