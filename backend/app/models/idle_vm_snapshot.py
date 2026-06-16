from datetime import date, datetime

from sqlalchemy import Date, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class IdleVMSnapshot(Base):
    __tablename__ = "idle_vm_snapshots"

    snapshot_date: Mapped[date] = mapped_column(Date, primary_key=True)
    ip: Mapped[str] = mapped_column(String(64), primary_key=True)
    idle_days: Mapped[int]
    owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recycle_level: Mapped[str] = mapped_column(String(32))
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_rdp_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
