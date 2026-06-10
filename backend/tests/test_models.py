from sqlalchemy import UniqueConstraint

from app.models.api_key import APIKey
from app.models.idle_vm_snapshot import IdleVMSnapshot
from app.models.sync_job import SyncJob
from app.models.vm_asset import VMAsset
from app.models.vm_rdp_login import VMRdpLogin
from app.models.zabbix_host_mapping import ZabbixHostMapping


def test_vm_asset_uses_ip_as_unique_identity() -> None:
    asset = VMAsset(ip="10.0.0.10", hostname="vm-01")

    assert asset.ip == "10.0.0.10"
    assert asset.hostname == "vm-01"
    assert any(
        isinstance(constraint, UniqueConstraint)
        and tuple(constraint.columns.keys()) == ("ip",)
        for constraint in VMAsset.__table__.constraints
    )


def test_models_expose_minimum_planned_columns() -> None:
    assert set(VMAsset.__table__.columns.keys()) == {
        "ip",
        "hostname",
        "department",
        "lab",
        "owner",
        "os_type",
        "status",
        "last_rdp_login_at",
        "last_seen_at",
    }
    assert set(VMRdpLogin.__table__.columns.keys()) == {
        "id",
        "ip",
        "login_at",
        "username",
        "raw_event_hash",
    }
    assert set(IdleVMSnapshot.__table__.columns.keys()) == {
        "snapshot_date",
        "ip",
        "idle_days",
        "owner",
        "department",
        "lab",
        "recycle_level",
        "reason",
        "last_rdp_login_at",
    }
    assert set(ZabbixHostMapping.__table__.columns.keys()) == {
        "ip",
        "zabbix_hostid",
        "host_name",
        "available",
        "last_sync_at",
    }
    assert set(SyncJob.__table__.columns.keys()) == {
        "job_type",
        "started_at",
        "finished_at",
        "status",
        "processed_count",
        "error_message",
    }
    assert set(APIKey.__table__.columns.keys()) == {
        "key_name",
        "key_hash",
        "enabled",
        "expires_at",
        "last_used_at",
    }
