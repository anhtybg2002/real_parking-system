# app/dashboard/router.py
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.dashboard.deps import get_daily_revenue
from app.models import Log

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

TZ = ZoneInfo("Asia/Ho_Chi_Minh")


def vn_day_bounds_utc() -> tuple[datetime, datetime]:
    """
    Trả về (start_utc_naive, end_utc_naive) ứng với "ngày hôm nay theo giờ VN",
    nhưng convert về UTC để query DB (DB đang lưu UTC naive).
    """
    now_local = datetime.now(TZ)
    start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    end_local = start_local + timedelta(days=1)

    start_utc = start_local.astimezone(timezone.utc).replace(tzinfo=None)
    end_utc = end_local.astimezone(timezone.utc).replace(tzinfo=None)
    return start_utc, end_utc


@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    - current_occupied: số phiên parking đang active (exit_time is NULL) (theo Log)
    - logs_today: số lượt xe vào hôm nay (theo giờ VN, lọc bằng UTC trong DB)
    """
    start_utc, end_utc = vn_day_bounds_utc()

    current_occupied = (
        db.query(func.count(Log.id))
        .filter(
            Log.log_type == "parking",
            Log.exit_time.is_(None),
        )
        .scalar()
        or 0
    )

    logs_today = (
        db.query(func.count(Log.id))
        .filter(
            Log.log_type == "parking",
            Log.entry_time >= start_utc,
            Log.entry_time < end_utc,
        )
        .scalar()
        or 0
    )

    return {
        "current_occupied": int(current_occupied),
        "logs_today": int(logs_today),
    }


@router.get("/vehicles-by-hour")
def get_vehicles_entered_by_hour(db: Session = Depends(get_db)):
    """
    Trả về 24 điểm (0..23) theo GIỜ VN, mỗi điểm là số xe vào trong giờ đó (log_type=parking).

    Output:
    [
      {"hour": "0:00", "value": 3},
      ...
      {"hour": "23:00", "value": 1}
    ]
    """
    start_utc, end_utc = vn_day_bounds_utc()

    # Lấy entry_time trong ngày VN (lọc bằng UTC naive)
    rows = (
        db.query(Log.entry_time)
        .filter(
            Log.log_type == "parking",
            Log.entry_time >= start_utc,
            Log.entry_time < end_utc,
        )
        .all()
    )

    counts_by_hour = {h: 0 for h in range(24)}

    for (entry_time,) in rows:
        if not entry_time:
            continue

        # entry_time trong DB là UTC naive -> gắn tz UTC
        entry_utc = entry_time.replace(tzinfo=timezone.utc)
        entry_local = entry_utc.astimezone(TZ)
        counts_by_hour[entry_local.hour] += 1

    data = [{"hour": f"{h}:00", "value": int(counts_by_hour[h])} for h in range(24)]
    return data


@router.get("/today-revenue")
def read_today_revenue(db: Session = Depends(get_db)):
    """
    Doanh thu hôm nay theo giờ VN.
    get_daily_revenue(db, target_date) là deps bạn đang có.
    """
    target_date = datetime.now(TZ).date()
    total = get_daily_revenue(db, target_date) or 0

    return {
        "date": str(target_date),         # trả string cho FE dễ parse
        "total_revenue": int(total),
    }


@router.get("/exit-today")
def get_exit_today_vn(db: Session = Depends(get_db)):
    """
    Số lượt xe ra hôm nay theo giờ VN (exit_time trong khoảng ngày VN).
    """
    start_utc, end_utc = vn_day_bounds_utc()

    count = (
        db.query(func.count(Log.id))
        .filter(
            Log.log_type == "parking",
            Log.exit_time.isnot(None),
            Log.exit_time >= start_utc,
            Log.exit_time < end_utc,
        )
        .scalar()
        or 0
    )

    return int(count)
