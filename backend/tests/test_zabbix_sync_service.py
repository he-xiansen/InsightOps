from collections.abc import Generator

import app.models as models
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.base import Base
from app.services.zabbix_sync_service import ZabbixSyncService
from app.tasks.zabbix_sync import build_host_sync_job_name


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


def test_sync_host_rows_upserts_mapping_and_records_job(
    session_factory: sessionmaker[Session],
) -> None:
    with session_factory() as session:
        service = ZabbixSyncService(session)
        processed_count = service.sync_host_rows(
            [
                {"hostid": 10084, "host": "vm-01", "ip": "10.0.0.10", "available": 1},
                {"hostid": 10085, "host": "vm-02", "ip": None, "available": 1},
            ]
        )

    assert processed_count == 1

    with session_factory() as session:
        mappings = session.scalars(select(models.ZabbixHostMapping)).all()
        jobs = session.scalars(select(models.SyncJob)).all()

    assert len(mappings) == 1
    assert mappings[0].ip == "10.0.0.10"
    assert mappings[0].zabbix_hostid == 10084
    assert mappings[0].host_name == "vm-01"
    assert mappings[0].available is True
    assert mappings[0].last_sync_at is not None

    assert len(jobs) == 1
    assert jobs[0].job_type == build_host_sync_job_name()
    assert jobs[0].status == "success"
    assert jobs[0].processed_count == 1
    assert jobs[0].finished_at is not None


def test_sync_host_rows_updates_existing_mapping_for_same_ip(
    session_factory: sessionmaker[Session],
) -> None:
    with session_factory() as session:
        service = ZabbixSyncService(session)
        service.sync_host_rows(
            [
                {"hostid": 10084, "host": "vm-01", "ip": "10.0.0.10", "available": 1},
            ]
        )
        processed_count = service.sync_host_rows(
            [
                {"hostid": 10084, "host": "vm-01-renamed", "ip": "10.0.0.10", "available": 0},
            ]
        )

    assert processed_count == 1

    with session_factory() as session:
        mapping = session.get(models.ZabbixHostMapping, "10.0.0.10")
        jobs = session.scalars(select(models.SyncJob).order_by(models.SyncJob.started_at)).all()

    assert mapping is not None
    assert mapping.host_name == "vm-01-renamed"
    assert mapping.available is False
    assert len(jobs) == 2
    assert [job.processed_count for job in jobs] == [1, 1]
