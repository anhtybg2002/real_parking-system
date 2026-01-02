# app/in_out/crud.py
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException

from app.models import Vehicle, ParkingArea, ParkingSlot, Log, User


# -------------------------
# Vehicle
# -------------------------
def get_or_create_vehicle(db: Session, plate: str, vehicle_type: str) -> Vehicle:
    vehicle = db.query(Vehicle).filter(Vehicle.license_plate_number == plate).first()
    if not vehicle:
        vehicle = Vehicle(license_plate_number=plate, vehicle_type=vehicle_type)
        db.add(vehicle)
        db.commit()
        db.refresh(vehicle)
    return vehicle


def get_active_parking_log(db: Session, vehicle_id: int) -> Log | None:
    return (
        db.query(Log)
        .filter(Log.vehicle_id == vehicle_id)
        .filter(Log.log_type == "parking")
        .filter(Log.exit_time.is_(None))
        .first()
    )


# -------------------------
# Parking Area / Slot
# -------------------------
def get_parking_area_or_404(db: Session, parking_area_id: int) -> ParkingArea:
    area = db.query(ParkingArea).filter(ParkingArea.id == parking_area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="Khu vực không tồn tại")
    return area


def assert_area_has_capacity(area: ParkingArea):
    if area.slot_count is not None and area.slot_count is not None:
        if area.current_count >= area.slot_count:
            raise HTTPException(status_code=400, detail=f"Khu vực {area.name} đã đầy!")


def choose_slot_for_entry(
    db: Session,
    area_id: int,
    preferred_slot_id: int | None,
    vehicle_type: str,
) -> ParkingSlot | None:
    """
    Trả slot EMPTY.
    - Nếu preferred_slot_id có: validate slot thuộc area, đang EMPTY
    - Nếu không: chọn slot trống đầu tiên (theo row/col). (Bạn có thể nâng cấp thành thuật toán gợi ý)
    """
    if preferred_slot_id:
        slot = db.query(ParkingSlot).filter(ParkingSlot.id == preferred_slot_id).first()
        if not slot or slot.parking_area_id != area_id:
            raise HTTPException(status_code=404, detail="Slot không tồn tại trong bãi này")
        if slot.status != "EMPTY":
            raise HTTPException(status_code=400, detail="Slot không khả dụng")
        return slot

    # auto pick slot
    slot = (
        db.query(ParkingSlot)
        .filter(ParkingSlot.parking_area_id == area_id)
        .filter(ParkingSlot.status == "EMPTY")
        .filter(ParkingSlot.vehicle_type_allowed == vehicle_type)
        .order_by(ParkingSlot.row.asc(), ParkingSlot.col.asc())
        .first()
    )
    return slot


# -------------------------
# Entry / Exit actions
# -------------------------
def create_entry_log(
    db: Session,
    vehicle: Vehicle,
    area: ParkingArea,
    slot: ParkingSlot | None,
    current_user: User,
    entry_plate_image_base64: str | None,
) -> Log:
    # tạo log
    log = Log(
        log_type="parking",
        vehicle_id=vehicle.id,
        parking_area_id=area.id,
        parking_slot_id=slot.id if slot else None,
        entry_staff_id=current_user.id,
        entry_plate_image=entry_plate_image_base64,
        entry_time=datetime.utcnow(),
    )
    db.add(log)

    # cập nhật slot + count
    if slot:
        slot.status = "OCCUPIED"
    area.current_count = (area.current_count or 0) + 1

    db.commit()
    db.refresh(log)
    return log


def exit_vehicle(
    db: Session,
    plate: str,
    current_user: User,
    exit_plate_image_base64: str | None,
    calculate_fee_for_log,
) -> tuple[Log, dict]:
    """
    Xe ra:
    - tìm log active theo plate
    - tính phí
    - giải phóng slot (EMPTY)
    - giảm current_count
    - cập nhật log exit
    """
    log = (
        db.query(Log)
        .options(joinedload(Log.vehicle), joinedload(Log.parking_area), joinedload(Log.parking_slot))
        .join(Vehicle, Vehicle.id == Log.vehicle_id)
        .filter(
            Vehicle.license_plate_number == plate,
            Log.log_type == "parking",
            Log.exit_time.is_(None),
        )
        .order_by(Log.entry_time.desc())
        .first()
    )

    if not log:
        raise HTTPException(status_code=404, detail="Không tìm thấy lượt gửi xe chưa ra")

    exit_time = datetime.utcnow()

    # Tính phí (function hiện có của bạn)
    fee_result = calculate_fee_for_log(db=db, log=log, exit_time=exit_time)

    # cập nhật count
    if log.parking_area_id:
        area = db.query(ParkingArea).filter(ParkingArea.id == log.parking_area_id).first()
        if area and (area.current_count or 0) > 0:
            area.current_count -= 1

    # giải phóng slot
    if log.parking_slot_id:
        slot = db.query(ParkingSlot).filter(ParkingSlot.id == log.parking_slot_id).first()
        if slot:
            slot.status = "EMPTY"

    # cập nhật log
    log.exit_time = exit_time
    log.exit_staff_id = current_user.id
    log.exit_plate_image = exit_plate_image_base64

    db.commit()
    db.refresh(log)

    return log, fee_result


# -------------------------
# Queries
# -------------------------
def list_active_logs(db: Session):
    return (
        db.query(Log)
        .options(joinedload(Log.vehicle), joinedload(Log.parking_area), joinedload(Log.parking_slot))
        .filter(Log.exit_time.is_(None))
        .filter(Log.log_type == "parking")
        .order_by(Log.entry_time.desc())
        .all()
    )


def list_log_history(db: Session, limit: int = 100):
    return (
        db.query(Log)
        .options(joinedload(Log.vehicle), joinedload(Log.parking_area), joinedload(Log.parking_slot))
        .order_by(Log.entry_time.desc())
        .limit(limit)
        .all()
    )
