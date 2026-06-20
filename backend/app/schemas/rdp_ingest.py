from datetime import datetime

from pydantic import BaseModel, Field


class RdpIngestEvent(BaseModel):
    event_id: int = 4624
    logon_type: int = 10
    ip: str
    username: str | None = None
    login_at: datetime


class RdpIngestRequest(BaseModel):
    events: list[RdpIngestEvent] = Field(default_factory=list)
    source_ip: str | None = None  # 客户端自身 IP，用于更新在线状态


class RdpIngestResponse(BaseModel):
    received_count: int = 0
    accepted_count: int = 0
    inserted_count: int = 0
    existing_count: int = 0
