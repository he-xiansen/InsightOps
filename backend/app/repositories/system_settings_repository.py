from sqlalchemy.orm import Session

from app.models.system_settings import SystemSettings


SYSTEM_SETTINGS_KEYS = {
    "llm_endpoint", "llm_api_key", "llm_model",
    "perf_collect_ip_filter",
    "perf_collect_interval",
    "idle_analysis_interval",
    "perf_retention_days",
    "rdp_retention_days",
    # Zabbix 数据库连接
    "zabbix_db_host",
    "zabbix_db_port",
    "zabbix_db_user",
    "zabbix_db_name",
}


class SystemSettingsRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, key: str) -> SystemSettings | None:
        return self.session.get(SystemSettings, key)

    def set(self, key: str, value: str) -> SystemSettings:
        setting = self.session.get(SystemSettings, key)
        if setting is None:
            setting = SystemSettings(key=key, value=value)
            self.session.add(setting)
        else:
            setting.value = value
        return setting

    def get_all(self) -> dict[str, str]:
        settings = self.session.query(SystemSettings).all()
        return {s.key: s.value for s in settings}

    def get_allowed_keys(self) -> set:
        return SYSTEM_SETTINGS_KEYS
