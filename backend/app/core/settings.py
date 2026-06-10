from pydantic import computed_field
from sqlalchemy.engine import URL
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "InsightOps"
    app_env: str = "dev"

    project_db_host: str
    project_db_port: int = 3306
    project_db_user: str
    project_db_password: str
    project_db_name: str

    zabbix_db_host: str
    zabbix_db_port: int = 3306
    zabbix_db_user: str
    zabbix_db_password: str
    zabbix_db_name: str

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
