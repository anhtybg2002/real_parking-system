# app/settings/crud.py
from sqlalchemy.orm import Session
from app.models import Template
from .defaults import DEFAULT_TEMPLATES

def list_templates(db: Session):
    return db.query(Template).order_by(Template.key.asc()).all()

def get_template(db: Session, key: str):
    return db.query(Template).filter(Template.key == key).first()

def upsert_template(db: Session, key: str, subject: str | None, body: str, description: str | None, user_id: int | None):
    tpl = get_template(db, key)
    if not tpl:
        tpl = Template(key=key, subject=subject, body=body, description=description, updated_by=user_id)
        db.add(tpl)
    else:
        tpl.subject = subject
        tpl.body = body
        tpl.description = description
        tpl.updated_by = user_id
    db.commit()
    db.refresh(tpl)
    return tpl

def reset_template_to_default(db: Session, key: str, user_id: int | None):
    if key not in DEFAULT_TEMPLATES:
        return None
    d = DEFAULT_TEMPLATES[key]
    return upsert_template(
        db=db,
        key=key,
        subject=d.get("subject"),
        body=d["body"],
        description=d.get("description"),
        user_id=user_id,
    )

def ensure_template_exists(db: Session, key: str):
    tpl = get_template(db, key)
    if tpl:
        return tpl
    # auto-create from default if available
    if key in DEFAULT_TEMPLATES:
        d = DEFAULT_TEMPLATES[key]
        tpl = Template(key=key, subject=d.get("subject"), body=d["body"], description=d.get("description"))
        db.add(tpl)
        db.commit()
        db.refresh(tpl)
        return tpl
    return None
