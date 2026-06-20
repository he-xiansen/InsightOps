from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.perf_metric import PerfMetric


class PerfOverviewService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_overview(self) -> dict:
        """从本地 perf_metrics 表获取所有主机的最新性能数据"""
        # 取最近一次采集时间
        latest_time = self.session.query(
            func.max(PerfMetric.collected_at)
        ).scalar()

        if latest_time is None:
            return {"hosts": []}

        # 查该时间点的所有主机数据
        records = self.session.query(PerfMetric).filter(
            PerfMetric.collected_at == latest_time
        ).all()

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
