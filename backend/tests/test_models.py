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
    assert {"ip", "last_rdp_login_at", "last_seen_at"}.issubset(VMAsset.__table__.columns.keys())
    assert {"ip", "login_at", "raw_event_hash", "logon_type"}.issubset(VMRdpLogin.__table__.columns.keys())
    assert {"snapshot_date", "ip", "idle_days", "recycle_level"}.issubset(IdleVMSnapshot.__table__.columns.keys())
    assert {"ip", "zabbix_hostid", "host_name", "available"}.issubset(ZabbixHostMapping.__table__.columns.keys())
    assert {"job_type", "started_at", "finished_at", "status"}.issubset(SyncJob.__table__.columns.keys())
    assert {"key_name", "key_hash", "enabled", "expires_at"}.issubset(APIKey.__table__.columns.keys())
