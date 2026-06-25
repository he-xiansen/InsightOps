import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.models.user import User


router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# 简单的 Token 存储（内存中，重启后需重新登录）
_tokens: dict[str, dict] = {}
TOKEN_EXPIRE_HOURS = 168


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _generate_token() -> str:
    return secrets.token_hex(32)


def get_current_user(
    authorization: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未登录")
    token = authorization[len("Bearer "):]
    token_data = _tokens.get(token)
    if token_data is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录已过期")
    if datetime.now(UTC) > token_data["expires_at"]:
        _tokens.pop(token, None)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录已过期")
    user = session.get(User, token_data["user_id"])
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要管理员权限")
    return user


class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str = ""


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    username: str
    is_admin: bool


@router.post("/register")
def register(
    payload: RegisterRequest,
    session: Session = Depends(get_session),
) -> dict:
    if not payload.username or len(payload.username.strip()) < 2:
        raise HTTPException(status_code=400, detail="用户名至少 2 个字符")
    if not payload.password or len(payload.password) < 4:
        raise HTTPException(status_code=400, detail="密码至少 4 个字符")

    existing = session.query(User).filter(User.username == payload.username.strip()).first()
    if existing:
        raise HTTPException(status_code=409, detail="用户名已存在")

    user = User(
        username=payload.username.strip(),
        email=payload.email.strip(),
        password_hash=_hash_password(payload.password),
        is_admin=session.query(User).count() == 0,
    )
    session.add(user)
    session.commit()

    token = _generate_token()
    _tokens[token] = {
        "user_id": user.id,
        "expires_at": datetime.now(UTC) + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }

    return {"token": token, "username": user.username, "is_admin": user.is_admin}


@router.post("/login")
def login(
    payload: LoginRequest,
    session: Session = Depends(get_session),
) -> dict:
    user = session.query(User).filter(User.username == payload.username).first()
    if user is None or user.password_hash != _hash_password(payload.password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = _generate_token()
    _tokens[token] = {
        "user_id": user.id,
        "expires_at": datetime.now(UTC) + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }

    return {"token": token, "username": user.username, "is_admin": user.is_admin}


@router.get("/me")
def get_me(user: User = Depends(get_current_user)) -> dict:
    return {
        "username": user.username,
        "nickname": user.nickname or "",
        "email": user.email or "",
        "avatar": user.avatar or "",
        "is_admin": user.is_admin,
        "created_at": user.created_at.isoformat() if user.created_at else "",
    }


class UpdateProfileRequest(BaseModel):
    nickname: str | None = None
    email: str | None = None
    avatar: str | None = None


@router.put("/me")
def update_profile(
    payload: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> dict:
    if payload.nickname is not None:
        user.nickname = payload.nickname
    if payload.email is not None:
        user.email = payload.email
    if payload.avatar is not None:
        user.avatar = payload.avatar
    session.commit()
    return {
        "username": user.username,
        "nickname": user.nickname or "",
        "email": user.email or "",
        "avatar": user.avatar or "",
        "is_admin": user.is_admin,
    }


@router.post("/logout")
def logout(
    authorization: str | None = Header(default=None),
) -> dict:
    if authorization and authorization.startswith("Bearer "):
        _tokens.pop(authorization[len("Bearer "):], None)
    return {"message": "已退出登录"}
