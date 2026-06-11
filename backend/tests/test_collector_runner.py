import pytest

from app import collector_runner


def test_main_prefers_cli_task_over_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("INSIGHTOPS_COLLECTOR_TASK", "zabbix_host_sync")
    observed: list[tuple[str, int]] = []

    monkeypatch.setattr(
        "app.collector_runner.run_selected_task",
        lambda task_name, idle_days: observed.append((task_name, idle_days)) or 3,
    )

    exit_code = collector_runner.main(["idle_analysis", "--idle-days", "45"])

    assert exit_code == 0
    assert observed == [("idle_analysis", 45)]


def test_main_uses_env_task_when_cli_task_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("INSIGHTOPS_COLLECTOR_TASK", "zabbix_host_sync")
    observed: list[tuple[str, int]] = []

    monkeypatch.setattr(
        "app.collector_runner.run_selected_task",
        lambda task_name, idle_days: observed.append((task_name, idle_days)) or 1,
    )

    exit_code = collector_runner.main([])

    assert exit_code == 0
    assert observed == [("zabbix_host_sync", 30)]


def test_default_task_name_is_idle_analysis() -> None:
    assert collector_runner.resolve_task_name(None, None) == "idle_analysis"
