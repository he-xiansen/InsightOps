import hashlib
from datetime import datetime, timedelta, timezone
from importlib import import_module
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models import APIKey, SyncJob, VMAsset
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

    try:
        database_module = import_module("app.core.database")
        get_session = getattr(database_module, "get_session")
    except (ModuleNotFoundError, AttributeError):
        get_session = None

    if get_session is not None:
        def override_get_session() -> Generator[Session, None, None]:
            with session_factory() as session:
                yield session

        app.dependency_overrides[get_session] = override_get_session

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def seed_api_key(
    session_factory: sessionmaker[Session],
    *,
    raw_value: str = "secret-key",
    enabled: bool = True,
    expires_at: datetime | None = None,
) -> None:
    with session_factory() as session:
        session.add(
            APIKey(
                key_name="test-key",
                key_hash=hash_api_key(raw_value),
                enabled=enabled,
                expires_at=expires_at,
            )
        )
        session.commit()


def test_bulk_upsert_requires_api_key_authentication(client: TestClient) -> None:
    response = client.post("/api/assets/bulk-upsert", json={"items": []})

    assert response.status_code == 401
    assert response.json()["detail"]


def test_bulk_upsert_rejects_invalid_api_key(
    client: TestClient,
    session_factory: sessionmaker[Session],
) -> None:
    seed_api_key(session_factory)

    response = client.post(
        "/api/assets/bulk-upsert",
        headers={"X-API-Key": "wrong-key"},
        json={"items": [{"ip": "10.0.0.1", "hostname": "vm-01"}]},
    )

    assert response.status_code == 401
    assert response.json()["detail"]


def test_bulk_upsert_creates_and_updates_assets(
    client: TestClient,
    session_factory: sessionmaker[Session],
) -> None:
    seed_api_key(session_factory)

    create_response = client.post(
        "/api/assets/bulk-upsert",
        headers={"X-API-Key": "secret-key"},
        json={
            "items": [
                {"ip": "10.0.0.1", "hostname": "vm-01", "department": "engineering"},
                {"ip": "10.0.0.2", "hostname": "vm-02", "owner": "alice"},
            ]
        },
    )

    assert create_response.status_code == 200
    assert create_response.json() == {"processed_count": 2, "upserted_count": 2}

    update_response = client.post(
        "/api/assets/bulk-upsert",
        headers={"X-API-Key": "secret-key"},
        json={
            "items": [
                {
                    "ip": "10.0.0.1",
                    "hostname": "vm-01-renamed",
                    "department": "platform",
                    "status": "inactive",
                }
            ]
        },
    )

    assert update_response.status_code == 200
    assert update_response.json() == {"processed_count": 1, "upserted_count": 1}

    with session_factory() as session:
        assets = session.scalars(select(VMAsset).order_by(VMAsset.ip)).all()
        api_key = session.get(APIKey, "test-key")

    assert [(asset.ip, asset.hostname, asset.department, asset.status) for asset in assets] == [
        ("10.0.0.1", "vm-01-renamed", "platform", "inactive"),
        ("10.0.0.2", "vm-02", None, "active"),
    ]
    assert api_key is not None
    assert api_key.last_used_at is not None


def test_sync_assets_reuses_payload_and_records_sync_job(
    client: TestClient,
    session_factory: sessionmaker[Session],
) -> None:
    seed_api_key(session_factory, expires_at=datetime.now(timezone.utc) + timedelta(days=1))

    response = client.post(
        "/api/sync/assets",
        headers={"X-API-Key": "secret-key"},
        json={
            "items": [
                {
                    "ip": "10.0.0.8",
                    "hostname": "sync-vm",
                    "department": "ops",
                    "last_seen_at": "2026-06-11T10:00:00Z",
                }
            ]
        },
    )

    assert response.status_code == 200
    assert response.json()["job_type"] == "asset_sync"
    assert response.json()["processed_count"] == 1
    assert response.json()["status"] == "success"

    with session_factory() as session:
        sync_jobs = session.scalars(select(SyncJob)).all()
        asset = session.get(VMAsset, "10.0.0.8")

    assert len(sync_jobs) == 1
    assert sync_jobs[0].job_type == "asset_sync"
    assert sync_jobs[0].processed_count == 1
    assert sync_jobs[0].status == "success"
    assert sync_jobs[0].finished_at is not None
    assert asset is not None
    assert asset.hostname == "sync-vm"
