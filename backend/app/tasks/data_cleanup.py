"""数据清理任务：定期清理过期数据"""
from app.core.settings import CN_TZ
from datetime import datetime, timedelta

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.perf_metric import PerfMetric
from app.models.sync_job import SyncJob
from app.models.vm_rdp_login import VMRdpLogin


DEFAULT_PERF_RETENTION_DAYS = 30
DEFAULT_RDP_RETENTION_DAYS = 90
DEFAULT_SYNC_JOB_RETENTION_DAYS = 7


def run_data_cleanup(
    session: Session,
    perf_days: int = DEFAULT_PERF_RETENTION_DAYS,
    rdp_days: int = DEFAULT_RDP_RETENTION_DAYS,
    sync_job_days: int = DEFAULT_SYNC_JOB_RETENTION_DAYS,
) -> dict[str, int]:
    """清理过期数据，返回各表删除条数"""
    now = datetime.now(CN_TZ)
    results = {}

    # 清理 perf_metrics
    if perf_days > 0:
        cutoff = now - timedelta(days=perf_days)
        deleted = session.query(PerfMetric).filter(
            PerfMetric.collected_at < cutoff
        ).delete()
        results["perf_metrics"] = deleted

    # 清理 vm_rdp_logins
    if rdp_days > 0:
        cutoff = now - timedelta(days=rdp_days)
        deleted = session.query(VMRdpLogin).filter(
            VMRdpLogin.login_at < cutoff
        ).delete()
        results["vm_rdp_logins"] = deleted

    # 清理 sync_jobs
    if sync_job_days > 0:
        cutoff = now - timedelta(days=sync_job_days)
        deleted = session.query(SyncJob).filter(
            SyncJob.started_at < cutoff
        ).delete()
        results["sync_jobs"] = deleted

    session.commit()
    return results

