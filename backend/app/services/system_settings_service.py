from sqlalchemy.orm import Session

from app.repositories.system_settings_repository import SystemSettingsRepository


class SystemSettingsService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = SystemSettingsRepository(session)

    def get_public_settings(self) -> dict:
        """返回设置（屏蔽 API Key 明文）"""
        import os
        all_settings = self.repository.get_all()
        # 密码从环境变量补充默认值
        pwd = all_settings.get("zabbix_db_password")
        if (pwd is None or pwd == "") and os.environ.get("zabbix_db_password"):
            all_settings["zabbix_db_password"] = os.environ["zabbix_db_password"]
        result = {}
        for key in self.repository.get_allowed_keys():
            if key == "llm_api_key":
                val = all_settings.get(key, "")
                result[key] = "••••••" if val else ""
            elif key == "zabbix_db_password":
                result[key] = all_settings.get(key, "")
            else:
                result[key] = all_settings.get(key, "")
        return result


    def get_all_raw(self) -> dict:
        """返回所有设置原始值，密码类从环境变量补充默认值"""
        import os
        settings = self.repository.get_all()
        # 如果数据库密码不存在或为空，从环境变量补
        pwd = settings.get("zabbix_db_password")
        if (pwd is None or pwd == "") and os.environ.get("zabbix_db_password"):
            settings["zabbix_db_password"] = os.environ["zabbix_db_password"]
        return settings

    def get_llm_api_key(self) -> str:
        """返回真实的 LLM API Key（非掩码）"""
        return self.repository.get("llm_api_key").value if self.repository.get("llm_api_key") else ""

    def update_settings(self, settings: dict) -> dict:
        for key, value in settings.items():
            if key in self.repository.get_allowed_keys():
                self.repository.set(key, value)
        self.session.commit()
        return self.get_public_settings()
