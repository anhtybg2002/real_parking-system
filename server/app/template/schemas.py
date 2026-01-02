# app/settings/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class TemplateOut(BaseModel):
    key: str
    subject: Optional[str] = None
    body: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class TemplateUpdate(BaseModel):
    subject: Optional[str] = None
    body: str = Field(..., min_length=1)
    description: Optional[str] = None

class TemplateRenderIn(BaseModel):
    data: Optional[Dict[str, Any]] = None

    
    template_subject: Optional[str] = None
    template_body: Optional[str] = None

class TemplateRenderOut(BaseModel):
    key: str
    subject: Optional[str] = None
    body: str

class SendTestEmailIn(BaseModel):
    to_email: str
    data: Dict[str, Any] = {}
