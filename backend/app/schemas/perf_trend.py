from typing import Literal

from pydantic import BaseModel, Field


PerfGranularity = Literal["hour", "day"]


class PerfTrendPoint(BaseModel):
    clock: int
    cpu_avg: float
    mem_avg: float


class PerfTrendResponseData(BaseModel):
    granularity: PerfGranularity
    series: list[PerfTrendPoint] = Field(default_factory=list)


class PerfTrendResponse(BaseModel):
    code: int
    message: str
    data: PerfTrendResponseData
