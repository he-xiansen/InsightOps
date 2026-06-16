from sqlalchemy.orm import Session

from app.models.system_settings import SystemSettings


SYSTEM_SETTINGS_KEYS = {"llm_endpoint", "llm_api_key", "llm_model", "perf_collect_ip_filter"}


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
