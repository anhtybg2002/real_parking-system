# app/parking/crud.py
import json
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session, aliased
from app.models import ParkingArea, ParkingSlot, Log, Vehicle, User, ParkingSlotEvent
from sqlalchemy import and_, func, tuple_



def attach_current_plate(db: Session, slot: ParkingSlot):
    LogActive = aliased(Log)
    plate = (
        db.query(Vehicle.license_plate_number)
        .outerjoin(LogActive, and_(LogActive.vehicle_id == Vehicle.id, LogActive.exit_time.is_(None), LogActive.log_type == "parking"))
        .filter(LogActive.parking_slot_id == slot.id)
        .order_by(LogActive.entry_time.desc())
        .scalar()
    )
    setattr(slot, "current_plate", plate)
    return slot

def parse_map_data(raw: Optional[str]) -> Optional[Dict[str, Any]]:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def get_parking_area(db: Session, area_id: int) -> Optional[ParkingArea]:
    return db.query(ParkingArea).filter(ParkingArea.id == area_id).first()



def list_parking_areas(db, is_active=None):
    q = db.query(ParkingArea)
    if is_active is not None:
        q = q.filter(ParkingArea.is_active == is_active)
    areas = q.order_by(ParkingArea.updated_at.desc()).all()

    area_ids = [a.id for a in areas]
    counts = dict(
        db.query(ParkingSlot.parking_area_id, func.count(ParkingSlot.id))
          .filter(ParkingSlot.parking_area_id.in_(area_ids))
          .group_by(ParkingSlot.parking_area_id)
          .all()
    )

    # trả về dict để schema dùng (không cần field capacity trong model)
    out = []
    for a in areas:
        out.append({
            "id": a.id,
            "name": a.name,
            "is_active": a.is_active,
            "current_count": a.current_count,
            "slot_count": counts.get(a.id, 0),
            "updated_at": a.updated_at,
        })
    return out



def list_slots(
    db: Session,
    parking_area_id: int,
    status: Optional[str] = None,
    vehicle_type_allowed: Optional[str] = None,
):
    q = db.query(ParkingSlot).filter(ParkingSlot.parking_area_id == parking_area_id)

    if status:
        q = q.filter(ParkingSlot.status == status)

    if vehicle_type_allowed:
        q = q.filter(ParkingSlot.vehicle_type_allowed == vehicle_type_allowed)

    slots: List[ParkingSlot] = q.order_by(ParkingSlot.row.asc(), ParkingSlot.col.asc()).all()

    # Lấy log active của các slot trong area (exit_time is None)
    # Join Vehicle để lấy plate
    active_rows = (
        db.query(Log.parking_slot_id, Log.id.label("log_id"), Vehicle.id.label("vehicle_id"), Vehicle.license_plate_number)
        .join(Vehicle, Vehicle.id == Log.vehicle_id)
        .filter(
            Log.exit_time.is_(None),
            Log.parking_slot_id.isnot(None),
        )
        .all()
    )

    # Map slot_id -> info, chỉ lấy log mới nhất nếu có nhiều (phòng trường hợp dữ liệu bẩn)
    active_map: Dict[int, Dict[str, Any]] = {}
    for slot_id, log_id, vehicle_id, plate in active_rows:
        # Nếu 1 slot có nhiều log active (không nên), ưu tiên log_id lớn hơn (mới hơn)
        if slot_id is None:
            continue
        cur = active_map.get(slot_id)
        if (cur is None) or (log_id > cur["active_log_id"]):
            active_map[slot_id] = {
                "current_plate": plate,
                "current_vehicle_id": vehicle_id,
                "active_log_id": log_id,
            }

    # Trả list dict để bơm thêm field mà không cần thay đổi model ParkingSlot
    out = []
    for s in slots:
        extra = active_map.get(s.id, {})
        out.append({
            "id": s.id,
            "parking_area_id": s.parking_area_id,
            "code": s.code,
            "row": s.row,
            "col": s.col,
            "vehicle_type_allowed": s.vehicle_type_allowed,
            "status": s.status,
            "note": s.note,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
            "current_plate": extra.get("current_plate"),
            "current_vehicle_id": extra.get("current_vehicle_id"),
            "active_log_id": extra.get("active_log_id"),
        })

    return out


def get_slot(db: Session, slot_id: int) -> Optional[ParkingSlot]:
    return db.query(ParkingSlot).filter(ParkingSlot.id == slot_id).first()


def update_slot(db: Session, slot: ParkingSlot, data: dict) -> ParkingSlot:
    for k, v in data.items():
        setattr(slot, k, v)

    attach_current_plate(db, slot)
    db.commit()
    db.refresh(slot)
    return slot

def change_parking_slot(
    db: Session,
    *,
    log: Log,
    old_slot_id: int | None,
    new_slot_id: int | None,
    staff_id: int,
    note: str | None = None
):
    event = Log(
        log_type="slot_change",
        vehicle_id=log.vehicle_id,
        parking_area_id=log.parking_area_id,
        entry_staff_id=staff_id,

        old_parking_slot_id=old_slot_id,
        new_parking_slot_id=new_slot_id,

        description=note or "Manual slot change",
    )

    db.add(event)



