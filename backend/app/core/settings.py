from typing import TypeVar

from pydantic import ValidationError, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


SettingsT = TypeVar("SettingsT", bound=BaseSettings)


class MissingSettingsError(RuntimeError):
    def __init__(self, *, scope: str, fields: list[str]) -> None:
        self.scope = scope
        self.fields = fields
        super().__init__(self.message)

    @property
    def message(self) -> str:
        return f"Missing required {self.scope} settings."


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "InsightOps"
    app_env: str = "dev"

    @staticmethod
    def _build_database_url(
        *,
        username: str,
        password: str,
        host: str,
        port: int,
        database: str,
    ) -> str:
        return URL.create(
            drivername="mysql+pymysql",
            username=username,
            password=password,
            host=host,
            port=port,
            database=database,
        ).render_as_string(hide_password=False)


class ProjectDatabaseSettings(AppSettings):
    project_db_host: str
    project_db_port: int = 3306
    project_db_user: str
    project_db_password: str
    project_db_name: str

    @computed_field
    @property
    def project_database_url(self) -> str:
        return self._build_database_url(
            username=self.project_db_user,
            password=self.project_db_password,
            host=self.project_db_host,
            port=self.project_db_port,
            database=self.project_db_name,
        )


class ZabbixDatabaseSettings(AppSettings):
    zabbix_db_host: str
    zabbix_db_port: int = 3306
    zabbix_db_user: str
    zabbix_db_password: str
    zabbix_db_name: str

    @computed_field
    @property
    def zabbix_database_url(self) -> str:
        return self._build_database_url(
            username=self.zabbix_db_user,
            password=self.zabbix_db_password,
            host=self.zabbix_db_host,
            port=self.zabbix_db_port,
            database=self.zabbix_db_name,
        )


class Settings(ProjectDatabaseSettings, ZabbixDatabaseSettings):
    pass


def load_settings(settings_type: type[SettingsT], *, scope: str) -> SettingsT:
    try:
        return settings_type()
    except ValidationError as exc:
        missing_fields = sorted(
            {
                str(error["loc"][0])
                for error in exc.errors()
                if error["type"] == "missing" and error["loc"]
            }
        )
        raise MissingSettingsError(scope=scope, fields=missing_fields) from exc

from datetime import timezone, timedelta

CN_TZ = timezone(timedelta(hours=8), "Asia/Shanghai")
