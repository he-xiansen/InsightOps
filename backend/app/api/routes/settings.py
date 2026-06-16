from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.services.system_settings_service import SystemSettingsService


router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


class SettingsResponse(BaseModel):
    settings: dict[str, str]


class SettingsUpdateRequest(BaseModel):
    settings: dict[str, str]


class SettingsUpdateResponse(BaseModel):
    settings: dict[str, str]


@router.get("", response_model=SettingsResponse)
def get_settings(
    session: Session = Depends(get_session),
) -> SettingsResponse:
    service = SystemSettingsService(session)
    return SettingsResponse(settings=service.get_public_settings())


@router.put("", response_model=SettingsUpdateResponse)
def update_settings(
    payload: SettingsUpdateRequest,
    session: Session = Depends(get_session),
) -> SettingsUpdateResponse:
    service = SystemSettingsService(session)
    return SettingsUpdateResponse(settings=service.update_settings(payload.settings))
