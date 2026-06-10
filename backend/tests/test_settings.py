from app.core.database import build_project_session_factory, build_zabbix_engine
from app.core.settings import Settings


def build_settings() -> Settings:
    return Settings(
        app_name="InsightOps",
        app_env="test",
        project_db_host="project-mysql",
        project_db_port=3306,
        project_db_user="insightops",
        project_db_password="secret",
        project_db_name="insightops",
        zabbix_db_host="zbx-mysql",
        zabbix_db_port=3306,
        zabbix_db_user="readonly",
        zabbix_db_password="readonly-secret",
        zabbix_db_name="zabbix",
    )


def test_settings_build_database_urls() -> None:
    settings = build_settings()

    assert settings.project_database_url.startswith("mysql+pymysql://insightops:")
    assert settings.project_database_url.endswith("@project-mysql:3306/insightops")
    assert settings.zabbix_database_url.startswith("mysql+pymysql://readonly:")
    assert settings.zabbix_database_url.endswith("@zbx-mysql:3306/zabbix")


def test_database_factories_use_settings_urls() -> None:
    settings = build_settings()

    session_factory = build_project_session_factory(settings)
    zabbix_engine = build_zabbix_engine(settings)

    assert (
        session_factory.kw["bind"].url.render_as_string(hide_password=False)
        == settings.project_database_url
    )
    assert zabbix_engine.url.render_as_string(hide_password=False) == settings.zabbix_database_url
