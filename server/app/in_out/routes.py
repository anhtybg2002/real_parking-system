# app/in_out/routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.db import get_db
from app.models import User, ParkingArea, Log, Vehicle, ParkingSlot
from app.auth.deps import get_current_user
from app.pricing.deps import calculate_fee_for_log

from .schemas import VehicleEntryIn, VehicleExitIn, LogOut, ParkingAreaOut
from . import crud
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
        # Policy: nếu muốn “đồng bộ theo payload” thì update ở đây
        # Nếu không muốn update, bạn có thể bỏ đoạn này và chỉ dùng vehicle_type hiện có
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

    return {
        "ok": True,
        "message": f"Xe {plate} đã được ghi nhận vào bãi {area.name} (slot {slot.code})",
        "log_id": log.id,
        "parking_slot_id": slot.id,
        "parking_slot_code": slot.code,
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
            "entry_time": log.entry_time,
            "exit_time": log.exit_time,
            "hours": log.duration_hours,
            "amount": log.amount,
            "is_monthly_ticket": log.is_monthly_ticket,
            "pricing_rule_id": log.pricing_rule_id,
            "morning_shifts": fee_result.get("morning_shifts"),
            "night_shifts": fee_result.get("night_shifts"),
        },
    }


# ========================== ACTIVE LOGS ================================
@router.get("/logs/active", response_model=list[LogOut])
def get_active_logs(db: Session = Depends(get_db)):
    return crud.list_active_logs(db)


# ========================== HISTORY ================================
@router.get("/logs/history", response_model=list[LogOut])
def get_logs_history(db: Session = Depends(get_db)):
    return crud.list_log_history(db, limit=100)
