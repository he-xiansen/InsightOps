from collections.abc import Generator
from datetime import UTC, date, datetime

import app.models as models
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core import database as database_module
from app.core.settings import MissingSettingsError
from app.main import app
from app.models import VMAsset
from app.models.base import Base


SETTINGS_ENV_VARS = (
    "PROJECT_DB_HOST",
    "PROJECT_DB_PORT",
    "PROJECT_DB_USER",
    "PROJECT_DB_PASSWORD",
    "PROJECT_DB_NAME",
    "ZABBIX_DB_HOST",
    "ZABBIX_DB_PORT",
    "ZABBIX_DB_USER",
    "ZABBIX_DB_PASSWORD",
    "ZABBIX_DB_NAME",
)

PROJECT_ONLY_ENV = {
    "PROJECT_DB_HOST": "project-mysql",
    "PROJECT_DB_PORT": "3306",
    "PROJECT_DB_USER": "insightops",
    "PROJECT_DB_PASSWORD": "secret",
    "PROJECT_DB_NAME": "insightops",
}

EXPECTED_PROJECT_FIELDS = [
    "project_db_host",
    "project_db_name",
    "project_db_password",
    "project_db_user",
]


def _safe_cache_clear(fn: object) -> None:
    if callable(getattr(fn, "cache_clear", None)):
        fn.cache_clear()  # type: ignore[union-attr]


@pytest.fixture(autouse=True)
def clear_runtime_state(monkeypatch: pytest.MonkeyPatch) -> Generator[None, None, None]:
    app.dependency_overrides.clear()

    for key in SETTINGS_ENV_VARS:
        monkeypatch.delenv(key, raising=False)

    database_module.get_settings.cache_clear()
    database_module.get_project_session_factory.cache_clear()
    _safe_cache_clear(getattr(database_module, "get_project_settings", None))
    _safe_cache_clear(getattr(database_module, "get_zabbix_settings", None))

    yield

    app.dependency_overrides.clear()
    database_module.get_settings.cache_clear()
    database_module.get_project_session_factory.cache_clear()
    _safe_cache_clear(getattr(database_module, "get_project_settings", None))
    _safe_cache_clear(getattr(database_module, "get_zabbix_settings", None))


@pytest.fixture()
def session_factory() -> Generator[sessionmaker[Session], None, None]:
    engine = create_engine(
        "sqlite+pysqlite://",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)

    yield factory

    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.mark.parametrize("path", ["/api/assets", "/api/v1/idle"])
def test_read_endpoints_return_explicit_503_when_project_settings_missing(
    path: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        database_module,
        "get_project_settings",
        lambda: (_ for _ in ()).throw(
            MissingSettingsError(scope="project database", fields=EXPECTED_PROJECT_FIELDS),
        ),
    )
    database_module.get_project_session_factory.cache_clear()

    client = TestClient(app, raise_server_exceptions=False)

    response = client.get(path)

    assert response.status_code == 503
    assert response.json() == {
        "detail": {
            "code": "missing_configuration",
            "message": "Missing required project database settings.",
            "fields": EXPECTED_PROJECT_FIELDS,
        }
    }


def test_read_endpoints_do_not_require_zabbix_settings(
    monkeypatch: pytest.MonkeyPatch,
    session_factory: sessionmaker[Session],
) -> None:
    for key, value in PROJECT_ONLY_ENV.items():
        monkeypatch.setenv(key, value)

    with session_factory() as session:
        session.add(
            VMAsset(
                ip="10.0.0.1",
                hostname="vm-01",
                owner="alice",
            )
        )
        session.add(
            models.IdleVMSnapshot(
                snapshot_date=date(2026, 6, 11),
                ip="10.0.0.1",
                idle_days=45,
                owner="alice",
                department="platform",
                lab="lab-a",
                recycle_level="low",
                reason="连续 45 天未发生 RDP 登录",
                last_rdp_login_at=datetime(2026, 4, 27, 8, 0, tzinfo=UTC),
            )
        )
        session.commit()

    monkeypatch.setattr(
        database_module,
        "build_project_session_factory",
        lambda settings: session_factory,
    )
    database_module.get_settings.cache_clear()
    database_module.get_project_session_factory.cache_clear()

    client = TestClient(app, raise_server_exceptions=False)

    assets_response = client.get("/api/assets")
    idle_response = client.get("/api/v1/idle")

    assert assets_response.status_code == 200
    assert assets_response.json()["items"] == [
        {
            "ip": "10.0.0.1",
            "hostname": "vm-01",
            "department": None,
            "lab": None,
            "owner": "alice",
            "os_type": None,
            "status": "active",
            "last_rdp_login_at": None,
        }
    ]
    assert idle_response.status_code == 200
    assert idle_response.json()["items"] == [
        {
            "snapshot_date": "2026-06-11",
            "ip": "10.0.0.1",
            "idle_days": 45,
            "owner": "alice",
            "department": "platform",
            "lab": "lab-a",
            "recycle_level": "low",
            "reason": "连续 45 天未发生 RDP 登录",
            "last_rdp_login_at": "2026-04-27T08:00:00",
        }
    ]
