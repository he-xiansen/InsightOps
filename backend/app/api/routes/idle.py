from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.services.idle_export_service import IdleExportService
from app.schemas.vm_asset import IdleVMListResponse
from app.services.idle_analysis_service import IdleAnalysisService


router = APIRouter(prefix="/api/v1/idle", tags=["idle"])


@router.get("", response_model=IdleVMListResponse)
def list_idle_snapshots(session: Session = Depends(get_session)) -> IdleVMListResponse:
    service = IdleAnalysisService(session)
    return service.list_idle_assets()


@router.get("/export")
def export_idle_snapshots(session: Session = Depends(get_session)) -> Response:
    service = IdleExportService(session)
    return Response(
        content=service.export_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="idle-snapshots.csv"'},
    )
