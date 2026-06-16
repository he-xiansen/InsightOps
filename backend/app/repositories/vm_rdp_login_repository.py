from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.vm_rdp_login import VMRdpLogin


class VMRdpLoginRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_raw_event_hash(self, raw_event_hash: str) -> VMRdpLogin | None:
        statement = select(VMRdpLogin).where(VMRdpLogin.raw_event_hash == raw_event_hash)
        return self.session.scalar(statement)

    def add_if_absent(self, payload: dict[str, object]) -> tuple[bool, VMRdpLogin]:
        raw_event_hash = str(payload["raw_event_hash"])
        existing = self.get_by_raw_event_hash(raw_event_hash)
        if existing is not None:
            return False, existing

        login = VMRdpLogin(**payload)
        try:
            with self.session.begin_nested():
                self.session.add(login)
                self.session.flush()
        except IntegrityError:
            existing = self.get_by_raw_event_hash(raw_event_hash)
            if existing is None:
                raise
            return False, existing

        return True, login

    def list_recent(self, limit: int = 50, offset: int = 0) -> list[VMRdpLogin]:
        from sqlalchemy import select

        statement = (
            select(VMRdpLogin)
            .order_by(VMRdpLogin.login_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.session.scalars(statement))

    def count_all(self) -> int:
        from sqlalchemy import select, func

        statement = select(func.count()).select_from(VMRdpLogin)
        return self.session.scalar(statement) or 0
