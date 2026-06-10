from datetime import datetime

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


class AssetSyncResponse(BaseModel):
    job_type: str
    processed_count: int
    status: str
