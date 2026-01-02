# app/permissions/schemas.py
from pydantic import BaseModel
from typing import List, Optional

class PermissionBase(BaseModel):
    label: str
    icon: Optional[str] = None
    path: str
    roles: List[str]

class PermissionCreate(PermissionBase):
    pass

class PermissionUpdate(BaseModel):
    label: Optional[str] = None
    icon: Optional[str] = None
    path: Optional[str] = None
    roles: Optional[List[str]] = None

class PermissionOut(PermissionBase):
    id: int

    class Config:
        from_attributes = True
