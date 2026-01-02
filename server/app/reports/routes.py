from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, aliased
from sqlalchemy import func, case, and_, or_
from datetime import datetime, timedelta, date, time

from app.db import get_db
from app.models import Log, Vehicle, User, ParkingArea
from app.reports.schemas import (
    ReportOut,
    ReportSummaryOut,
    RevenueByDayRowOut,
    DailyTableRowOut,
    VehicleMixOut,
    ReportLogsOut,
    ReportLogRow
)
from app.permission.guards import require_page

router = APIRouter(prefix="/reports", tags=["Reports"],dependencies=[Depends(require_page("/dashboard/reports"))])

def _apply_parking_area_filter(q, parking_area: str):
    pa = (parking_area or "all").strip()
    if pa != "all":
        q = q.filter(Log.parking_area_id == int(pa))
    return q


def _parse_date(d: str | None) -> date | None:
    if not d:
        return None
    return datetime.strptime(d, "%Y-%m-%d").date()


def _vehicle_type_filter_clause(vt: str):
    """
    vt: all | motorbike | car | other
    """
    vt = (vt or "all").lower()
    if vt == "all":
        return None
    if vt in ("motorbike", "car"):
        return Vehicle.vehicle_type == vt
    if vt == "other":
        return and_(Vehicle.vehicle_type != "motorbike", Vehicle.vehicle_type != "car")
    return None


def _apply_staff_filter(q, staff_val: str, db: Session):
    """
    staff: all | <user_id> | <full_name>
    Filter theo entry_staff hoặc exit_staff.
    """
    sv = (staff_val or "all").strip()
    if sv.lower() == "all":
        return q

    if sv.isdigit():
        sid = int(sv)
        return q.filter(or_(Log.entry_staff_id == sid, Log.exit_staff_id == sid))

    staff_ids = [x[0] for x in db.query(User.id).filter(User.full_name == sv).all()]
    if staff_ids:
        return q.filter(or_(Log.entry_staff_id.in_(staff_ids), Log.exit_staff_id.in_(staff_ids)))

    # Không match ai => trả rỗng
    return q.filter(False)


