
from app.models import (
    MonthlyTicket,
    Vehicle,
    ParkingArea,
    PricingRule,
    Log,
)
from datetime import datetime, date, time, timezone
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from typing import List, Optional
def ensure_vehicle(db: Session, lp: str, vehicle_type: str) -> Vehicle:
    """
    Tìm Vehicle theo biển số, nếu chưa có thì tạo mới.
    """
    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.license_plate_number == lp)
        .first()
    )
    if vehicle:
        # cập nhật loại xe nếu cần
        if vehicle.vehicle_type != vehicle_type:
            vehicle.vehicle_type = vehicle_type
        return vehicle

    vehicle = Vehicle(
        license_plate_number=lp,
        vehicle_type=vehicle_type,
    )
    db.add(vehicle)
    db.flush()
    return vehicle


def to_datetime_start(d: date) -> datetime:
    return datetime.combine(d, time.min)


def to_datetime_end(d: date) -> datetime:
    return datetime.combine(d, time.max)


def find_monthly_price_for_ticket(db: Session, ticket: MonthlyTicket) -> Optional[int]:
    
    if not ticket.area:
        return None

    area = (
        db.query(ParkingArea)
        .filter(ParkingArea.name == ticket.area)
        .first()
    )
    if not area:
        return None

    rule = (
        db.query(PricingRule)
        .filter(
            PricingRule.vehicle_type == ticket.vehicle_type,
            PricingRule.parking_area_id == area.id,
            PricingRule.is_active == True,
        )
        .first()
    )
    if not rule or rule.monthly_price is None:
        return None

    return rule.monthly_price


from typing import Optional
from datetime import datetime

def create_payment_log_for_ticket(
    db: Session,
    ticket: MonthlyTicket,
    amount: int,
    months: int,
    description: str,
    exit_staff_id: Optional[int] = None,
    parking_area_id: Optional[int] = None,   # ✅ cho default luôn
):
    

    # Ưu tiên parking_area_id truyền vào, fallback sang ticket.parking_area_id nếu có
    resolved_parking_area_id = parking_area_id or getattr(ticket, "parking_area_id", None)

    log = Log(
        log_type="monthly_payment",
        vehicle_id=ticket.vehicle_id,
        parking_area_id=resolved_parking_area_id,   
        exit_staff_id=exit_staff_id,
        monthly_ticket_id=ticket.id,
        entry_time=datetime.utcnow(),
        exit_time=None,
        duration_hours=None,
        amount=amount,
        is_monthly_ticket=False,
        pricing_rule_id=None,
        description=description,
    )
    db.add(log)


def find_monthly_price_by_vehicle_and_area(
    db: Session,
    vehicle_type: str,
    area_name: Optional[str],
) -> Optional[int]:
    if not area_name:
        return None

    area = (
        db.query(ParkingArea)
        .filter(ParkingArea.name == area_name)
        .first()
    )
    if not area:
        return None

    rule = (
        db.query(PricingRule)
        .filter(
            PricingRule.vehicle_type == vehicle_type,
            PricingRule.parking_area_id == area.id,
            PricingRule.is_active == True,
        )
        .first()
    )
    if not rule or rule.monthly_price is None:
        return None

    return rule.monthly_price


VIETNAM_TZ = ZoneInfo("Asia/Ho_Chi_Minh")

def local_date_to_utc_start(d: date) -> datetime:
    # 00:00 ngày d theo giờ VN -> UTC
    local_dt = datetime.combine(d, time.min, tzinfo=VIETNAM_TZ)
    return local_dt.astimezone(timezone.utc)

def local_date_to_utc_end(d: date) -> datetime:
    # 23:59:59.999999 ngày d theo giờ VN -> UTC
    local_dt = datetime.combine(d, time.max, tzinfo=VIETNAM_TZ)
    return local_dt.astimezone(timezone.utc)