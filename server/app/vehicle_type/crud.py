from sqlalchemy.orm import Session
from app.models import VehicleType
from typing import List


def get_all_vehicle_types(db: Session) -> List[dict]:
    rows = db.query(VehicleType).order_by(VehicleType.id).all()
    return [
        {"id": r.id, "key": r.key, "label": r.label, "enabled": bool(r.enabled), "icons": r.icons} for r in rows
    ]


def upsert_vehicle_types(db: Session, payload: List[dict], updated_by: int | None = None) -> List[dict]:
    # payload: list of { key, label, enabled }
    keys = {p["key"] for p in payload}
    existing = {r.key: r for r in db.query(VehicleType).filter(VehicleType.key.in_(list(keys))).all()}

    # update or create
    for p in payload:
        k = p.get("key")
        lbl = p.get("label")
        en = bool(p.get("enabled", True))
        icons = p.get("icons") if "icons" in p else None
        if k in existing:
            row = existing[k]
            row.label = lbl
            row.enabled = en
            row.icons = icons
            row.updated_by = updated_by
        else:
            row = VehicleType(key=k, label=lbl, enabled=en, icons=icons, updated_by=updated_by)
            db.add(row)

    # optionally remove vehicle types not present in payload
    # find rows to delete
    to_delete = db.query(VehicleType).filter(~VehicleType.key.in_(list(keys))).all()
    for r in to_delete:
        db.delete(r)

    db.commit()

    return get_all_vehicle_types(db)


def create_vehicle_type(db: Session, payload: dict, updated_by: int | None = None) -> dict:
    key = payload.get("key")
    label = payload.get("label")
    enabled = bool(payload.get("enabled", True))
    icons = payload.get("icons") if "icons" in payload else None
    exists = db.query(VehicleType).filter(VehicleType.key == key).first()
    if exists:
        raise ValueError("Vehicle type with this key already exists")
    row = VehicleType(key=key, label=label, enabled=enabled, icons=icons, updated_by=updated_by)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "key": row.key, "label": row.label, "enabled": bool(row.enabled), "icons": row.icons}


def delete_vehicle_type_by_key(db: Session, key: str):
    row = db.query(VehicleType).filter(VehicleType.key == key).first()
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True
