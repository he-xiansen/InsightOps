from datetime import UTC, datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class VMRdpLogin(Base):
    __tablename__ = "vm_rdp_logins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ip: Mapped[str] = mapped_column(String(64), index=True)
    login_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_host: Mapped[str | None] = mapped_column(String(255), nullable=True)
    event_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    logon_type: Mapped[int | None] = mapped_column(Integer, nullable=True)
    log_source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    raw_event_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
