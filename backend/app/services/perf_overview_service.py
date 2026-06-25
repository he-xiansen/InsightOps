from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.perf_metric import PerfMetric


class PerfOverviewService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_overview(self) -> dict:
        """从本地 perf_metrics 表获取每台主机最新的性能数据"""
        from sqlalchemy import desc

        # 子查询：每台主机最新的 collected_at
        subq = (
            self.session.query(
                PerfMetric.ip,
                func.max(PerfMetric.collected_at).label("max_time")
            )
            .group_by(PerfMetric.ip)
            .subquery()
        )

        records = (
            self.session.query(PerfMetric)
            .join(subq, (PerfMetric.ip == subq.c.ip) & (PerfMetric.collected_at == subq.c.max_time))
            .all()
        )

        hosts = [
            {"ip": r.ip, "cpu": r.cpu_avg, "mem": r.mem_avg}
            for r in records
        ]

        return {"hosts": hosts}

    def get_latest_for_ip(self, ip: str) -> dict | None:
        """获取指定 IP 的最新数据"""
        record = self.session.query(PerfMetric).filter(
            PerfMetric.ip == ip
        ).order_by(PerfMetric.collected_at.desc()).first()

        if record is None:
            return None
        return {
            "ip": record.ip,
            "cpu": record.cpu_avg,
            "mem": record.mem_avg,
            "collected_at": record.collected_at.isoformat(),
        }
