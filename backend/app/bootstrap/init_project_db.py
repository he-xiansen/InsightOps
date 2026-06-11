from sqlalchemy import Engine

import app.models  # noqa: F401
from app.core.database import build_project_session_factory
from app.core.settings import Settings
from app.models.base import Base


def initialize_project_database(engine: Engine) -> None:
    Base.metadata.create_all(bind=engine)


def main() -> None:
    settings = Settings()
    session_factory = build_project_session_factory(settings)
    initialize_project_database(session_factory.kw["bind"])


if __name__ == "__main__":
    main()
