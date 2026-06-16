import argparse
import os
from collections.abc import Sequence

from app.core.database import (
    build_project_session_factory,
    build_zabbix_engine,
    get_project_settings,
    get_zabbix_settings,
)
from app.tasks.idle_analysis import DEFAULT_IDLE_DAYS, run_idle_analysis
from app.tasks.perf_collect import run_perf_collect
from app.tasks.zabbix_sync import run_zabbix_host_sync
from app.repositories.system_settings_repository import SYSTEM_SETTINGS_KEYS


TASK_NAMES = {"zabbix_host_sync", "idle_analysis", "perf_collect"}


def resolve_task_name(cli_task: str | None, env_task: str | None) -> str:
    task_name = cli_task or env_task or "idle_analysis"
    if task_name not in TASK_NAMES:
        raise ValueError(f"unsupported collector task: {task_name}")
    return task_name


def run_selected_task(task_name: str, idle_days: int) -> int:
    project_settings = get_project_settings()
    session_factory = build_project_session_factory(project_settings)

    with session_factory() as session:
        if task_name == "zabbix_host_sync":
            zabbix_engine = build_zabbix_engine(get_zabbix_settings())
            try:
                return run_zabbix_host_sync(session, zabbix_engine)
            finally:
                zabbix_engine.dispose()

        if task_name == "perf_collect":
            from app.core.database import build_zabbix_engine, get_zabbix_settings
            from app.repositories.system_settings_repository import SystemSettingsRepository

            settings_repo = SystemSettingsRepository(session)
            ip_filter = settings_repo.get("perf_collect_ip_filter")

            zabbix_engine = build_zabbix_engine(get_zabbix_settings())
            try:
                return run_perf_collect(session, zabbix_engine, ip_filter=ip_filter)
            finally:
                zabbix_engine.dispose()

        return run_idle_analysis(session, idle_days_threshold=idle_days)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="InsightOps collector task runner")
    parser.add_argument("task", nargs="?", choices=sorted(TASK_NAMES))
    parser.add_argument("--idle-days", type=int, default=DEFAULT_IDLE_DAYS)
    args = parser.parse_args(list(argv) if argv is not None else None)

    task_name = resolve_task_name(args.task, os.getenv("INSIGHTOPS_COLLECTOR_TASK"))
    processed_count = run_selected_task(task_name, args.idle_days)
    print(f"task={task_name} processed_count={processed_count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
