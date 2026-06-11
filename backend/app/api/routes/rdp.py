from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.schemas.rdp_trend import RDPTrendResponse, TrendGranularity
from app.services.rdp_trend_service import RDPTrendService


router = APIRouter(prefix="/api/v1/rdp", tags=["rdp"])


@router.get("/trends", response_model=RDPTrendResponse)
def get_rdp_trends(
    granularity: TrendGranularity = Query(default="day"),
    session: Session = Depends(get_session),
) -> RDPTrendResponse:
    service = RDPTrendService(session)
    return service.get_trends(granularity)
