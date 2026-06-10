import app.models as models
from app.models.base import Base


def test_vm_asset_uses_ip_as_unique_identity() -> None:
    asset = models.VMAsset(ip="10.0.0.10", hostname="vm-01")

    assert asset.ip == "10.0.0.10"
    assert asset.hostname == "vm-01"
    assert tuple(models.VMAsset.__table__.primary_key.columns.keys()) == ("ip",)


def test_models_expose_minimum_planned_columns() -> None:
    assert set(models.VMAsset.__table__.columns.keys()) == {
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
    assert set(models.VMRdpLogin.__table__.columns.keys()) == {
        "id",
        "ip",
        "login_at",
        "username",
        "raw_event_hash",
    }
    assert set(models.IdleVMSnapshot.__table__.columns.keys()) == {
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
    assert set(models.ZabbixHostMapping.__table__.columns.keys()) == {
        "ip",
        "zabbix_hostid",
        "host_name",
        "available",
        "last_sync_at",
    }
    assert set(models.SyncJob.__table__.columns.keys()) == {
        "job_type",
        "started_at",
        "finished_at",
        "status",
        "processed_count",
        "error_message",
    }
    assert set(models.APIKey.__table__.columns.keys()) == {
        "key_name",
        "key_hash",
        "enabled",
        "expires_at",
        "last_used_at",
    }


def test_models_package_registers_all_six_tables() -> None:
    assert models.VMAsset is not None
    assert models.VMRdpLogin is not None
    assert models.IdleVMSnapshot is not None
    assert models.ZabbixHostMapping is not None
    assert models.SyncJob is not None
    assert models.APIKey is not None
    assert set(Base.metadata.tables.keys()) == {
        "vm_assets",
        "vm_rdp_logins",
        "idle_vm_snapshots",
        "zabbix_host_mapping",
        "sync_jobs",
        "api_keys",
    }


def test_models_enforce_core_keys_and_indexes() -> None:
    assert tuple(models.VMRdpLogin.__table__.primary_key.columns.keys()) == ("id",)
    assert {
        tuple(index.columns.keys())
        for index in models.VMRdpLogin.__table__.indexes
    } >= {("ip",), ("login_at",), ("raw_event_hash",)}
    assert models.VMRdpLogin.__table__.c.raw_event_hash.unique is True

    assert tuple(models.IdleVMSnapshot.__table__.primary_key.columns.keys()) == (
        "snapshot_date",
        "ip",
    )
    assert tuple(models.ZabbixHostMapping.__table__.primary_key.columns.keys()) == ("ip",)
    assert {
        tuple(index.columns.keys())
        for index in models.ZabbixHostMapping.__table__.indexes
    } >= {("zabbix_hostid",)}
    assert tuple(models.SyncJob.__table__.primary_key.columns.keys()) == (
        "job_type",
        "started_at",
    )
    assert tuple(models.APIKey.__table__.primary_key.columns.keys()) == ("key_name",)
    assert models.APIKey.__table__.c.key_hash.unique is True
