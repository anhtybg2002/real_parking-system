# app/in_out/routes.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from app.db import get_db
from app.models import User, ParkingArea, Log, Vehicle, ParkingSlot
from app.auth.deps import get_current_user
from app.pricing.deps import calculate_fee_for_log

from .schemas import VehicleEntryIn, VehicleExitIn, LogOut, ParkingAreaOut
from . import crud
from app.parking.crud import list_parking_areas
from app.permission.guards import require_page
router = APIRouter(prefix="/inout", tags=["InOut"],dependencies=[Depends(require_page("/dashboard/inout"))])


# ========================== ENTRY ================================
@router.post("/entry", status_code=201)
def vehicle_entry(
    payload: VehicleEntryIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plate = payload.license_plate_number.strip().upper()
    vtype = payload.vehicle_type  # "car" | "motorbike"
    area_id = payload.parking_area_id

    # 1) Check area
    area = db.query(ParkingArea).filter(ParkingArea.id == area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="Bãi xe không tồn tại")
    # Không cho ghi nhận xe vào bãi đã tắt
    if area.is_active is False:
        raise HTTPException(status_code=400, detail="Bãi xe đang tắt, không thể ghi nhận xe vào")

    # 2) Kiểm tra xe đang trong bãi (tránh trùng log active)
    existing_log = (
        db.query(Log)
        .join(Vehicle, Vehicle.id == Log.vehicle_id)
        .filter(
            Vehicle.license_plate_number == plate,
            Log.log_type == "parking",
            Log.exit_time.is_(None),
        )
        .first()
    )
    if existing_log:
        raise HTTPException(status_code=409, detail=f"Xe {plate} hiện đang đỗ trong bãi!")

    # 3) Tìm slot trống phù hợp (FE có thể gửi preferred_slot_id)
    slot = None

    if payload.preferred_slot_id:
        slot = (
            db.query(ParkingSlot)
            .filter(
                ParkingSlot.id == payload.preferred_slot_id,
                ParkingSlot.parking_area_id == area_id,
                ParkingSlot.status == "EMPTY",
            )
            .first()
        )
        if not slot:
            raise HTTPException(status_code=400, detail="Slot được chọn không còn trống hoặc không thuộc bãi này")
        if slot.vehicle_type_allowed != vtype:
            raise HTTPException(status_code=400, detail="Slot được chọn không phù hợp loại xe")
    else:
        # Auto pick
        slot = (
            db.query(ParkingSlot)
            .filter(
                ParkingSlot.parking_area_id == area_id,
                ParkingSlot.status == "EMPTY",
                ParkingSlot.vehicle_type_allowed == vtype,
            )
            .order_by(ParkingSlot.row.asc(), ParkingSlot.col.asc())
            .first()
        )

    if not slot:
        raise HTTPException(status_code=400, detail="Không còn chỗ trống phù hợp")

    # 4) Tìm hoặc tạo vehicle (CHỈ làm sau khi chắc chắn có slot)
    vehicle = db.query(Vehicle).filter(Vehicle.license_plate_number == plate).first()
    if not vehicle:
        vehicle = Vehicle(license_plate_number=plate, vehicle_type=vtype)
        db.add(vehicle)
        db.flush()
    else:
        if vehicle.vehicle_type != vtype:
            vehicle.vehicle_type = vtype

    # 5) Tạo log + gán slot
    log = Log(
        log_type="parking",
        vehicle_id=vehicle.id,
        parking_area_id=area.id,
        parking_slot_id=slot.id,
        entry_staff_id=current_user.id,
        entry_time=datetime.utcnow(),
        entry_plate_image=payload.entry_plate_image_base64,
    )
    db.add(log)

    # 6) Update slot + count
    slot.status = "OCCUPIED"
    area.current_count = (area.current_count or 0) + 1

    db.commit()
    db.refresh(log)
    db.refresh(vehicle)
    db.refresh(area)

    return {
        "ok": True,
        "message": f"Xe {plate} đã được ghi nhận vào bãi {area.name} (slot {slot.code})",
        "data": {
            "id": log.id,
            "log_id": log.id,
            "license_plate_number": plate,
            "vehicle_type": vtype,
            "entry_time": log.entry_time.isoformat() if log.entry_time else None,
            "parking_slot_id": slot.id,
            "parking_slot_code": slot.code,
            "parking_area_id": area.id,
            "parking_area_name": area.name,
        }
    }

# ========================== EXIT ================================
@router.post("/exit")
def vehicle_exit(
    payload: VehicleExitIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log, fee_result = crud.exit_vehicle(
        db=db,
        plate=payload.license_plate_number,
        current_user=current_user,
        exit_plate_image_base64=payload.exit_plate_image_base64,
        calculate_fee_for_log=calculate_fee_for_log,
    )

    return {
        "ok": True,
        "message": f"Xe {payload.license_plate_number} đã rời bãi",
        "data": {
            "license_plate": payload.license_plate_number,
            "vehicle_type": log.vehicle.vehicle_type if log.vehicle else None,
            "entry_time": log.entry_time,
            "exit_time": log.exit_time,
            "duration_hours": log.duration_hours,
            "amount": log.amount,
            "is_monthly_ticket": log.is_monthly_ticket,
            "parking_area_name": log.parking_area.name if log.parking_area else None,
            "parking_slot_code": log.parking_slot.code if log.parking_slot else None,
            "pricing_rule_id": log.pricing_rule_id,
            "morning_shifts": fee_result.get("morning_shifts"),
            "night_shifts": fee_result.get("night_shifts"),
        },
    }



@router.get("/logs/active", response_model=list[LogOut])
def get_active_logs(db: Session = Depends(get_db)):
    return crud.list_active_logs(db)


@router.get("/parking-areas", response_model=List[ParkingAreaOut])
def api_list_parking_areas_for_inout(is_active: Optional[bool] = Query(default=True), db: Session = Depends(get_db)):
    """Return parking areas for in/out UI. This route is under `/inout` and therefore
    uses the inout permission guard (so staff with inout access can call it).
    """
    return list_parking_areas(db, is_active=is_active)



@router.get("/logs/history", response_model=list[LogOut])
def get_logs_history(db: Session = Depends(get_db)):
    return crud.list_log_history(db, limit=100)
