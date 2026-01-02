# app/site_info/router.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.auth.deps import get_current_user
from app.models import User
from app.site_info.crud import get_site_info, update_site_info

router = APIRouter(prefix="/site-info", tags=["Site Info"])

def require_admin(u: User):
    if u.role != "admin":
        raise HTTPException(403, "Forbidden")

@router.get("")
def api_get_site_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_site_info(db)

@router.put("")
def api_update_site_info(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    return update_site_info(db, payload, updated_by=current_user.id)
