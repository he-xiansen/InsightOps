from pydantic import computed_field
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

    @computed_field
    @property
    def project_database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.project_db_user}:{self.project_db_password}"
            f"@{self.project_db_host}:{self.project_db_port}/{self.project_db_name}"
        )

    @computed_field
    @property
    def zabbix_database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.zabbix_db_user}:{self.zabbix_db_password}"
            f"@{self.zabbix_db_host}:{self.zabbix_db_port}/{self.zabbix_db_name}"
        )
