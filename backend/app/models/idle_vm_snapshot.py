from datetime import UTC, date, datetime

from sqlalchemy import Date, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class IdleVMSnapshot(Base):
    __tablename__ = "idle_vm_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    snapshot_date: Mapped[date] = mapped_column(Date, index=True)
    ip: Mapped[str] = mapped_column(String(64), index=True)
    idle_days: Mapped[int] = mapped_column(Integer)
    owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    lab: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recycle_level: Mapped[str] = mapped_column(String(32))
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_rdp_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
