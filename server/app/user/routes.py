from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app import models
from app.db import get_db
from app.user.schemas import UserCreate, UserUpdate, UserOut
from app.auth.security import hash_password
from app.auth.deps import require_role  
from app.permission.guards import require_page
router = APIRouter(
    prefix="/users",
    tags=["users"],
    dependencies=[Depends(require_page("/dashboard/staff"))]
)

@router.get("/options")
def user_options(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    users = (
        db.query(models.User.id, models.User.full_name)
        .filter(models.User.is_active.is_(True))
        .order_by(models.User.full_name.asc())
        .all()
    )

    return [
        {
            "id": u.id,
            "full_name": u.full_name or f"User #{u.id}",
        }
        for u in users
    ]


@router.get("/", response_model=List[UserOut])
def list_users(
    search: Optional[str] = Query(None, description="Tìm theo tên / username / email / SĐT"),
    role: Optional[str] = Query(None, description="Lọc theo vai trò: admin / staff"),
    status_filter: Optional[str] = Query(
        None, alias="status", description="Lọc theo trạng thái: active / inactive"
    ),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")), 
):
    query = db.query(models.User)

    if search:
        s = f"%{search.lower()}%"
        query = query.filter(
            (models.User.full_name.ilike(s)) |
            (models.User.username.ilike(s)) |
            (models.User.email.ilike(s)) |
            (models.User.phone.ilike(s))
        )

    if role in ("admin", "staff"):
        query = query.filter(models.User.role == role)

    if status_filter == "active":
        query = query.filter(models.User.is_active.is_(True))
    elif status_filter == "inactive":
        query = query.filter(models.User.is_active.is_(False))

    users = query.order_by(models.User.id.asc()).all()
    return users


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
   
    if (
        payload.username 
        and db.query(models.User).filter(models.User.username == payload.username).first()
    ):
        raise HTTPException(
            status_code=400,
            detail="Tên đăng nhập đã tồn tại."
        )

    
    if (
        payload.email 
        and db.query(models.User).filter(models.User.email == payload.email).first()
    ):
        raise HTTPException(
            status_code=400,
            detail="Email đã tồn tại."
        )

    
    if (
        payload.phone 
        and db.query(models.User).filter(models.User.phone == payload.phone).first()
    ):
        raise HTTPException(
            status_code=400,
            detail="Số điện thoại đã tồn tại."
        )

    
    plain_pw = payload.password
    if len(plain_pw) > 72:
        plain_pw = plain_pw[:72]

    user = models.User(
        username=payload.username,
        password_hash=hash_password(plain_pw),
        full_name=payload.full_name,
        phone=payload.phone,
        email=payload.email,
        role=payload.role or "staff",
        is_active=payload.is_active,
    )

    db.add(user)
    db.commit()
    db.refresh(user)
    return user



@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")), 
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên.")
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),  
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên.")

    if payload.full_name is not None:
        user.full_name = payload.full_name

    if payload.phone is not None:
        user.phone = payload.phone

    if payload.email is not None:
        user.email = payload.email

    if payload.role is not None:
        if payload.role not in ("admin", "staff"):
            raise HTTPException(
                status_code=400,
                detail="Vai trò không hợp lệ. Chỉ chấp nhận: admin, staff.",
            )
        user.role = payload.role

    if payload.is_active is not None:
        user.is_active = payload.is_active

    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/toggle-active", response_model=UserOut)
def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),  
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên.")

    user.is_active = not bool(user.is_active)
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("admin")),
):
    # tìm user cần xóa
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên.")

    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Không thể tự xóa tài khoản của chính bạn.",
        )

    
    if user.role == "admin":
        raise HTTPException(
            status_code=400,
            detail="Không thể xóa tài khoản có vai trò admin.",
        )

    # Thực hiện xóa
    db.delete(user)
    db.commit()

    return {"ok": True, "message": "Đã xóa nhân viên thành công."}


