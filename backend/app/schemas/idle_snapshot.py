from datetime import date, datetime

from pydantic import BaseModel


class IdleSnapshotExportRow(BaseModel):
    snapshot_date: date
    ip: str
    owner: str | None = None
    department: str | None = None
    lab: str | None = None
    idle_days: int
    recycle_level: str
    reason: str | None = None
    last_rdp_login_at: datetime | None = None
