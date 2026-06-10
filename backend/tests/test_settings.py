from sqlalchemy.engine import make_url

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

    project_url = make_url(settings.project_database_url)
    zabbix_url = make_url(settings.zabbix_database_url)

    assert project_url.drivername == "mysql+pymysql"
    assert project_url.username == "insightops"
    assert project_url.password == "secret"
    assert project_url.host == "project-mysql"
    assert project_url.port == 3306
    assert project_url.database == "insightops"
    assert zabbix_url.drivername == "mysql+pymysql"
    assert zabbix_url.username == "readonly"
    assert zabbix_url.password == "readonly-secret"
    assert zabbix_url.host == "zbx-mysql"
    assert zabbix_url.port == 3306
    assert zabbix_url.database == "zabbix"


def test_settings_escape_special_characters_in_database_urls() -> None:
    settings = Settings(
        project_db_host="project-mysql",
        project_db_user="user+name@example.com",
        project_db_password="p@ss:/?#[]!$&'()*+,;=",
        project_db_name="insightops",
        zabbix_db_host="zbx-mysql",
        zabbix_db_user="readonly+svc",
        zabbix_db_password="r:o@/[]?#",
        zabbix_db_name="zabbix",
    )

    project_url = make_url(settings.project_database_url)
    zabbix_url = make_url(settings.zabbix_database_url)

    assert project_url.username == "user+name@example.com"
    assert project_url.password == "p@ss:/?#[]!$&'()*+,;="
    assert zabbix_url.username == "readonly+svc"
    assert zabbix_url.password == "r:o@/[]?#"


def test_database_factories_use_settings_urls(monkeypatch) -> None:
    settings = build_settings()
    captured_calls: list[tuple[str, dict[str, object]]] = []

    def fake_create_engine(url: str, **kwargs: object) -> str:
        captured_calls.append((url, kwargs))
        return f"engine:{len(captured_calls)}"

    monkeypatch.setattr("app.core.database.create_engine", fake_create_engine)

    session_factory = build_project_session_factory(settings)
    zabbix_engine = build_zabbix_engine(settings)

    assert session_factory.kw["bind"] == "engine:1"
    assert session_factory.kw["autoflush"] is False
    assert session_factory.kw["autocommit"] is False
    assert zabbix_engine == "engine:2"
    assert captured_calls == [
        (
            settings.project_database_url,
            {"future": True, "pool_pre_ping": True},
        ),
        (
            settings.zabbix_database_url,
            {"future": True, "pool_pre_ping": True},
        ),
    ]
