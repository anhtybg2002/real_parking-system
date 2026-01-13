# app/parking/routes.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.auth.deps import get_current_user
from .deps import get_db
from . import schemas
from . import crud
from app.models import User, ParkingSlot, Log
from app.permission.guards import require_page
router = APIRouter(prefix="/parking", tags=["Parking"],  dependencies=[Depends(require_page("/dashboard/parking-area"))])


@router.get("/areas/{area_id}/can-edit-map", response_model=schemas.CanEditMapResponse)
def can_edit_map(area_id: int, db: Session = Depends(get_db)):
    occupied_count = crud.count_occupied_slots(db, area_id)
    if occupied_count > 0:
        return schemas.CanEditMapResponse(
            can_edit=False,
            reason="Bãi vẫn còn xe đang đỗ (slot trạng thái OCCUPIED).",
            occupied_count=occupied_count,
        )
    return schemas.CanEditMapResponse(can_edit=True, reason=None, occupied_count=0)


@router.get("/areas", response_model=List[schemas.ParkingAreaOut])
def api_list_parking_areas(
    is_active: Optional[bool] = Query(default=True),
    db: Session = Depends(get_db),
):
    return crud.list_parking_areas(db, is_active=is_active)


@router.get("/areas/{area_id}/map", response_model=schemas.ParkingMapOut)
def api_get_parking_map(area_id: int, db: Session = Depends(get_db)):
    area = crud.get_parking_area(db, area_id)
    if not area:
        raise HTTPException(status_code=404, detail="ParkingArea not found")

    return schemas.ParkingMapOut(
        parking_area_id=area.id,
        name=area.name,
        map_rows=area.map_rows,
        map_cols=area.map_cols,
        cell_size=area.cell_size,
        map_data=crud.parse_map_data(area.map_data),
    )


@router.get("/slots", response_model=List[schemas.ParkingSlotOut])
def api_list_slots(
    parking_area_id: int = Query(...),
    status: Optional[str] = Query(default=None),
    vehicle_type_allowed: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    return crud.list_slots(
        db,
        parking_area_id=parking_area_id,
        status=status,
        vehicle_type_allowed=vehicle_type_allowed,
    )


@router.patch("/slots/{slot_id}", response_model=schemas.ParkingSlotOut)
def api_update_slot(slot_id: int, payload: schemas.ParkingSlotUpdate, db: Session = Depends(get_db)):
    slot = crud.get_slot(db, slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail="ParkingSlot not found")

    data = payload.dict(exclude_unset=True)
    return crud.update_slot(db, slot, data)


@router.post("/slots/{slot_id}/release")
def release_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    slot = db.get(ParkingSlot, slot_id)
    if not slot:
        raise HTTPException(404, "Slot không tồn tại")

    try:
        log = (
            db.query(Log)
            .filter(Log.parking_slot_id == slot_id, Log.exit_time.is_(None))
            .order_by(Log.entry_time.desc())
            .first()
        )
        if log:
            crud.add_slot_event(
                db,
                log_id=log.id,
                vehicle_id=log.vehicle_id,
                parking_area_id=log.parking_area_id,
                event_type="RELEASE",
                from_slot_id=slot_id,
                to_slot_id=None,
                staff_id=current_user.id,
                note="Release slot from map UI",
            )
            log.parking_slot_id = None

        slot.status = "EMPTY"
        db.commit()
        return {"ok": True}
    except Exception:
        db.rollback()
        raise



@router.post("/slots/swap")
def api_swap_slots(
    payload: schemas.ParkingSlotSwapIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.swap_occupied_slots(
        db=db,
        slot_id_a=payload.slot_id_a,
        slot_id_b=payload.slot_id_b,
        current_user=current_user,
    )




@router.get("/unassigned", response_model=List[schemas.UnassignedVehicleOut])
def api_list_unassigned(
    parking_area_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
):
    return crud.list_unassigned_vehicles(db, parking_area_id=parking_area_id)



@router.post("/slots/{slot_id}/assign")
def api_assign_slot(
    slot_id: int,
    payload: schemas.AssignLogIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.assign_unassigned_log_to_slot(db, slot_id=slot_id, log_id=payload.log_id, current_user=current_user)




@router.put("/areas/{area_id}/map", response_model=schemas.ParkingMapOut)
def api_update_parking_map(area_id: int, payload: schemas.ParkingMapUpdate, db: Session = Depends(get_db)):

    if crud.has_occupied_slots(db, area_id):
        raise HTTPException(
            status_code=409,
            detail="Không thể chỉnh sửa/lưu bản đồ khi bãi vẫn còn xe (slot OCCUPIED). "
                   "Vui lòng đưa tất cả xe ra khỏi bãi rồi thử lại."
        )

    area = crud.get_parking_area(db, area_id)

    

    if not area:
        raise HTTPException(status_code=404, detail="ParkingArea not found")

    data = payload.dict(exclude_unset=True)

    # --- rows/cols/cell_size ---
    if "map_rows" in data: area.map_rows = data["map_rows"]
    if "map_cols" in data: area.map_cols = data["map_cols"]
    if "cell_size" in data: area.cell_size = data["cell_size"]

    # --- split cells ---
    map_data = data.get("map_data") or {}
    cells = (map_data.get("cells") or {})

    slot_cells = {}
    infra_cells = {}

    for k, v in cells.items():
        kind = (v or {}).get("kind")
        if kind in ("PARKING_CAR", "PARKING_BIKE"):
            slot_cells[k] = v
        else:
            infra_cells[k] = v

    try:
        # 1) upsert slots
        crud.upsert_slots_from_map(db, area_id=area.id, slot_cells=slot_cells)

        keep_positions = set()
        for key in slot_cells.keys():
            try:
                r, c = key.split("-")
                keep_positions.add((int(r), int(c)))
            except Exception:
                continue

        crud.delete_empty_slots_not_in_map(db, area_id=area.id, keep_positions=keep_positions)

        # 3) lưu map_data chỉ chứa infra
        area.map_data = crud.dump_map_data({"cells": infra_cells, "paths": []})

        db.commit()
        db.refresh(area)
    except Exception as e:
        db.rollback()
        raise

    return schemas.ParkingMapOut(
        parking_area_id=area.id,
        name=area.name,
        map_rows=area.map_rows,
        map_cols=area.map_cols,
        cell_size=area.cell_size,
        map_data=crud.parse_map_data(area.map_data),
    )


@router.post("/areas", response_model=schemas.ParkingMapOut)
def api_create_parking_area(payload: schemas.ParkingAreaCreate, db: Session = Depends(get_db)):
    area = crud.create_parking_area(db, payload)

    return schemas.ParkingMapOut(
        parking_area_id=area.id,
        name=area.name,
        map_rows=area.map_rows,
        map_cols=area.map_cols,
        cell_size=area.cell_size,
        map_data=crud.parse_map_data(area.map_data),
    )


@router.patch("/areas/{area_id}")
def api_toggle_area(area_id: int, payload: schemas.ParkingAreaToggleIn, db: Session = Depends(get_db)):
    # ✅ Optional guard: không cho tắt nếu còn xe
    if payload.is_active is False and crud.has_occupied_slots(db, area_id):
        raise HTTPException(
            status_code=409,
            detail="Không thể tắt bãi khi vẫn còn xe đang đỗ (slot OCCUPIED)."
        )

    area = crud.toggle_parking_area(db, area_id, payload.is_active)
    if not area:
        raise HTTPException(status_code=404, detail="ParkingArea not found")

    return {"ok": True, "id": area.id, "is_active": area.is_active}
