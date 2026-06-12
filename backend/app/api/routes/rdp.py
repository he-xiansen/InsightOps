from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_session
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
    result = service.ingest_events([e.model_dump() for e in payload.events])
    return RdpIngestResponse(**result)
