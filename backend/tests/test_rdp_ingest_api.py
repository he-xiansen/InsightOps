import hashlib
from datetime import UTC, datetime, timedelta, timezone
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models import APIKey, VMAsset
from app.models.base import Base


def hash_api_key(raw_value: str) -> str:
    return hashlib.sha256(raw_value.encode("utf-8")).hexdigest()


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


@pytest.fixture()
def seeded_session(session_factory: sessionmaker[Session]) -> Generator[Session, None, None]:
    with session_factory() as session:
        session.add(APIKey(key_name="test-key", key_hash=hash_api_key("demo-key"), enabled=True))
        session.add(VMAsset(ip="10.0.0.1", hostname="vm-01", owner="alice"))
        session.commit()
        yield session


def test_ingest_requires_api_key(client: TestClient) -> None:
    response = client.post("/api/v1/rdp/ingest", json={"events": []})
    assert response.status_code == 401


def test_ingest_accepts_rdp_events(client: TestClient, session_factory: sessionmaker[Session]) -> None:
    # Seed API key
    with session_factory() as session:
        session.add(APIKey(key_name="test-key", key_hash=hash_api_key("demo-key"), enabled=True))
        session.commit()

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

    response = client.post(
        "/api/v1/rdp/ingest",
        json=payload,
        headers={"X-API-Key": "demo-key"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["received_count"] == 1
    assert data["accepted_count"] == 1
    assert data["inserted_count"] == 1


def test_ingest_deduplicates_events(client: TestClient, session_factory: sessionmaker[Session]) -> None:
    with session_factory() as session:
        session.add(APIKey(key_name="test-key", key_hash=hash_api_key("demo-key"), enabled=True))
        session.commit()

    event = {
        "event_id": 4624,
        "logon_type": 10,
        "ip": "10.0.0.1",
        "username": "alice",
        "login_at": "2026-06-11T14:30:00Z",
    }

    # First request
    r1 = client.post("/api/v1/rdp/ingest", json={"events": [event]}, headers={"X-API-Key": "demo-key"})
    assert r1.json()["inserted_count"] == 1

    # Second request (same event)
    r2 = client.post("/api/v1/rdp/ingest", json={"events": [event]}, headers={"X-API-Key": "demo-key"})
    assert r2.json()["inserted_count"] == 0
    assert r2.json()["existing_count"] == 1
