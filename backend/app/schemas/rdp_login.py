from datetime import datetime

from pydantic import BaseModel, Field


class RdpLoginItem(BaseModel):
    id: int
    ip: str
    login_at: datetime
    username: str | None = None


class RdpLoginListResponse(BaseModel):
    items: list[RdpLoginItem] = Field(default_factory=list)
    total: int = 0
