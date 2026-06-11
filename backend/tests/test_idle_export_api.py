from collections.abc import Generator
from datetime import UTC, date, datetime
from importlib import import_module

import app.models as models
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models.base import Base


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


@pytest.fixture()
def client(session_factory: sessionmaker[Session]) -> Generator[TestClient, None, None]:
    app.dependency_overrides.clear()

    database_module = import_module("app.core.database")
    get_session = getattr(database_module, "get_session")

    def override_get_session() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_idle_export_returns_csv_rows_for_snapshots(
    client: TestClient,
    session_factory: sessionmaker[Session],
) -> None:
    with session_factory() as session:
        session.add_all(
            [
                models.IdleVMSnapshot(
                    snapshot_date=date(2026, 6, 11),
                    ip="10.0.0.10",
                    idle_days=45,
                    owner="alice",
                    department="platform",
                    lab="lab-a",
                    recycle_level="low",
                    reason="连续 45 天未发生 RDP 登录",
                    last_rdp_login_at=datetime(2026, 4, 27, 8, 0, tzinfo=UTC),
                ),
                models.IdleVMSnapshot(
                    snapshot_date=date(2026, 6, 11),
                    ip="10.0.0.11",
                    idle_days=95,
                    owner="bob",
                    department="ops",
                    lab="lab-b",
                    recycle_level="high",
                    reason="连续 95 天未发生 RDP 登录",
                    last_rdp_login_at=datetime(2026, 3, 8, 8, 0, tzinfo=UTC),
                ),
            ]
        )
        session.commit()

    response = client.get("/api/v1/idle/export")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert response.headers["content-disposition"] == 'attachment; filename="idle-snapshots.csv"'
    assert response.text == (
        "ip,owner,idle_days,recycle_level\r\n"
        "10.0.0.10,alice,45,low\r\n"
        "10.0.0.11,bob,95,high\r\n"
    )
