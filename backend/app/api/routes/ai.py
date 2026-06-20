from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.services.ai_advice_service import AIAdviceService


router = APIRouter(prefix="/api/v1/ai", tags=["ai"])


class AdviceRequest(BaseModel):
    hosts: list[dict]


class AdviceItem(BaseModel):
    ip: str
    rating: str
    summary: str
    details: list[str]
    score: int | None = None
    ai_text: str | None = None


class AdviceResponse(BaseModel):
    items: list[AdviceItem]


class TestConnectionResponse(BaseModel):
    ok: bool
    message: str


@router.post("/advice", response_model=AdviceResponse)
def get_ai_advice(
    payload: AdviceRequest,
    session: Session = Depends(get_session),
) -> AdviceResponse:
    service = AIAdviceService(session)
    items = service.get_advice(payload.hosts)
    return AdviceResponse(items=[AdviceItem(**item) for item in items])


@router.post("/test-connection", response_model=TestConnectionResponse)
def test_llm_connection(
    session: Session = Depends(get_session),
) -> TestConnectionResponse:
    service = AIAdviceService(session)
    return TestConnectionResponse(**service.test_connection())
