"""Collector 常驻守护进程 — 按配置间隔循环执行采集任务"""
import time
from app.core.settings import CN_TZ
from datetime import datetime

from app.core.database import (
    build_project_session_factory,
    build_zabbix_engine,
    get_project_settings,
    get_zabbix_settings,
)
from app.repositories.system_settings_repository import SystemSettingsRepository
from app.tasks.data_cleanup import run_data_cleanup
from app.tasks.idle_analysis import DEFAULT_IDLE_DAYS, run_idle_analysis
from app.tasks.perf_collect import run_perf_collect
from app.tasks.zabbix_sync import run_zabbix_host_sync
from app.models.sync_job import SyncJob

from sqlalchemy.orm import Session

# 默认间隔（秒）
DEFAULT_PERF_INTERVAL = 600       # 10 分钟
DEFAULT_IDLE_INTERVAL = 600       # 10 分钟
DEFAULT_CLEANUP_INTERVAL = 86400  # 每天一次


def _get_int_setting(repo: SystemSettingsRepository, key: str, default: int) -> int:
    try:
        val = repo.get(key)
        return int(val.value) if val and val.value else default
    except (ValueError, AttributeError):
        return default


def _run_cleanup(session: Session) -> dict:
    """执行数据清理并记录同步日志"""
    started = datetime.now(CN_TZ)
    repo = SystemSettingsRepository(session)
    perf_days = _get_int_setting(repo, "perf_retention_days", 30)
    rdp_days = _get_int_setting(repo, "rdp_retention_days", 90)
    results = run_data_cleanup(session, perf_days=perf_days, rdp_days=rdp_days)
    session.add(SyncJob(
        job_type="data_cleanup",
        started_at=started,
        finished_at=datetime.now(CN_TZ),
        status="success",
        processed_count=sum(results.values()),
    ))
    session.commit()
    return results


def run_loop():
    """主循环：perf_collect 按 perf_collect_interval 跑，
       idle_analysis 按 idle_analysis_interval 独立跑，
       cleanup 每天一次"""
    zabbix_settings = get_zabbix_settings()
    project_settings = get_project_settings()
    has_zabbix = bool(zabbix_settings.zabbix_database_url)

    session_factory = build_project_session_factory(project_settings)

    # 初始化计时器
    last_cleanup_time = 0.0
    last_idle_time = 0.0

    print("[daemon] collector daemon started")

    while True:
        loop_start = time.time()

        # ── 读取配置（每个循环重新读，配置变更实时生效）──
        with session_factory() as session:
            repo = SystemSettingsRepository(session)
            perf_interval = _get_int_setting(repo, "perf_collect_interval", DEFAULT_PERF_INTERVAL)
            idle_interval = _get_int_setting(repo, "idle_analysis_interval", DEFAULT_IDLE_INTERVAL)

        with session_factory() as session:
            repo = SystemSettingsRepository(session)

            # 1. Zabbix 主机同步
            if has_zabbix:
                try:
                    zabbix_engine = build_zabbix_engine(zabbix_settings)
                    run_zabbix_host_sync(session, zabbix_engine)
                    zabbix_engine.dispose()
                except Exception as e:
                    print(f"[daemon] zabbix_host_sync error: {e}")

            # 2. 性能采集（每个循环执行）
            if has_zabbix:
                try:
                    ip_filter = repo.get("perf_collect_ip_filter")
                    ip_filter_val = ip_filter.value if ip_filter else None
                    zabbix_engine = build_zabbix_engine(zabbix_settings)
                    run_perf_collect(session, zabbix_engine, ip_filter=ip_filter_val)
                    zabbix_engine.dispose()
                except Exception as e:
                    print(f"[daemon] perf_collect error: {e}")

            # 3. 闲置分析（按 idle_analysis_interval 独立间隔执行）
            if time.time() - last_idle_time >= idle_interval:
                try:
                    run_idle_analysis(session, idle_days_threshold=DEFAULT_IDLE_DAYS)
                    last_idle_time = time.time()
                except Exception as e:
                    print(f"[daemon] idle_analysis error: {e}")

            # 4. 数据清理（每天一次）
            if time.time() - last_cleanup_time >= DEFAULT_CLEANUP_INTERVAL:
                try:
                    results = _run_cleanup(session)
                    print(f"[daemon] data_cleanup done: {results}")
                    last_cleanup_time = time.time()
                except Exception as e:
                    print(f"[daemon] data_cleanup error: {e}")

        elapsed = time.time() - loop_start
        sleep_sec = max(10, perf_interval - int(elapsed))
        print(f"[daemon] cycle done in {elapsed:.1f}s, next in {sleep_sec}s")
        time.sleep(sleep_sec)


if __name__ == "__main__":
    try:
        run_loop()
    except KeyboardInterrupt:
        print("[daemon] shutdown")
