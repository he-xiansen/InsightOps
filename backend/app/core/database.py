from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.settings import (
    ProjectDatabaseSettings,
    Settings,
    ZabbixDatabaseSettings,
    load_settings,
)


def build_project_session_factory(
    settings: ProjectDatabaseSettings | Settings,
) -> sessionmaker[Session]:
    engine = create_engine(
        settings.project_database_url,
        future=True,
        pool_pre_ping=True,
    )
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)


def build_zabbix_engine(settings: ZabbixDatabaseSettings | Settings) -> Engine:
    return create_engine(
        settings.zabbix_database_url,
        future=True,
        pool_pre_ping=True,
    )


@lru_cache
def get_settings() -> Settings:
    return load_settings(Settings, scope="application")


@lru_cache
def get_project_settings() -> ProjectDatabaseSettings:
    return load_settings(ProjectDatabaseSettings, scope="project database")


@lru_cache
def get_zabbix_settings() -> ZabbixDatabaseSettings:
    return load_settings(ZabbixDatabaseSettings, scope="zabbix database")


@lru_cache
def get_project_session_factory() -> sessionmaker[Session]:
    return build_project_session_factory(get_project_settings())


def get_session() -> Generator[Session, None, None]:
    session_factory = get_project_session_factory()
    with session_factory() as session:
        yield session
