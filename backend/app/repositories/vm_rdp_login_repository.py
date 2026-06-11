from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
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
