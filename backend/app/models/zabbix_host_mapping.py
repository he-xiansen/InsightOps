from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ZabbixHostMapping(Base):
    __tablename__ = "zabbix_host_mapping"

    ip: Mapped[str] = mapped_column(String(64), primary_key=True)
    zabbix_hostid: Mapped[int] = mapped_column(Integer, index=True)
    host_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    available: Mapped[bool] = mapped_column(Boolean, default=False)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
