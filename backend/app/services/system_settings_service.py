from sqlalchemy.orm import Session

from app.repositories.system_settings_repository import SystemSettingsRepository


class SystemSettingsService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = SystemSettingsRepository(session)

    def get_public_settings(self) -> dict:
        """返回设置（屏蔽 API Key 明文）"""
        all_settings = self.repository.get_all()
        result = {}
        for key in self.repository.get_allowed_keys():
            if key == "llm_api_key":
                val = all_settings.get(key, "")
                result[key] = "••••••" if val else ""
            else:
                result[key] = all_settings.get(key, "")
        return result

    def update_settings(self, settings: dict) -> dict:
        for key, value in settings.items():
            if key in self.repository.get_allowed_keys():
                self.repository.set(key, value)
        self.session.commit()
        return self.get_public_settings()
