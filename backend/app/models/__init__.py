from app.models.api_key import APIKey
from app.models.idle_vm_snapshot import IdleVMSnapshot
from app.models.sync_job import SyncJob
from app.models.vm_asset import VMAsset
from app.models.vm_rdp_login import VMRdpLogin
from app.models.zabbix_host_mapping import ZabbixHostMapping

__all__ = [
    "APIKey",
    "IdleVMSnapshot",
    "SyncJob",
    "VMAsset",
    "VMRdpLogin",
    "ZabbixHostMapping",
]