@router.get("", response_model=ReportOut)
def get_reports(
    from_date: str | None = Query(None, description="YYYY-MM-DD"),
    to_date: str | None = Query(None, description="YYYY-MM-DD"),
    vehicle_type: str = Query("all", description="all|motorbike|car|other"),
    staff: str = Query("all", description="all|<user_id>|<full_name>"),
    log_type: str = Query("all", description="all|parking|monthly_payment"),
    parking_area: str = Query("all", description="all|<parking_area_id>"),  # ✅ THÊM
    db: Session = Depends(get_db),
):
    f = _parse_date(from_date)
    t = _parse_date(to_date)

    if not t:
        t = datetime.now().date()
    if not f:
        f = t - timedelta(days=6)

    start_dt = datetime.combine(f, datetime.min.time())
    end_dt = datetime.combine(t + timedelta(days=1), datetime.min.time())

    lt = (log_type or "all").lower()
    v_clause = _vehicle_type_filter_clause(vehicle_type)
    staff_val = (staff or "all").strip()

    report_time = case(
        (Log.log_type == "monthly_payment", Log.entry_time),
        else_=Log.exit_time,
    )

    # =========================
    # Base query
    # =========================
    base_q = (
        db.query(Log)
        .join(Vehicle, Log.vehicle_id == Vehicle.id, isouter=True)
        .filter(report_time.isnot(None))
        .filter(report_time >= start_dt, report_time < end_dt)
    )

    # ✅ Filter parking_area
    base_q = _apply_parking_area_filter(base_q, parking_area)

    if lt != "all":
        base_q = base_q.filter(Log.log_type == lt)

    if v_clause is not None:
        base_q = base_q.filter(v_clause)

    base_q = _apply_staff_filter(base_q, staff_val, db)

    # =========================
    # Summary
    # =========================
    total_trips = base_q.filter(Log.log_type == "parking").count()

    total_revenue_q = (
        db.query(func.coalesce(func.sum(Log.amount), 0))
        .select_from(Log)
        .join(Vehicle, Log.vehicle_id == Vehicle.id, isouter=True)
        .filter(report_time.isnot(None))
        .filter(report_time >= start_dt, report_time < end_dt)
    )

    # ✅ Filter parking_area
    total_revenue_q = _apply_parking_area_filter(total_revenue_q, parking_area)

    if lt != "all":
        total_revenue_q = total_revenue_q.filter(Log.log_type == lt)
    if v_clause is not None:
        total_revenue_q = total_revenue_q.filter(v_clause)
    total_revenue_q = _apply_staff_filter(total_revenue_q, staff_val, db)

    total_revenue_val = int(total_revenue_q.scalar() or 0)

    # Xe đang trong bãi
    active_in_yard_q = (
        db.query(func.count(Log.id))
        .select_from(Log)
        .join(Vehicle, Log.vehicle_id == Vehicle.id, isouter=True)
        .filter(Log.log_type == "parking")
        .filter(Log.exit_time.is_(None))
    )

    # ✅ Filter parking_area
    active_in_yard_q = _apply_parking_area_filter(active_in_yard_q, parking_area)

    if v_clause is not None:
        active_in_yard_q = active_in_yard_q.filter(v_clause)
    active_in_yard = int(active_in_yard_q.scalar() or 0)

    # staff_active
    staff_active_q = (
        db.query(
            func.count(
                func.distinct(
                    case(
                        (Log.exit_staff_id.isnot(None), Log.exit_staff_id),
                        else_=Log.entry_staff_id,
                    )
                )
            )
        )
        .select_from(Log)
        .join(Vehicle, Log.vehicle_id == Vehicle.id, isouter=True)
        .filter(report_time.isnot(None))
        .filter(report_time >= start_dt, report_time < end_dt)
    )

    # ✅ Filter parking_area
    staff_active_q = _apply_parking_area_filter(staff_active_q, parking_area)

    if lt != "all":
        staff_active_q = staff_active_q.filter(Log.log_type == lt)
    if v_clause is not None:
        staff_active_q = staff_active_q.filter(v_clause)
    staff_active_q = _apply_staff_filter(staff_active_q, staff_val, db)

    staff_active = int(staff_active_q.scalar() or 0)

    summary = ReportSummaryOut(
        total_trips=total_trips,
        total_revenue=total_revenue_val,
        active_in_yard=active_in_yard,
        staff_active=staff_active,
    )

    # =========================
    # revenue_by_day
    # =========================
    day_col = func.date(report_time)

    rev_rows_q = (
        db.query(
            day_col.label("day"),
            func.coalesce(func.sum(Log.amount), 0).label("revenue"),
        )
        .select_from(Log)
        .join(Vehicle, Log.vehicle_id == Vehicle.id, isouter=True)
        .filter(report_time.isnot(None))
        .filter(report_time >= start_dt, report_time < end_dt)
    )

    # ✅ Filter parking_area
    rev_rows_q = _apply_parking_area_filter(rev_rows_q, parking_area)

    if lt != "all":
        rev_rows_q = rev_rows_q.filter(Log.log_type == lt)
    if v_clause is not None:
        rev_rows_q = rev_rows_q.filter(v_clause)
    rev_rows_q = _apply_staff_filter(rev_rows_q, staff_val, db)

    rev_rows = rev_rows_q.group_by(day_col).order_by(day_col.asc()).all()

    revenue_by_day = [
        RevenueByDayRowOut(date=str(r.day), revenue=int(r.revenue or 0))
        for r in rev_rows
    ]

    # =========================
    # vehicle_mix - chỉ parking theo exit_time
    # =========================
    mix_q = (
        db.query(
            func.sum(case((Vehicle.vehicle_type == "motorbike", 1), else_=0)).label("motorbike"),
            func.sum(case((Vehicle.vehicle_type == "car", 1), else_=0)).label("car"),
            func.sum(
                case(
                    (and_(Vehicle.vehicle_type != "motorbike", Vehicle.vehicle_type != "car"), 1),
                    else_=0,
                )
            ).label("other"),
        )
        .select_from(Log)
        .join(Vehicle, Log.vehicle_id == Vehicle.id, isouter=True)
        .filter(Log.log_type == "parking")
        .filter(Log.exit_time.isnot(None))
        .filter(Log.exit_time >= start_dt, Log.exit_time < end_dt)
    )

    # ✅ Filter parking_area
    mix_q = _apply_parking_area_filter(mix_q, parking_area)

    if v_clause is not None:
        mix_q = mix_q.filter(v_clause)
    mix_q = _apply_staff_filter(mix_q, staff_val, db)

    motorbike_cnt, car_cnt, other_cnt = mix_q.one()

    vehicle_mix = VehicleMixOut(
        motorbike=int(motorbike_cnt or 0),
        car=int(car_cnt or 0),
        other=int(other_cnt or 0),
    )

    # =========================
    # daily_table - chỉ parking theo exit_time
    # =========================
    day_parking_col = func.date(Log.exit_time)

    daily_q = (
        db.query(
            day_parking_col.label("day"),
            func.count(Log.id).label("trips"),
            func.coalesce(func.sum(Log.amount), 0).label("revenue"),
            func.sum(case((Vehicle.vehicle_type == "motorbike", 1), else_=0)).label("motorbike"),
            func.sum(case((Vehicle.vehicle_type == "car", 1), else_=0)).label("car"),
            func.sum(
                case(
                    (and_(Vehicle.vehicle_type != "motorbike", Vehicle.vehicle_type != "car"), 1),
                    else_=0,
                )
            ).label("other"),
        )
        .select_from(Log)
        .join(Vehicle, Log.vehicle_id == Vehicle.id, isouter=True)
        .filter(Log.log_type == "parking")
        .filter(Log.exit_time.isnot(None))
        .filter(Log.exit_time >= start_dt, Log.exit_time < end_dt)
    )

    # ✅ Filter parking_area
    daily_q = _apply_parking_area_filter(daily_q, parking_area)

    if v_clause is not None:
        daily_q = daily_q.filter(v_clause)
    daily_q = _apply_staff_filter(daily_q, staff_val, db)

    daily_rows = daily_q.group_by(day_parking_col).order_by(day_parking_col.asc()).all()

    daily_table = [
        DailyTableRowOut(
            date=str(r.day),
            trips=int(r.trips or 0),
            revenue=int(r.revenue or 0),
            motorbike=int(r.motorbike or 0),
            car=int(r.car or 0),
            other=int(r.other or 0),
        )
        for r in daily_rows
    ]

    # =========================
    # revenue_by_source
    # =========================
    rev_source_q = (
        db.query(
            func.coalesce(
                func.sum(case((Log.log_type == "parking", Log.amount), else_=0)),
                0,
            ).label("parking_revenue"),
            func.coalesce(
                func.sum(case((Log.log_type == "monthly_payment", Log.amount), else_=0)),
                0,
            ).label("monthly_revenue"),
        )
        .select_from(Log)
        .join(Vehicle, Log.vehicle_id == Vehicle.id, isouter=True)
        .filter(report_time.isnot(None))
        .filter(report_time >= start_dt, report_time < end_dt)
    )

    # ✅ Filter parking_area
    rev_source_q = _apply_parking_area_filter(rev_source_q, parking_area)

    if v_clause is not None:
        rev_source_q = rev_source_q.filter(v_clause)
    rev_source_q = _apply_staff_filter(rev_source_q, staff_val, db)

    parking_rev, monthly_rev = rev_source_q.one()

    return ReportOut(
        summary=summary,
        revenue_by_day=revenue_by_day,
        vehicle_mix=vehicle_mix,
        daily_table=daily_table,
        revenue_by_source={
            "parking": int(parking_rev or 0),
            "monthly": int(monthly_rev or 0),
        },
    )