def swap_occupied_slots(db: Session, slot_id_a: int, slot_id_b: int, current_user: User):
    if slot_id_a == slot_id_b:
        raise HTTPException(status_code=400, detail="Hai slot phải khác nhau")

    # khóa 2 slot để tránh race condition
    slots = (
        db.query(ParkingSlot)
        .filter(ParkingSlot.id.in_([slot_id_a, slot_id_b]))
        .with_for_update()
        .all()
    )
    if len(slots) != 2:
        raise HTTPException(status_code=404, detail="Không tìm thấy đủ 2 slot")

    slot_a = next(s for s in slots if s.id == slot_id_a)
    slot_b = next(s for s in slots if s.id == slot_id_b)

    # Khuyến nghị: swap trong cùng area để tránh loạn map
    if slot_a.parking_area_id != slot_b.parking_area_id:
        raise HTTPException(status_code=400, detail="Chỉ cho phép đổi chỗ trong cùng khu vực")

    # Điều kiện bạn yêu cầu: cùng loại xe
    if (slot_a.vehicle_type_allowed or "").lower() != (slot_b.vehicle_type_allowed or "").lower():
        raise HTTPException(status_code=400, detail="Hai chỗ phải cùng loại xe cho phép")

    # Khuyến nghị mạnh: “đổi chỗ 2 xe” => cả 2 đang OCCUPIED
    if slot_a.status != "OCCUPIED" or slot_b.status != "OCCUPIED":
        raise HTTPException(status_code=400, detail="Chỉ đổi chỗ khi cả hai slot đang OCCUPIED")

    # 2 xe đang đỗ = 2 log active
    log_a = (
        db.query(Log)
        .filter(and_(Log.parking_slot_id == slot_id_a, Log.exit_time.is_(None)))
        .order_by(Log.entry_time.desc())
        .with_for_update()
        .first()
    )
    log_b = (
        db.query(Log)
        .filter(and_(Log.parking_slot_id == slot_id_b, Log.exit_time.is_(None)))
        .order_by(Log.entry_time.desc())
        .with_for_update()
        .first()
    )

    if not log_a or not log_b:
        raise HTTPException(status_code=400, detail="Không tìm thấy đủ 2 xe đang đỗ (log active) để đổi chỗ")

    try:
        # swap log.parking_slot_id
        add_slot_event(
            db,
            log_id=log_a.id,
            vehicle_id=log_a.vehicle_id,
            parking_area_id=log_a.parking_area_id,
            event_type="SWAP",
            from_slot_id=slot_id_a,
            to_slot_id=slot_id_b,
            staff_id=current_user.id,
            note="Swap slot from map UI",
        )
        add_slot_event(
            db,
            log_id=log_b.id,
            vehicle_id=log_b.vehicle_id,
            parking_area_id=log_b.parking_area_id,
            event_type="SWAP",
            from_slot_id=slot_id_b,
            to_slot_id=slot_id_a,
            staff_id=current_user.id,
            note="Swap slot from map UI",
        )

        log_a.parking_slot_id = slot_id_b
        log_b.parking_slot_id = slot_id_a
        db.commit()

        return {"ok": True, "slot_id_a": slot_id_a, "slot_id_b": slot_id_b}
    except Exception:
        db.rollback()
        raise


def list_unassigned_vehicles(db: Session, parking_area_id: int | None = None):
    q = (
        db.query(
            Log.id.label("log_id"),
            Vehicle.id.label("vehicle_id"),
            Vehicle.license_plate_number,
            Vehicle.vehicle_type,
            Log.entry_time,
            Log.parking_area_id,
        )
        .join(Vehicle, Vehicle.id == Log.vehicle_id)
        .filter(
            Log.exit_time.is_(None),
            Log.parking_slot_id.is_(None),
        )
        .order_by(Log.entry_time.desc())
    )

    # nếu bạn luôn set Log.parking_area_id khi xe vào bãi thì nên filter theo area
    if parking_area_id is not None:
        q = q.filter(Log.parking_area_id == parking_area_id)

    rows = q.all()

    return [
        {
            "log_id": r.log_id,
            "vehicle_id": r.vehicle_id,
            "license_plate_number": r.license_plate_number,
            "vehicle_type": r.vehicle_type,
            "entry_time": r.entry_time,
            "parking_area_id": r.parking_area_id,
        }
        for r in rows
    ]


