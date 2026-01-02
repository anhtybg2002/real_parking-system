import json
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Permission, User
from app.auth.deps import get_current_user  # đổi đúng path của bạn

def _normalize_roles(value):
    # value có thể là list, hoặc string JSON, hoặc None
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            v = json.loads(value)
            return v if isinstance(v, list) else []
        except Exception:
            return []
    return []

def require_page(page_path: str):
    def _guard(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ):
        role = (current_user.role or "").lower().strip()

        # ✅ admin bypass (khuyến nghị)
        if role == "admin":
            return True

        perm = db.query(Permission).filter(Permission.path == page_path).first()
        if not perm:
            raise HTTPException(status_code=403, detail=f"Forbidden: no permission for {page_path}")

        roles = _normalize_roles(perm.roles)
        roles = [(r or "").lower().strip() for r in roles]

        if role not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")

        return True

    return _guard
