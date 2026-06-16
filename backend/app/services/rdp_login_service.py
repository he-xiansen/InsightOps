from sqlalchemy.orm import Session

from app.repositories.vm_rdp_login_repository import VMRdpLoginRepository
from app.schemas.rdp_login import RdpLoginItem, RdpLoginListResponse


class RdpLoginService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = VMRdpLoginRepository(session)

    def list_logins(self, limit: int = 50, offset: int = 0) -> RdpLoginListResponse:
        logins = self.repository.list_recent(limit=limit, offset=offset)
        total = self.repository.count_all()
        return RdpLoginListResponse(
            items=[
                RdpLoginItem(
                    id=login.id,
                    ip=login.ip,
                    login_at=login.login_at,
                    username=login.username,
                )
                for login in logins
            ],
            total=total,
        )
