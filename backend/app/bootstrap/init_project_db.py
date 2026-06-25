import sys

from sqlalchemy import Engine, text

import app.models  # noqa: F401
from app.core.database import build_project_session_factory, get_project_settings
from app.models.base import Base


def initialize_project_database(engine: Engine) -> None:
    print("[init-db] Creating tables...", flush=True)
    Base.metadata.create_all(bind=engine)
    print("[init-db] Done.", flush=True)


def main() -> None:
    try:
        settings = get_project_settings()
        print(f"[init-db] Connecting to {settings.project_db_host}...", flush=True)
        sf = build_project_session_factory(settings)
        initialize_project_database(sf.kw["bind"])
    except Exception as e:
        print(f"[init-db] FAIL: {e}", flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
