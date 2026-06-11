from collections.abc import Generator
from datetime import UTC, datetime

import app.models as models
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.collector.rdp_ingest import build_raw_event_hash, is_rdp_logon_event
from app.models.base import Base
from app.services.rdp_ingest_service import RDPIngestService


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


def build_event(**overrides: object) -> dict[str, object]:
    event = {
        "event_id": 4624,
        "logon_type": 10,
        "ip": "10.0.0.10",
        "username": "alice",
        "login_at": "2026-06-11T10:00:00+00:00",
        "source_host": "jumpbox-01",
    }
    event.update(overrides)
    return event


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def test_is_rdp_logon_event_accepts_4624_type_10() -> None:
    assert is_rdp_logon_event({"event_id": 4624, "logon_type": 10}) is True
    assert is_rdp_logon_event({"event_id": 4624, "logon_type": 3}) is False
    assert is_rdp_logon_event({"event_id": 4634, "logon_type": 10}) is False


def test_build_raw_event_hash_is_stable_for_equivalent_payload() -> None:
    first = build_event()
    second = {
        "username": "alice",
        "source_host": "jumpbox-01",
        "ip": "10.0.0.10",
        "logon_type": 10,
        "login_at": "2026-06-11T10:00:00+00:00",
        "event_id": 4624,
    }

    assert build_raw_event_hash(first) == build_raw_event_hash(second)


def test_ingest_events_deduplicates_hash_and_updates_asset_last_login_at(
    session_factory: sessionmaker[Session],
) -> None:
    expected_login_at = datetime(2026, 6, 11, 10, 0, tzinfo=UTC)
    raw_event = build_event()

    with session_factory() as session:
        session.add(models.VMAsset(ip="10.0.0.10", hostname="vm-01"))
        session.commit()

    with session_factory() as session:
        service = RDPIngestService(session)
        result = service.ingest_events([raw_event, dict(raw_event)])

    assert result == {"received_count": 2, "accepted_count": 2, "inserted_count": 1}

    with session_factory() as session:
        logins = session.scalars(select(models.VMRdpLogin)).all()
        asset = session.get(models.VMAsset, "10.0.0.10")
        jobs = session.scalars(select(models.SyncJob)).all()

    assert len(logins) == 1
    assert logins[0].ip == "10.0.0.10"
    assert logins[0].username == "alice"
    assert ensure_utc(logins[0].login_at) == expected_login_at
    assert logins[0].raw_event_hash == build_raw_event_hash(raw_event)
    assert asset is not None
    assert ensure_utc(asset.last_rdp_login_at) == expected_login_at
    assert len(jobs) == 1
    assert jobs[0].job_type == "rdp_ingest"
    assert jobs[0].status == "success"
    assert jobs[0].processed_count == 1


def test_ingest_events_skips_non_rdp_logons(session_factory: sessionmaker[Session]) -> None:
    with session_factory() as session:
        service = RDPIngestService(session)
        result = service.ingest_events([build_event(logon_type=3), build_event(event_id=4634)])

    assert result == {"received_count": 2, "accepted_count": 0, "inserted_count": 0}

    with session_factory() as session:
        logins = session.scalars(select(models.VMRdpLogin)).all()
        jobs = session.scalars(select(models.SyncJob)).all()

    assert logins == []
    assert len(jobs) == 1
    assert jobs[0].processed_count == 0
