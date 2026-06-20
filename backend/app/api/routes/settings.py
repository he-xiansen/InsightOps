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


class ZabbixTestResponse(BaseModel):
    ok: bool
    message: str


@router.post("/test-zabbix", response_model=ZabbixTestResponse)
def test_zabbix_connection(session: Session = Depends(get_session)):
    """测试 Zabbix 数据库连接"""
    import os
    from urllib.parse import quote_plus
    from sqlalchemy import create_engine, text

    service = SystemSettingsService(session)
    settings = service.get_all_raw()

    host = settings.get("zabbix_db_host", "")
    port = settings.get("zabbix_db_port", "3306")
    user = settings.get("zabbix_db_user", "")
    dbname = settings.get("zabbix_db_name", "zabbix")
    # 密码从环境变量读
    password = os.environ.get("zabbix_db_password", "")

    if not host or not user:
        return {"ok": False, "message": "Zabbix 主机地址或用户未配置"}

    try:
        url = f"mysql+pymysql://{user}:{quote_plus(password)}@{host}:{port}/{dbname}"
        eng = create_engine(url, connect_args={"connect_timeout": 5})
        with eng.connect() as conn:
            cnt = conn.execute(text(
                "SELECT COUNT(*) FROM hosts h JOIN interface i ON i.hostid=h.hostid "
                "WHERE h.status IN (0,1) AND i.ip != '' AND i.ip NOT LIKE '{%' AND i.ip != '127.0.0.1'"
            )).scalar()
        eng.dispose()
        return {"ok": True, "message": f"连接成功 · {cnt} 台主机"}
    except Exception as e:
        return {"ok": False, "message": f"连接失败: {str(e)}"}


class LLMApiKeyResponse(BaseModel):
    api_key: str

@router.get("/llm-api-key", response_model=LLMApiKeyResponse)
def get_llm_api_key(
    session: Session = Depends(get_session),
) -> LLMApiKeyResponse:
    service = SystemSettingsService(session)
    return LLMApiKeyResponse(api_key=service.get_llm_api_key())
