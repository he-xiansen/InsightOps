from sqlalchemy import create_engine, inspect

from app.models.base import Base
from app.bootstrap.init_project_db import initialize_project_database


def test_initialize_project_database_creates_all_planned_tables() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)

    assert inspect(engine).get_table_names() == []

    initialize_project_database(engine)

    assert set(inspect(engine).get_table_names()) == set(Base.metadata.tables.keys())
