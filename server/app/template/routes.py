# app/settings/routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.auth.deps import get_current_user
from app.models import User  # user model của bạn
from app.db import get_db
from . import schemas, crud
from .render import render_template
from app.models import SiteInfo
router = APIRouter(prefix="/settings/templates", tags=["Settings - Templates"])

ALLOWED_KEYS = {"invoice_print", "monthly_expiry_email", "entry_ticket_print"}

def require_admin(user: User):
    # bạn đổi logic theo RBAC của bạn (role admin/manager)
    if getattr(user, "role", None) not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Không có quyền thao tác template.")
    return user

@router.get("", response_model=List[schemas.TemplateOut])
def api_list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    return crud.list_templates(db)

@router.get("/{key}", response_model=schemas.TemplateOut)
def api_get_template(
    key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    if key not in ALLOWED_KEYS:
        raise HTTPException(404, "Template key không hợp lệ")

    tpl = crud.ensure_template_exists(db, key)
    if not tpl:
        raise HTTPException(404, "Template not found")
    return tpl

@router.put("/{key}", response_model=schemas.TemplateOut)
def api_update_template(
    key: str,
    payload: schemas.TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    if key not in ALLOWED_KEYS:
        raise HTTPException(404, "Template key không hợp lệ")

    tpl = crud.upsert_template(
        db=db,
        key=key,
        subject=payload.subject,
        body=payload.body,
        description=payload.description,
        user_id=current_user.id,
    )
    return tpl

@router.post("/{key}/reset", response_model=schemas.TemplateOut)
def api_reset_template(
    key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    if key not in ALLOWED_KEYS:
        raise HTTPException(404, "Template key không hợp lệ")

    tpl = crud.reset_template_to_default(db, key, user_id=current_user.id)
    if not tpl:
        raise HTTPException(404, "Không có default cho template này")
    return tpl


def get_site_info_dict(db: Session) -> dict:
    row = db.query(SiteInfo).filter(SiteInfo.id == 1).first()
    return row.value if row and isinstance(row.value, dict) else {}

@router.post("/{key}/render", response_model=schemas.TemplateRenderOut)
def api_render_template(
    key: str,
    payload: schemas.TemplateRenderIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)

    tpl = crud.ensure_template_exists(db, key)

    data = payload.data or {}

    # inject site_info
    site = get_site_info_dict(db)
    data = {**data, **site}  # site override (khuyến nghị)

    # ✅ dùng override nếu có
    subject_tpl = payload.template_subject if payload.template_subject is not None else (tpl.subject or "")
    body_tpl = payload.template_body if payload.template_body is not None else (tpl.body or "")

    subject = render_template(subject_tpl, data) if subject_tpl else None
    body = render_template(body_tpl, data)

    return schemas.TemplateRenderOut(key=key, subject=subject, body=body)




@router.post("/{key}/send-test")
def api_send_test_email(
    key: str,
    payload: schemas.SendTestEmailIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    if key != "monthly_expiry_email":
        raise HTTPException(400, "Chỉ hỗ trợ gửi test cho template email vé tháng")

    tpl = crud.ensure_template_exists(db, key)
    if not tpl:
        raise HTTPException(404, "Template not found")

    subject = render_template(tpl.subject or "", payload.data or {})
    body = render_template(tpl.body, payload.data or {})

    # TODO: tích hợp mailer của bạn
    # mailer.send(to=payload.to_email, subject=subject, body=body)

    return {"ok": True, "to": payload.to_email, "subject": subject}