def assign_unassigned_log_to_slot(db: Session, slot_id: int, log_id: int, current_user: User):
    slot = db.query(ParkingSlot).filter(ParkingSlot.id == slot_id).with_for_update().first()
    if not slot:
        raise HTTPException(404, "Slot không tồn tại")

    if slot.status != "EMPTY":
        raise HTTPException(400, "Chỉ có thể gán vào slot đang Trống (EMPTY)")

    log = db.query(Log).filter(Log.id == log_id).with_for_update().first()
    if not log or log.exit_time is not None:
        raise HTTPException(400, "Log không hợp lệ hoặc đã kết thúc")

    if log.parking_slot_id is not None:
        raise HTTPException(400, "Xe này đã có chỗ đỗ rồi")

    vehicle = db.query(Vehicle).filter(Vehicle.id == log.vehicle_id).first()
    if not vehicle:
        raise HTTPException(400, "Không tìm thấy vehicle")

    # điều kiện cùng loại
    if (vehicle.vehicle_type or "").lower() != (slot.vehicle_type_allowed or "").lower():
        raise HTTPException(400, "Loại xe không phù hợp với slot")

    # Assign
    add_slot_event(
    db,
    log_id=log.id,
    vehicle_id=log.vehicle_id,
    parking_area_id=log.parking_area_id,
    event_type="ASSIGN",
    from_slot_id=None,
    to_slot_id=slot_id,
    staff_id=current_user.id,
    note="Assign unassigned vehicle to slot from UI",
    )

    log.parking_slot_id = slot_id
    slot.status = "OCCUPIED"
    db.commit()
    return {"ok": True}


def add_slot_event(
    db: Session,
    *,
    log_id: int,
    vehicle_id: int | None,
    parking_area_id: int | None,
    event_type: str,
    from_slot_id: int | None,
    to_slot_id: int | None,
    staff_id: int | None,
    note: str | None = None,
):
    e = ParkingSlotEvent(
        log_id=log_id,
        vehicle_id=vehicle_id,
        parking_area_id=parking_area_id,
        event_type=event_type,
        from_slot_id=from_slot_id,
        to_slot_id=to_slot_id,
        staff_id=staff_id,
        note=note,
    )
    db.add(e)

def dump_map_data(map_data):
    if map_data is None:
        return None
    return json.dumps(map_data, ensure_ascii=False)



def upsert_slots_from_map(db: Session, area_id: int, slot_cells: dict):
    """
    slot_cells: { "r-c": { "kind": "PARKING_BIKE|PARKING_CAR", "name": "A1-01" } }
    - Upsert theo (parking_area_id, row, col)
    - code lấy từ name (nếu có)
    - vehicle_type_allowed theo kind
    """
    for key, v in (slot_cells or {}).items():
        try:
            r_str, c_str = key.split("-")
            r = int(r_str); c = int(c_str)
        except Exception:
            continue

        kind = (v or {}).get("kind")
        code = (v or {}).get("name") or ""

        vehicle_type_allowed = "motorbike" if kind == "PARKING_BIKE" else "car"

        slot = (
            db.query(ParkingSlot)
            .filter(
                ParkingSlot.parking_area_id == area_id,
                ParkingSlot.row == r,
                ParkingSlot.col == c,
            )
            .first()
        )

        if slot:
            # update
            if code:
                slot.code = code
            slot.vehicle_type_allowed = vehicle_type_allowed
        else:
            # create
            if not code:
                # fallback code nếu user không đặt
                code = f"S{r}-{c}"
            slot = ParkingSlot(
                parking_area_id=area_id,
                code=code,
                row=r,
                col=c,
                vehicle_type_allowed=vehicle_type_allowed,
                status="EMPTY",
            )
            db.add(slot)

def has_occupied_slots(db: Session, area_id: int) -> bool:
    return (
        db.query(ParkingSlot.id)
        .filter(
            and_(
                ParkingSlot.parking_area_id == area_id,
                ParkingSlot.status == "OCCUPIED",
            )
        )
        .first()
        is not None
    )

def count_occupied_slots(db: Session, area_id: int) -> int:
    return (
        db.query(ParkingSlot)
        .filter(
            and_(
                ParkingSlot.parking_area_id == area_id,
                ParkingSlot.status == "OCCUPIED",
            )
        )
        .count()
    )

def delete_empty_slots_not_in_map(db: Session, area_id: int, keep_positions: set[tuple[int, int]]):
    """
    Xóa các slot thuộc area mà:
    - status = EMPTY
    - (row, col) không nằm trong keep_positions
    """
    q = db.query(ParkingSlot).filter(
        ParkingSlot.parking_area_id == area_id,
        ParkingSlot.status != "OCCUPIED",
    )

    if keep_positions:
        q = q.filter(~tuple_(ParkingSlot.row, ParkingSlot.col).in_(list(keep_positions)))

    q.delete(synchronize_session=False)




def create_parking_area(db: Session, payload) -> ParkingArea:
    existed = db.query(ParkingArea).filter(ParkingArea.name == payload.name).first()
    if existed:
        raise HTTPException(status_code=400, detail="Tên bãi đã tồn tại")

    area = ParkingArea(
        name=payload.name,
        current_count=0,
        map_rows=payload.map_rows,
        map_cols=payload.map_cols,
        cell_size=payload.cell_size,
        is_active=payload.is_active,
        map_data=dump_map_data(payload.map_data or {"cells": {}, "paths": []}),
    )
    db.add(area)
    db.commit()
    db.refresh(area)
    return area


def toggle_parking_area(db: Session, area_id: int, is_active: bool) -> ParkingArea:
    area = db.query(ParkingArea).filter(ParkingArea.id == area_id).first()
    if not area:
        return None

    area.is_active = is_active
    db.commit()
    db.refresh(area)
    return area
