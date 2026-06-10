from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.settings import Settings


def build_project_session_factory(settings: Settings) -> sessionmaker[Session]:
    engine = create_engine(
        settings.project_database_url,
        future=True,
        pool_pre_ping=True,
    )
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)


def build_zabbix_engine(settings: Settings) -> Engine:
    return create_engine(
        settings.zabbix_database_url,
        future=True,
        pool_pre_ping=True,
    )
