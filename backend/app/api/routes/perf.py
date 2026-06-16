from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.services.perf_overview_service import PerfOverviewService


router = APIRouter(prefix="/api/v1/perf", tags=["perf"])


@router.get("/overview")
def get_perf_overview(session: Session = Depends(get_session)) -> dict:
    """获取所有主机的最近 CPU/内存使用率"""
    service = PerfOverviewService(session)
    return service.get_overview()
