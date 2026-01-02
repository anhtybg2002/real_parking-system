
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Permission
from app.permission.schemas import (
    PermissionCreate,
    PermissionUpdate,
    PermissionOut,
)
from app.auth.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/admin/permissions", tags=["Permissions"])


@router.post("", response_model=PermissionOut)
def create_permission(
    payload: PermissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(403, "Forbidden")

    exists = db.query(Permission).filter(Permission.path == payload.path).first()
    if exists:
        raise HTTPException(400, "Path already exists")

    perm = Permission(**payload.model_dump())
    db.add(perm)
    db.commit()
    db.refresh(perm)
    return perm


@router.get("", response_model=list[PermissionOut])
def list_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(403, "Forbidden")

    return db.query(Permission).order_by(Permission.id).all()

@router.get("/me")
def my_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = current_user.role

    rows = db.query(Permission).all()

    rows = [
        r for r in rows
        if isinstance(r.roles, list) and role in r.roles
    ]

    return {
        "allowed_paths": [r.path for r in rows],
        "menus": [
            {
                "label": r.label,
                "icon": r.icon,
                "path": r.path,
            }
            for r in rows
        ],
    }



@router.get("/{perm_id}", response_model=PermissionOut)
def get_permission(
    perm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(403, "Forbidden")

    perm = db.query(Permission).get(perm_id)
    if not perm:
        raise HTTPException(404, "Permission not found")
    return perm


@router.put("/{perm_id}", response_model=PermissionOut)
def update_permission(
    perm_id: int,
    payload: PermissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(403, "Forbidden")

    perm = db.query(Permission).get(perm_id)
    if not perm:
        raise HTTPException(404, "Permission not found")

    data = payload.model_dump(exclude_unset=True)

    # check path trùng
    if "path" in data:
        exists = (
            db.query(Permission)
            .filter(Permission.path == data["path"], Permission.id != perm_id)
            .first()
        )
        if exists:
            raise HTTPException(400, "Path already exists")

    for k, v in data.items():
        setattr(perm, k, v)

    db.commit()
    db.refresh(perm)
    return perm


@router.delete("/{perm_id}")
def delete_permission(
    perm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(403, "Forbidden")

    perm = db.query(Permission).get(perm_id)
    if not perm:
        raise HTTPException(404, "Permission not found")

    db.delete(perm)
    db.commit()
    return {"ok": True}

