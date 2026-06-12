from datetime import UTC, datetime
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models import VMAsset
from app.models.base import Base


@pytest.fixture()
def session_factory() -> sessionmaker[Session]:
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

    from app.core import database as database_module
    get_session = getattr(database_module, "get_session", None)

    if get_session is not None:
        def override_get_session() -> Generator[Session, None, None]:
            with session_factory() as session:
                yield session
        app.dependency_overrides[get_session] = override_get_session

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_ingest_without_api_key_succeeds(client: TestClient) -> None:
    response = client.post("/api/v1/rdp/ingest", json={"events": []})
    assert response.status_code == 200


def test_ingest_accepts_rdp_events(client: TestClient) -> None:
    payload = {
        "events": [
            {
                "event_id": 4624,
                "logon_type": 10,
                "ip": "10.0.0.1",
                "username": "alice",
                "login_at": "2026-06-11T14:30:00Z",
            }
        ]
    }

    response = client.post("/api/v1/rdp/ingest", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["received_count"] == 1
    assert data["accepted_count"] == 1
    assert data["inserted_count"] == 1


def test_ingest_deduplicates_events(client: TestClient) -> None:
    event = {
        "event_id": 4624,
        "logon_type": 10,
        "ip": "10.0.0.1",
        "username": "alice",
        "login_at": "2026-06-11T14:30:00Z",
    }

    # First request
    r1 = client.post("/api/v1/rdp/ingest", json={"events": [event]})
    assert r1.json()["inserted_count"] == 1

    # Second request (same event)
    r2 = client.post("/api/v1/rdp/ingest", json={"events": [event]})
    assert r2.json()["inserted_count"] == 0
    assert r2.json()["existing_count"] == 1
