from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.services.idle_export_service import IdleExportService


router = APIRouter(prefix="/api/v1/idle", tags=["idle"])


@router.get("/export")
def export_idle_snapshots(session: Session = Depends(get_session)) -> Response:
    service = IdleExportService(session)
    return Response(
        content=service.export_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="idle-snapshots.csv"'},
    )
