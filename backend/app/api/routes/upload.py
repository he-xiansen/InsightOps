import hashlib
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.core.database import get_session
from app.models.user import User


router = APIRouter(prefix="/api/v1/upload", tags=["upload"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
UPLOAD_DIR = Path("/app/backend/uploads")


@router.post("/avatar")
def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> dict:
    # 校验文件类型
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="仅支持 jpg/jpeg/png/gif/webp 格式")

    # 读取文件内容
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="文件大小不能超过 5MB")

    # 生成唯一文件名
    file_hash = hashlib.md5(content).hexdigest()
    filename = f"avatar_{user.id}_{file_hash}{ext}"
    filepath = UPLOAD_DIR / filename

    # 保存文件
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(content)

    # 更新用户头像
    avatar_url = f"/uploads/{filename}"
    user.avatar = avatar_url
    session.commit()

    return {"avatar": avatar_url}
