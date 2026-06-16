from datetime import datetime

from sqlalchemy import DateTime, Float, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PerfMetric(Base):
    __tablename__ = "perf_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ip: Mapped[str] = mapped_column(String(64), index=True)
    cpu_avg: Mapped[float | None] = mapped_column(Float, nullable=True)
    mem_avg: Mapped[float | None] = mapped_column(Float, nullable=True)
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.now
    )

    __table_args__ = (
        Index("idx_perf_metrics_ip_collected", "ip", "collected_at"),
        UniqueConstraint("ip", "collected_at", name="uq_perf_metrics_ip_time"),
    )
