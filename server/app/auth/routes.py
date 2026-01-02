from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db import get_db
from app.auth import schemas
from app import models
from app.auth.security import verify_password, hash_password, create_access_token
from app.auth.deps import get_current_user, require_role

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=schemas.LoginResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db), # hàm get_db trả về db hiện tại, def(a :int, b: string)
):
    user = (
        db.query(models.User)
        .filter(models.User.username == form_data.username)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username or password",
        )
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username or password",
        )

    # đưa role vào token luôn để mấy service khác đọc
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}
    )
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.post("/users", response_model=schemas.UserOut)
def create_user(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin")),  # chỉ admin được tạo
):
    existed = (
        db.query(models.User)
        .filter(models.User.username == user_in.username)
        .first()
    )
    if existed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    user = models.User(
        username=user_in.username,
        full_name=user_in.full_name,
        password_hash=hash_password(user_in.password),
        role=user_in.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/me", response_model=schemas.UserOut)
def read_me(current_user=Depends(get_current_user)):
    return (current_user)
