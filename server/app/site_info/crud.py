# app/site_info/crud.py
from sqlalchemy.orm import Session
from app.models import SiteInfo


DEFAULT_SITE_INFO = {
    "site_name": "Hệ thống quản lý đỗ xe",
    "site_phone": "",
    "site_address": "",
    "invoice_note": "Giữ vé cẩn thận – mất vé phạt theo quy định",
}


def get_site_info(db: Session):
    row = db.query(SiteInfo).first()
    if not row:
        row = SiteInfo(id=1, value=DEFAULT_SITE_INFO)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row.value

def update_site_info(db: Session, payload: dict, updated_by: int | None = None):
    row = db.query(SiteInfo).first()
    if not row:
        row = SiteInfo(id=1, value=DEFAULT_SITE_INFO)
        db.add(row)
        db.commit()
        db.refresh(row)

    cur = row.value or {}
    row.value = {**cur, **payload}
    row.updated_by = updated_by
    db.commit()
    db.refresh(row)
    return row.value
