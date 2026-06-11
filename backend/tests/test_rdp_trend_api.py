from collections.abc import Generator
from datetime import UTC, datetime
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


@pytest.mark.parametrize(
    ("granularity", "login_times", "expected_series"),
    [
        (
            "day",
            [
                datetime(2026, 6, 1, 8, 0, tzinfo=UTC),
                datetime(2026, 6, 1, 9, 0, tzinfo=UTC),
                datetime(2026, 6, 2, 10, 0, tzinfo=UTC),
            ],
            [
                {"bucket": "2026-06-01", "login_count": 2},
                {"bucket": "2026-06-02", "login_count": 1},
            ],
        ),
        (
            "week",
            [
                datetime(2026, 6, 1, 8, 0, tzinfo=UTC),
                datetime(2026, 6, 3, 9, 0, tzinfo=UTC),
                datetime(2026, 6, 8, 10, 0, tzinfo=UTC),
            ],
            [
                {"bucket": "2026-W23", "login_count": 2},
                {"bucket": "2026-W24", "login_count": 1},
            ],
        ),
        (
            "month",
            [
                datetime(2026, 5, 31, 8, 0, tzinfo=UTC),
                datetime(2026, 6, 1, 9, 0, tzinfo=UTC),
                datetime(2026, 6, 11, 10, 0, tzinfo=UTC),
            ],
            [
                {"bucket": "2026-05", "login_count": 1},
                {"bucket": "2026-06", "login_count": 2},
            ],
        ),
    ],
)
def test_rdp_trend_api_supports_expected_granularity_buckets(
    client: TestClient,
    session_factory: sessionmaker[Session],
    granularity: str,
    login_times: list[datetime],
    expected_series: list[dict[str, int | str]],
) -> None:
    with session_factory() as session:
        session.add_all(
            [
                models.VMRdpLogin(
                    ip=f"10.0.0.{index}",
                    username="alice",
                    login_at=login_at,
                    raw_event_hash=f"hash-{granularity}-{index}",
                )
                for index, login_at in enumerate(login_times, start=1)
            ]
        )
        session.commit()

    response = client.get(f"/api/v1/rdp/trends?granularity={granularity}")

    assert response.status_code == 200
    assert response.json() == {
        "code": 0,
        "message": "success",
        "data": {
            "granularity": granularity,
            "series": expected_series,
        },
    }
