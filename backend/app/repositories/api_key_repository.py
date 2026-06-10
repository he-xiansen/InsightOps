from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.api_key import APIKey


class APIKeyRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_enabled_by_hash(self, key_hash: str) -> APIKey | None:
        statement = select(APIKey).where(
            APIKey.key_hash == key_hash,
            APIKey.enabled.is_(True),
        )
        return self.session.scalar(statement)
