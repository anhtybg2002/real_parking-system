# app/schemas/user.py
from pydantic import BaseModel, EmailStr
from typing import Optional


class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    role: str = "staff"
    is_active: bool = True


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    role: str = "staff"
    is_active: bool = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    id: int
    username: str
    full_name: Optional[str]
    phone: Optional[str]
    email: Optional[EmailStr]
    role: str
    is_active: bool

    class Config:
        orm_mode = True
