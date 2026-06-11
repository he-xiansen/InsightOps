from datetime import date, datetime

from pydantic import BaseModel, Field


class VMAssetUpsertItem(BaseModel):
    ip: str
    hostname: str | None = None
    department: str | None = None
    lab: str | None = None
    owner: str | None = None
    os_type: str | None = None
    status: str = "active"
    last_rdp_login_at: datetime | None = None
    last_seen_at: datetime | None = None


class BulkUpsertVMAssetsRequest(BaseModel):
    items: list[VMAssetUpsertItem] = Field(default_factory=list)


class BulkUpsertVMAssetsResponse(BaseModel):
    processed_count: int
    upserted_count: int


class AssetSyncResponseData(BaseModel):
    upserted_count: int


class AssetSyncResponse(BaseModel):
    code: int
    message: str
    data: AssetSyncResponseData


class VMAssetListItem(BaseModel):
    ip: str
    hostname: str | None = None
    department: str | None = None
    lab: str | None = None
    owner: str | None = None
    os_type: str | None = None
    status: str
    last_rdp_login_at: datetime | None = None


class VMAssetListResponse(BaseModel):
    items: list[VMAssetListItem] = Field(default_factory=list)


class IdleVMListItem(BaseModel):
    snapshot_date: date
    ip: str
    idle_days: int
    owner: str | None = None
    department: str | None = None
    lab: str | None = None
    recycle_level: str
    reason: str | None = None
    last_rdp_login_at: datetime | None = None


class IdleVMListResponse(BaseModel):
    items: list[IdleVMListItem] = Field(default_factory=list)
