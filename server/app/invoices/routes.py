from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from app.db import get_db
from app.models import Log, Vehicle, User
from typing import Optional
from datetime import datetime
from app.permission.guards import require_page
router = APIRouter(prefix="/invoices", tags=["Invoices"], dependencies=[Depends(require_page("/dashboard/invoices"))])


@router.get("")
def get_invoices(
    db: Session = Depends(get_db),
    date: Optional[str] = Query(None),   # yyyy-mm-dd
    staff: Optional[str] = Query(None),  # tên nhân viên thu (exit_staff)
):
   

    invoice_time = func.coalesce(Log.exit_time, Log.entry_time, Log.created_at)

    # Điều kiện cho từng loại log
    parking_condition = and_(
        Log.log_type == "parking",
        Log.amount.isnot(None),
        Log.entry_staff_id.isnot(None),
        Log.exit_staff_id.isnot(None),
        Log.exit_time.isnot(None),
    )

    monthly_condition = and_(
        Log.log_type == "monthly_payment",
        Log.amount.isnot(None),
    )

    query = (
        db.query(Log)
        .outerjoin(Vehicle, Log.vehicle_id == Vehicle.id)
        .outerjoin(User, Log.exit_staff_id == User.id)  # nhân viên thu (nếu có)
        .filter(or_(parking_condition, monthly_condition))
        .order_by(invoice_time.desc())
    )

    # Lọc theo ngày (trên invoice_time)
    if date:
        try:
            dt_obj = datetime.fromisoformat(date)  # "2025-12-05"
            date_start = dt_obj.replace(hour=0, minute=0, second=0, microsecond=0)
            date_end = dt_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
            query = query.filter(invoice_time >= date_start, invoice_time <= date_end)
        except Exception:
            pass

    # Lọc theo nhân viên thu (exit_staff)
    if staff and staff != "all":
        query = query.filter(User.full_name == staff)

    logs = query.all()

    results = []
    for log in logs:
        results.append(
            {
                "id": log.id,
                "log_type": log.log_type,  # "parking" hoặc "monthly_ticket"
                "vehicle_type": log.vehicle.vehicle_type if log.vehicle else None,
                "license_plate": log.vehicle.license_plate_number
                if log.vehicle
                else None,
                "amount": log.amount,
                "entry_staff": log.entry_staff.full_name if log.entry_staff else None,
                "exit_staff": log.exit_staff.full_name if log.exit_staff else None,
                "entry_time": log.entry_time.isoformat() if log.entry_time else None,
                "exit_time": log.exit_time.isoformat() if log.exit_time else None,
                "entry_plate_image": log.entry_plate_image,
                "exit_plate_image": log.exit_plate_image,
            }
        )

    return results
