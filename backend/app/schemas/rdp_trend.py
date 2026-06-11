from typing import Literal

from pydantic import BaseModel, Field


TrendGranularity = Literal["day", "week", "month"]


class RDPTrendPoint(BaseModel):
    bucket: str
    login_count: int


class RDPTrendResponseData(BaseModel):
    granularity: TrendGranularity
    series: list[RDPTrendPoint] = Field(default_factory=list)


class RDPTrendResponse(BaseModel):
    code: int
    message: str
    data: RDPTrendResponseData
