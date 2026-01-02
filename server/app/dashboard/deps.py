from datetime import datetime, time, timedelta, date, timezone
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from app.models import Log
from sqlalchemy import func
TZ = ZoneInfo("Asia/Ho_Chi_Minh")
def today_bounds(tz: ZoneInfo = TZ):
    now = datetime.now(tz)
    start = datetime.combine(now.date(), time.min, tzinfo=tz)
    end = datetime.combine(now.date(), time.max, tzinfo=tz)
    return start, end


def get_daily_revenue(db: Session, target_date: date | None = None) -> int:
    """
    Tính tổng doanh thu trong 1 ngày theo múi giờ Việt Nam,
    nhưng dữ liệu trong DB đang lưu ở UTC.
    """

    # Nếu không truyền ngày -> mặc định hôm nay theo giờ VN
    if target_date is None:
        now_local = datetime.now(TZ)
        target_date = now_local.date()

    # 1) Khung giờ theo VN (local time)
    start_local = datetime.combine(target_date, time.min, tzinfo=TZ)   # 00:00 VN
    end_local   = start_local + timedelta(days=1)                      # sang ngày hôm sau 00:00 VN

    # 2) Đổi sang UTC để so sánh với cột exit_time (UTC trong DB)
    start_utc = start_local.astimezone(timezone.utc)
    end_utc   = end_local.astimezone(timezone.utc)

    # 3) Query trong DB
    parking_total = (
        db.query(func.coalesce(func.sum(Log.amount), 0))
        .filter(Log.log_type == "parking")
        .filter(Log.amount.isnot(None))
        .filter(Log.exit_time.isnot(None))
        .filter(Log.exit_time >= start_utc)
        .filter(Log.exit_time < end_utc)
        .scalar()
    )

    monthly_total = (
        db.query(func.coalesce(func.sum(Log.amount), 0))
        .filter(Log.log_type == "monthly_payment")
        .filter(Log.amount.isnot(None))
        .filter(Log.entry_time >= start_utc)
        .filter(Log.entry_time < end_utc)
        .scalar()
    )

    total = (parking_total or 0) + (monthly_total or 0)

    return int(total or 0)
