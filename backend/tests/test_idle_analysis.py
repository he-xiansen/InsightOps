from collections.abc import Generator
from datetime import UTC, date, datetime, timedelta

import app.models as models
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.base import Base
from app.services.idle_analysis_service import IdleAnalysisService, classify_idle_days
from app.tasks.idle_analysis import DEFAULT_IDLE_DAYS, run_idle_analysis


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


def test_classify_idle_days_returns_expected_recycle_levels() -> None:
    now = datetime(2026, 6, 11, 10, 0, tzinfo=UTC)

    assert classify_idle_days(now - timedelta(days=35), now).recycle_level == "low"
    assert classify_idle_days(now - timedelta(days=65), now).recycle_level == "medium"
    high_level = classify_idle_days(now - timedelta(days=95), now)

    assert high_level.idle_days == 95
    assert high_level.recycle_level == "high"


def test_analyze_idle_assets_creates_snapshots_for_assets_over_default_threshold(
    session_factory: sessionmaker[Session],
) -> None:
    as_of = datetime(2026, 6, 11, 10, 0, tzinfo=UTC)

    with session_factory() as session:
        session.add_all(
            [
                models.VMAsset(
                    ip="10.0.0.10",
                    hostname="vm-01",
                    owner="alice",
                    department="platform",
                    lab="lab-a",
                    last_rdp_login_at=as_of - timedelta(days=45),
                ),
                models.VMAsset(
                    ip="10.0.0.11",
                    hostname="vm-02",
                    owner="bob",
                    department="platform",
                    lab="lab-b",
                    last_rdp_login_at=as_of - timedelta(days=12),
                ),
                models.VMAsset(
                    ip="10.0.0.12",
                    hostname="vm-03",
                    owner="carol",
                    department="ops",
                    lab="lab-c",
                    last_seen_at=as_of - timedelta(hours=1),
                ),
            ]
        )
        session.commit()

    with session_factory() as session:
        service = IdleAnalysisService(session)
        processed_count = service.analyze_idle_assets(as_of=as_of, idle_days_threshold=DEFAULT_IDLE_DAYS)

    assert processed_count == 2

    with session_factory() as session:
        snapshots = session.scalars(
            select(models.IdleVMSnapshot).order_by(models.IdleVMSnapshot.ip)
        ).all()
        jobs = session.scalars(select(models.SyncJob)).all()

    assert [(snapshot.ip, snapshot.idle_days, snapshot.recycle_level) for snapshot in snapshots] == [
        ("10.0.0.10", 45, "low"),
        ("10.0.0.12", 30, "low"),
    ]
    assert snapshots[0].snapshot_date == date(2026, 6, 11)
    assert snapshots[0].reason == "连续 45 天未发生 RDP 登录"
    assert snapshots[1].reason == "自纳管以来未登录"
    assert len(jobs) == 1
    assert jobs[0].job_type == "idle_analysis"
    assert jobs[0].status == "success"
    assert jobs[0].processed_count == 2


def test_run_idle_analysis_replaces_same_day_snapshots(session_factory: sessionmaker[Session]) -> None:
    as_of = datetime(2026, 6, 11, 10, 0, tzinfo=UTC)

    with session_factory() as session:
        session.add(
            models.VMAsset(
                ip="10.0.0.20",
                hostname="vm-20",
                owner="dave",
                department="ops",
                lab="lab-d",
                last_rdp_login_at=as_of - timedelta(days=70),
            )
        )
        session.commit()

    with session_factory() as session:
        first_count = run_idle_analysis(session, as_of=as_of)
    with session_factory() as session:
        second_count = run_idle_analysis(session, as_of=as_of)

    assert first_count == 1
    assert second_count == 1

    with session_factory() as session:
        snapshots = session.scalars(select(models.IdleVMSnapshot)).all()
        jobs = session.scalars(select(models.SyncJob).order_by(models.SyncJob.started_at)).all()

    assert len(snapshots) == 1
    assert snapshots[0].ip == "10.0.0.20"
    assert snapshots[0].idle_days == 70
    assert len(jobs) == 2


def test_run_idle_analysis_keeps_never_logged_in_asset_idle_when_last_seen_refreshes(
    session_factory: sessionmaker[Session],
) -> None:
    first_snapshot_date = date(2026, 6, 10)
    as_of = datetime(2026, 6, 11, 10, 0, tzinfo=UTC)

    with session_factory() as session:
        session.add(
            models.VMAsset(
                ip="10.0.0.30",
                hostname="vm-30",
                owner="erin",
                department="ops",
                lab="lab-e",
                last_seen_at=as_of - timedelta(minutes=5),
            )
        )
        session.add(
            models.IdleVMSnapshot(
                snapshot_date=first_snapshot_date,
                ip="10.0.0.30",
                idle_days=44,
                owner="erin",
                department="ops",
                lab="lab-e",
                recycle_level="low",
                reason="自纳管以来未登录",
                last_rdp_login_at=None,
            )
        )
        session.commit()

    with session_factory() as session:
        processed_count = run_idle_analysis(session, as_of=as_of)

    assert processed_count == 1

    with session_factory() as session:
        snapshots = session.scalars(
            select(models.IdleVMSnapshot).order_by(models.IdleVMSnapshot.snapshot_date)
        ).all()

    assert len(snapshots) == 2
    assert snapshots[0].snapshot_date == date(2026, 6, 10)
    assert snapshots[0].idle_days == 44
    assert snapshots[1].snapshot_date == date(2026, 6, 11)
    assert snapshots[1].ip == "10.0.0.30"
    assert snapshots[1].idle_days == 45
    assert snapshots[1].reason == "自纳管以来未登录"
