from datetime import date, datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.models.vm_rdp_login import VMRdpLogin
from app.schemas.rdp_ingest import RdpIngestRequest, RdpIngestResponse
from app.schemas.rdp_login import RdpLoginListResponse
from app.schemas.rdp_trend import RDPTrendResponse, TrendGranularity
from app.services.rdp_ingest_service import RDPIngestService
from app.services.rdp_login_service import RdpLoginService
from app.services.rdp_trend_service import RDPTrendService

router = APIRouter(prefix="/api/v1/rdp", tags=["rdp"])


@router.get("/trends", response_model=RDPTrendResponse)
def get_rdp_trends(
    granularity: TrendGranularity = Query(default="day"),
    session: Session = Depends(get_session),
) -> RDPTrendResponse:
    service = RDPTrendService(session)
    return service.get_trends(granularity)


@router.get("/logins", response_model=RdpLoginListResponse)
def list_rdp_logins(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> RdpLoginListResponse:
    service = RdpLoginService(session)
    return service.list_logins(limit=limit, offset=offset)


@router.post("/ingest", response_model=RdpIngestResponse)
def ingest_rdp_events(
    payload: RdpIngestRequest,
    session: Session = Depends(get_session),
) -> RdpIngestResponse:
    service = RDPIngestService(session)
    result = service.ingest_events(
        [e.model_dump() for e in payload.events],
        source_ip=payload.source_ip,
    )
    return RdpIngestResponse(**result)




class LogStatsResponse(BaseModel):
    total: int
    today: int
    unique_ips: int
    top_users: list[dict]
    daily_counts: list[dict]

@router.get("/log-stats", response_model=LogStatsResponse)
def get_log_stats(
    days: int = Query(default=30, ge=1, le=365),
    session: Session = Depends(get_session),
) -> LogStatsResponse:
    from app.core.settings import CN_TZ
    from sqlalchemy import func, desc
    from datetime import timedelta

    now = datetime.now(CN_TZ)
    cutoff = now - timedelta(days=days)
    today = now.date()

    # 总量
    total = session.query(func.count(VMRdpLogin.id)).scalar() or 0

    # 今日
    today_cnt = session.query(func.count(VMRdpLogin.id)).filter(
        func.date(VMRdpLogin.login_at) == today
    ).scalar() or 0

    # 唯一IP数
    unique_ips = session.query(func.count(func.distinct(VMRdpLogin.ip))).scalar() or 0

    # Top 用户
    top_users_rows = session.query(
        VMRdpLogin.username, func.count(VMRdpLogin.id).label("cnt")
    ).filter(
        VMRdpLogin.username.isnot(None),
        VMRdpLogin.login_at >= cutoff
    ).group_by(VMRdpLogin.username).order_by(desc("cnt")).limit(10).all()
    top_users = [{"username": r[0], "count": r[1]} for r in top_users_rows]

    # 每日统计
    daily_rows = session.query(
        func.date(VMRdpLogin.login_at).label("d"),
        func.count(VMRdpLogin.id).label("cnt")
    ).filter(
        VMRdpLogin.login_at >= cutoff
    ).group_by("d").order_by("d").all()
    daily_counts = [{"date": str(r[0]), "count": r[1]} for r in daily_rows]

    return LogStatsResponse(total=total, today=today_cnt, unique_ips=unique_ips, top_users=top_users, daily_counts=daily_counts)

class TodayRdpResponse(BaseModel):
    count: int


@router.get("/today", response_model=TodayRdpResponse)
def get_today_rdp(session: Session = Depends(get_session)):
    from app.core.settings import CN_TZ
    from sqlalchemy import func
    today = datetime.now(CN_TZ).date()
    cnt = session.query(func.count(VMRdpLogin.id)).filter(
        func.date(VMRdpLogin.login_at) == today
    ).scalar()
    return TodayRdpResponse(count=cnt or 0)
