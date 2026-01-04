from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.auth.deps import get_current_user
from app.models import User
from app.vehicle_type import crud
from typing import List
from app.vehicle_type.schemas import VehicleTypeBase

router = APIRouter(prefix="/vehicle-types", tags=["Vehicle Types"])


def require_admin(u: User):
    if u.role != "admin":
        raise HTTPException(403, "Forbidden")


@router.get("")
def api_get_vehicle_types(db: Session = Depends(get_db)):
    return crud.get_all_vehicle_types(db)


@router.put("")
def api_upsert_vehicle_types(
    payload: List[VehicleTypeBase],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    return crud.upsert_vehicle_types(db, [p.dict() for p in payload], updated_by=current_user.id)


@router.post("")
def api_create_vehicle_type(
    payload: VehicleTypeBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    try:
        return crud.create_vehicle_type(db, payload.dict(), updated_by=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{key}")
def api_delete_vehicle_type(
    key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    ok = crud.delete_vehicle_type_by_key(db, key)
    if not ok:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}
