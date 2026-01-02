# app/services/pricing.py

from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
import math

from sqlalchemy.orm import Session

from app.models import Log, PricingRule, MonthlyTicket, Vehicle


TZ = ZoneInfo("Asia/Ho_Chi_Minh")


MORNING_START = time(6, 0)   
MORNING_END = time(18, 0)    
NIGHT_START = time(18, 0)    
NIGHT_END = time(6, 0)       


def _to_local(dt_utc: datetime) -> datetime:
    """
    Chuyển datetime UTC (naive hoặc tz-aware) sang giờ VN (timezone aware).
    Luôn đảm bảo dt có tzinfo=UTC trước khi convert.
    """
    if dt_utc.tzinfo is None:
        dt_utc = dt_utc.replace(tzinfo=timezone.utc)
    return dt_utc.astimezone(TZ)


def get_active_monthly_ticket(
    db: Session,
    vehicle: Vehicle,
    at_time: datetime,
) -> MonthlyTicket | None:
    """
    Lấy vé tháng đang còn hiệu lực tại thời điểm at_time cho vehicle.
    Dùng chung cho cả ô tô và xe máy (so sánh vehicle_type).
    """
    return (
        db.query(MonthlyTicket)
        .filter(
            MonthlyTicket.vehicle_id == vehicle.id,
            MonthlyTicket.is_active == True,  # noqa: E712
            MonthlyTicket.start_date <= at_time,
            MonthlyTicket.end_date >= at_time,
            MonthlyTicket.vehicle_type == vehicle.vehicle_type,
        )
        .order_by(MonthlyTicket.start_date.desc())
        .first()
    )


def _count_shifts(entry_local: datetime, exit_local: datetime) -> tuple[int, int]:
    """
    Đếm số ca sáng / ca đêm dựa trên GIỜ VIỆT NAM.

    Dùng cho pricing_type = "block" (xe máy).
    entry_local, exit_local: datetime đã convert sang Asia/Ho_Chi_Minh.
    """
    if exit_local <= entry_local:
        return 0, 0

    morning_count = 0
    night_count = 0

    # Quét rộng hơn 1 ngày ở 2 đầu để không sót ca
    start_day = (entry_local - timedelta(days=1)).date()
    end_day = (exit_local + timedelta(days=1)).date()

    day = start_day
    while day <= end_day:
        # Ca sáng: 06:00 - 18:00 cùng ngày (giờ VN)
        morning_start_dt = datetime.combine(day, MORNING_START, tzinfo=TZ)
        morning_end_dt = datetime.combine(day, MORNING_END, tzinfo=TZ)

        # Ca đêm: 18:00 hôm nay - 06:00 hôm sau (giờ VN)
        night_start_dt = datetime.combine(day, NIGHT_START, tzinfo=TZ)
        night_end_dt = datetime.combine(day + timedelta(days=1), NIGHT_END, tzinfo=TZ)

        # Nếu khoảng gửi xe giao với ca sáng -> tính 1 ca sáng
        if morning_end_dt > entry_local and morning_start_dt < exit_local:
            morning_count += 1

        # Nếu khoảng gửi xe giao với ca đêm -> tính 1 ca đêm
        if night_end_dt > entry_local and night_start_dt < exit_local:
            night_count += 1

        day += timedelta(days=1)

    return morning_count, night_count


def _is_daytime(t: time) -> bool:
    """Kiểm tra 1 thời điểm (theo giờ VN) thuộc ban ngày hay ban đêm."""
    return MORNING_START <= t < MORNING_END