def _parse_date(s: str) -> date:
    return date.fromisoformat(s)





@router.get("/logs", response_model=ReportLogsOut)
def get_report_logs(
    from_date: str = Query(...),       # YYYY-MM-DD
    to_date: str = Query(...),         # YYYY-MM-DD
    kpi: str = Query("all"),           # all | total_trips | total_revenue | parking_revenue | monthly_revenue | active_in_yard | staff_active
    vehicle_type: str = Query("all"),  # all | motorbike | car | other
    staff: str = Query("all"),         # all | staff full_name
    parking_area: str = Query("all"),  # all | ParkingArea.id
    db: Session = Depends(get_db),
):
    d1 = _parse_date(from_date)
    d2 = _parse_date(to_date)
    start_dt = datetime.combine(d1, time.min)
    end_dt = datetime.combine(d2, time.max)

    entry_staff = aliased(User)
    exit_staff = aliased(User)

    q = (
        db.query(
            Log.id,
            Log.log_type,
            Log.entry_time,
            Log.exit_time,
            Log.amount,
            Vehicle.license_plate_number.label("license_plate"),
            Vehicle.vehicle_type.label("vehicle_type"),
            ParkingArea.id.label("parking_area_id"),
            ParkingArea.name.label("parking_area_name"),
            entry_staff.full_name.label("entry_staff_name"),
            exit_staff.full_name.label("exit_staff_name"),
        )
        .outerjoin(Vehicle, Vehicle.id == Log.vehicle_id)
        .outerjoin(ParkingArea, ParkingArea.id == Log.parking_area_id)
        .outerjoin(entry_staff, entry_staff.id == Log.entry_staff_id)
        .outerjoin(exit_staff, exit_staff.id == Log.exit_staff_id)
    )

    # giống invoices: ưu tiên exit_time, rồi entry_time, rồi created_at
    invoice_time = func.coalesce(Log.exit_time, Log.entry_time, Log.created_at)

    # filter theo thời gian
    if kpi == "active_in_yard":
        q = q.filter(and_(Log.entry_time >= start_dt, Log.entry_time <= end_dt))
    else:
        q = q.filter(and_(invoice_time >= start_dt, invoice_time <= end_dt))

    # KPI filter mapping
    if kpi == "total_trips":
        q = q.filter(and_(Log.log_type == "parking", Log.exit_time.isnot(None)))

    elif kpi == "total_revenue":
        q = q.filter(
            and_(
                Log.amount.isnot(None),
                or_(
                    and_(Log.log_type == "parking", Log.exit_time.isnot(None)),
                    Log.log_type == "monthly_payment",
                ),
            )
        )

    elif kpi == "parking_revenue":
        q = q.filter(and_(Log.log_type == "parking", Log.amount.isnot(None), Log.exit_time.isnot(None)))

    elif kpi == "monthly_revenue":
        q = q.filter(and_(Log.log_type == "monthly_payment", Log.amount.isnot(None)))

    elif kpi == "active_in_yard":
        q = q.filter(and_(Log.log_type == "parking", Log.exit_time.is_(None)))

    elif kpi == "staff_active":
        # (giữ đúng như code bạn đang dùng hiện tại)
        q = q.filter(and_(Log.entry_staff_id.isnot(None), Log.exit_staff_id.isnot(None)))

    # vehicle type filter
    if vehicle_type != "all":
        q = q.filter(Vehicle.vehicle_type == vehicle_type)

    # staff filter (match cả NV vào / NV ra)
    if staff != "all":
        q = q.filter(or_(entry_staff.full_name == staff, exit_staff.full_name == staff))

    # parking area filter: dùng ParkingArea.id theo đúng yêu cầu
    if parking_area != "all":
        try:
            area_id = int(parking_area)
        except Exception:
            raise HTTPException(status_code=400, detail="parking_area phải là số hoặc 'all'")
        q = q.filter(ParkingArea.id == area_id)

    q = q.order_by(invoice_time.desc(), Log.id.desc())

    rows = q.all()
    total = len(rows)
    total_amount = sum(int(r.amount or 0) for r in rows)

    out_rows = [
        ReportLogRow(
            id=r.id,
            log_type=r.log_type,
            license_plate=r.license_plate,
            vehicle_type=r.vehicle_type,
            parking_area_id=r.parking_area_id,
            parking_area_name=r.parking_area_name,
            entry_time=r.entry_time,
            exit_time=r.exit_time,
            amount=r.amount,
            entry_staff_name=r.entry_staff_name,
            exit_staff_name=r.exit_staff_name,
        )
        for r in rows
    ]

    return ReportLogsOut(rows=out_rows, total=total, total_amount=total_amount)

