from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.services.perf_overview_service import PerfOverviewService
from app.services.host_detail_service import HostDetailService


router = APIRouter(prefix="/api/v1/perf", tags=["perf"])


@router.get("/overview")
def get_perf_overview(session: Session = Depends(get_session)) -> dict:
    """获取所有主机的最近 CPU/内存使用率"""
    service = PerfOverviewService(session)
    return service.get_overview()

@router.get("/host/{ip}")
def get_host_detail(
    ip: str,
    session: Session = Depends(get_session),
) -> dict:
    """获取指定主机的详细信息、性能趋势和 RDP 记录"""
    service = HostDetailService(session)
    return service.get_host_detail(ip)