def calculate_fee_for_log(
    db: Session,
    log: Log,
    exit_time: datetime | None = None,
):
    """
    Tính tiền cho 1 log:

    - Nếu có vé tháng còn hạn -> amount = 0, is_monthly_ticket = True
    - Nếu không có pricing_rule -> amount = None
    - Nếu pricing_type = "hourly"  -> tính theo giờ (ô tô)
    - Nếu pricing_type = "block"   -> tính theo ca sáng/đêm (xe máy)
    """

    vehicle = log.vehicle
    parking_area = log.parking_area

    if not vehicle:
        raise ValueError("Log không có thông tin vehicle")
    if not parking_area:
        raise ValueError("Log không có thông tin parking_area")

    vehicle_type = vehicle.vehicle_type
    parking_area_id = parking_area.id

    entry_time_utc = log.entry_time
    if entry_time_utc is None:
        raise ValueError("Log không có entry_time")

    if exit_time is None:
        exit_time = datetime.utcnow()
    exit_time_utc = exit_time

    if exit_time_utc < entry_time_utc:
        raise ValueError("exit_time nhỏ hơn entry_time")

    # Tổng thời gian gửi (giờ) - dùng chung cho tất cả
    duration_seconds = (exit_time_utc - entry_time_utc).total_seconds()
    hours = max(1, math.ceil(duration_seconds / 3600))

    # Convert sang giờ Việt Nam để tính ca / giờ ngày-đêm
    entry_local = _to_local(entry_time_utc)
    exit_local = _to_local(exit_time_utc)

    # 1) Vé tháng (ưu tiên cao nhất)
    monthly_ticket = get_active_monthly_ticket(db, vehicle, exit_time_utc)
    if monthly_ticket:
        log.exit_time = exit_time_utc
        log.duration_hours = hours
        log.amount = 0
        log.is_monthly_ticket = True
        log.pricing_rule_id = None
        log.pricing_rule = None

        return {
            "is_monthly_ticket": True,
            "hours": hours,
            "amount": 0,
            "monthly_ticket": monthly_ticket,
            "pricing_rule": None,
            "morning_shifts": 0,
            "night_shifts": 0,
            "pricing_type": "monthly",
        }

    # 2) Lấy pricing_rule theo loại xe + khu vực
    pricing_rule: PricingRule | None = (
        db.query(PricingRule)
        .filter(
            PricingRule.vehicle_type == vehicle_type,
            PricingRule.parking_area_id == parking_area_id,
            PricingRule.is_active == True,  # noqa: E712
        )
        .first()
    )

    if not pricing_rule:
        # Không có bảng giá -> không tính tiền được
        log.exit_time = exit_time_utc
        log.duration_hours = hours
        log.amount = None
        log.is_monthly_ticket = False
        log.pricing_rule_id = None
        log.pricing_rule = None

        return {
            "is_monthly_ticket": False,
            "hours": hours,
            "amount": None,
            "monthly_ticket": None,
            "pricing_rule": None,
            "morning_shifts": 0,
            "night_shifts": 0,
            "pricing_type": None,
        }

    pricing_type = (pricing_rule.pricing_type or "block").lower()

    # ==============================
    #  CASE A: HOURLY (Ô TÔ, v.v.)
    # ==============================
    if pricing_type == "hourly":
        billed_hours = hours

        day_rate = pricing_rule.hourly_price_day or 0
        # Nếu không cấu hình giá đêm -> dùng giá ngày cho cả đêm
        night_rate = pricing_rule.hourly_price_night or day_rate

        day_hours = 0
        night_hours = 0

        # Duyệt từng tiếng một, dựa trên giờ LOCAL VN
        for i in range(billed_hours):
            slot_start = entry_local + timedelta(hours=i)
            # slot_start.timetz() là time theo Asia/Ho_Chi_Minh
            if _is_daytime(slot_start.timetz()):
                day_hours += 1
            else:
                night_hours += 1

        amount = day_hours * day_rate + night_hours * night_rate

        log.exit_time = exit_time_utc
        log.duration_hours = billed_hours
        log.amount = amount
        log.is_monthly_ticket = False
        log.pricing_rule = pricing_rule
        log.pricing_rule_id = pricing_rule.id

        # Với hourly: morning_shifts = số giờ ngày, night_shifts = số giờ đêm
        return {
            "is_monthly_ticket": False,
            "hours": billed_hours,
            "amount": amount,
            "monthly_ticket": None,
            "pricing_rule": pricing_rule,
            "morning_shifts": day_hours,
            "night_shifts": night_hours,
            "pricing_type": "hourly",
        }

    # ===============================
    #  CASE B: BLOCK (XE MÁY, v.v.)
    # ===============================
    # Mặc định: tính theo ca sáng/ca đêm
    morning_shifts, night_shifts = _count_shifts(entry_local, exit_local)

    amount = (
        morning_shifts * (pricing_rule.morning_price or 0)
        + night_shifts * (pricing_rule.night_price or 0)
    )

    log.exit_time = exit_time_utc
    log.duration_hours = hours
    log.amount = amount
    log.is_monthly_ticket = False
    log.pricing_rule = pricing_rule
    log.pricing_rule_id = pricing_rule.id

    return {
        "is_monthly_ticket": False,
        "hours": hours,
        "amount": amount,
        "monthly_ticket": None,
        "pricing_rule": pricing_rule,
        "morning_shifts": morning_shifts,
        "night_shifts": night_shifts,
        "pricing_type": "block",
    }
