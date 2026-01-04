
from datetime import datetime, date, time
from typing import List, Optional
import traceback
from app.auth.deps import get_current_user
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session
from dateutil.relativedelta import relativedelta  # pip install python-dateutil
from app.monthlyticket.schemas import MonthlyTicketBase, MonthlyTicketCreate, MonthlyTicketRead, MonthlyTicketRenewRequest
from app.db import get_db  # đổi import này nếu bạn để get_db chỗ khác
from app.models import MonthlyTicket, User, ParkingArea

from app.monthlyticket.deps import (to_datetime_end, 
to_datetime_start, 
ensure_vehicle, 
create_payment_log_for_ticket ,
find_monthly_price_for_ticket, 
find_monthly_price_by_vehicle_and_area, 
local_date_to_utc_start, 
local_date_to_utc_end,)
from app.monthlyticket.schemas import MonthlyEmailReminderConfig
from app.monthlyticket.config_crud import get_config, upsert_config

from app.permission.guards import require_page

router = APIRouter(
    prefix="/monthly-tickets",
    tags=["Monthly Tickets"],
    dependencies=[Depends(require_page("/dashboard/monthly-ticket"))],
)
router = APIRouter(prefix="/monthly-tickets", tags=["Monthly Tickets"])

import logging

@router.get("", response_model=List[MonthlyTicketRead])
def list_monthly_tickets(
    q: Optional[str] = Query(None, description="Search theo biển số / tên / SĐT"),
    start_date: Optional[date] = Query(
        None, description="Lọc từ ngày bắt đầu (YYYY-MM-DD)"
    ),
    end_date: Optional[date] = Query(
        None, description="Lọc tới ngày hết hạn (YYYY-MM-DD)"
    ),
    db: Session = Depends(get_db),
):
    """
    Danh sách vé tháng, có filter:
    - q: biển số / tên chủ xe / SĐT (LIKE)
    - start_date: start_date >= ngày này
    - end_date: end_date <= ngày này
    """
    query = db.query(MonthlyTicket)

    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                MonthlyTicket.license_plate_number.ilike(like),
                MonthlyTicket.customer_name.ilike(like),
                MonthlyTicket.customer_phone.ilike(like),
            )
        )

    if start_date:
        query = query.filter(
            MonthlyTicket.start_date >= local_date_to_utc_start(start_date)
        )

    if end_date:
        query = query.filter(
            MonthlyTicket.end_date <= local_date_to_utc_end(end_date)
        )

    query = query.order_by(MonthlyTicket.start_date.desc())

    return query.all()


@router.post("", response_model=MonthlyTicketRead)
def create_monthly_ticket(
    payload: MonthlyTicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # default start_date = hôm nay nếu không gửi
    start_date = payload.start_date or date.today()

    if payload.months <= 0:
        raise HTTPException(
            status_code=400,
            detail="Thời gian (tháng) phải > 0.",
        )

    # tìm hoặc tạo Vehicle
    vehicle = ensure_vehicle(
        db, payload.license_plate_number, payload.vehicle_type
    )

    # lấy giá vé tháng từ PricingRule
    monthly_price = find_monthly_price_by_vehicle_and_area(
        db, payload.vehicle_type, payload.area
    )
    if monthly_price is None:
        raise HTTPException(
            status_code=400,
            detail="Chưa cấu hình giá vé tháng cho khu vực / loại xe này.",
        )

    start_dt = local_date_to_utc_start(start_date)

    

    end_dt = start_dt + relativedelta(months=payload.months)

    overlapping = (
        db.query(MonthlyTicket)
        .filter(
            MonthlyTicket.license_plate_number == payload.license_plate_number,
            MonthlyTicket.is_active == True,
            MonthlyTicket.area == payload.area,
            
        )
        .first()
    )

    if overlapping:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Biển số {payload.license_plate_number} đã có vé tháng "
                "Vui lòng gia hạn vé cũ thay vì tạo vé mới."
            ),
        )
    


    parking_area = (
        db.query(ParkingArea)
        .filter(ParkingArea.name == payload.area)
        .first()
    )
    if not parking_area:
        raise HTTPException(
            status_code=400,
            detail=f"Khu vực {payload.area} chưa tồn tại trong hệ thống.",
        )

    total_price = monthly_price * payload.months

    ticket = MonthlyTicket(
        vehicle_id=vehicle.id,
        license_plate_number=payload.license_plate_number,
        vehicle_type=payload.vehicle_type,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_id_number=payload.customer_id_number,
        email=payload.email,
        area=payload.area,
        start_date=start_dt,
        end_date=end_dt,
        price=total_price,
        note=payload.note,
        is_active=True,
    )
    db.add(ticket)
    db.flush()  # có ticket.id

    # log thanh toán
    create_payment_log_for_ticket(
        db=db,
        ticket=ticket,
        amount=total_price,
        months=payload.months,
        description=f"Mua mới vé tháng {payload.months} tháng",
        exit_staff_id=current_user.id,
        parking_area_id=parking_area.id,

    )

    db.commit()
    db.refresh(ticket)
    return ticket

@router.post("/renew", response_model=MonthlyTicketRead)
def renew_monthly_ticket(
    payload: MonthlyTicketRenewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Gia hạn vé tháng:
    - Tìm vé tháng mới nhất theo biển số
    - Tính số tiền phải thu thêm (nếu bạn muốn auto từ PricingRule)
    - Cộng thêm months vào end_date
    - Cộng tiền vào price
    - Tạo Log `monthly_payment` để lưu giao dịch gia hạn
    """
    if payload.months <= 0:
        raise HTTPException(status_code=400, detail="Số tháng gia hạn phải > 0.")

    ticket = (
        db.query(MonthlyTicket)
        .filter(MonthlyTicket.license_plate_number == payload.license_plate_number)
        .order_by(MonthlyTicket.end_date.desc())
        .first()
    )

    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy vé tháng cho biển số này.")

    if not ticket.is_active:
        raise HTTPException(status_code=400, detail="Vé tháng đã bị hủy, không thể gia hạn.")

    # 🔹 Tính tiền gia hạn:
    #  Cách 1: dùng đúng price đang có, để frontend gửi thêm nếu muốn -> bạn tự decide.
    #  Cách 2 (khuyên dùng): dùng PricingRule.monthly_price
    monthly_price = find_monthly_price_for_ticket(db, ticket)
    if monthly_price is None:
        raise HTTPException(
            status_code=400,
            detail="Chưa cấu hình giá vé tháng cho khu vực / loại xe này.",
        )

    added_amount = monthly_price * payload.months

    # 🔹 Cập nhật vé
    ticket.end_date = ticket.end_date + relativedelta(months=payload.months)
    ticket.price = (ticket.price or 0) + added_amount

    # 🔹 Log thanh toán gia hạn
    create_payment_log_for_ticket(
        db=db,
        ticket=ticket,
        amount=added_amount,
        months=payload.months,
        description=f"Gia hạn vé tháng thêm {payload.months} tháng",
        exit_staff_id=current_user.id,  # hoặc current_user.id nếu có
    )

    db.commit()
    db.refresh(ticket)
    return ticket

@router.get("/quote-monthly-price")
def quote_monthly_price(
    vehicle_type: str,
    area: str,
    db: Session = Depends(get_db),
):
    price = find_monthly_price_by_vehicle_and_area(db, vehicle_type, area)
    if price is None:
        raise HTTPException(
            status_code=404,
            detail="Chưa cấu hình giá vé tháng cho khu vực / loại xe này.",
        )
    return {"monthly_price": price}



@router.get("/{ticket_id}", response_model=MonthlyTicketRead)
def get_monthly_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(MonthlyTicket).get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy vé tháng.")
    return ticket


@router.post("/send-test")
def send_test_email(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Send a test reminder email to provided address using the monthly_expiry_email template."""
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    print(f"[monthlyticket.routes] send_test_email called by user={getattr(current_user, 'id', None)} email={email}")

    # render template with sample data
    from app.template.crud import ensure_template_exists
    from app.template.render import render_template
    
    from app.site_info.crud import get_site_info
    from app.monthlyticket.cron import _send_email_smtp
    tpl = ensure_template_exists(db, "monthly_expiry_email")

    site_info = get_site_info(db)
    data = {
        "customer_name": "Khách hàng thử",
        "license_plate": "TEST-000",
        "end_date": (date.today()).strftime("%Y-%m-%d"),
        "days_left": 7,
        "site_name": site_info.get("site_name", "Hệ thống quản lý đỗ xe"),
        "site_phone": site_info.get("site_phone", ""),
    }

    subject = render_template(tpl.subject or "[Test] Vé tháng sắp hết hạn", data) if tpl and tpl.subject else "[Test] Vé tháng sắp hết hạn"
    body = render_template(tpl.body or "Test email body", data) if tpl else "Test email body"

    try:
        print(f"[monthlyticket.routes] Sending test email to {email}")
        _send_email_smtp(subject=subject, body=body, to_email=email)
        print(f"[monthlyticket.routes] Sent test email to {email}")
        return {"ok": True, "message": "Sent test email"}
    except Exception as e:
        print(f"[monthlyticket.routes] Error sending test email to {email}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/settings/email-reminder", response_model=MonthlyEmailReminderConfig)
def get_email_reminder_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # require admin
    if getattr(current_user, "role", "") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    cfg = get_config(db)
    if not cfg:
        return MonthlyEmailReminderConfig()
    filtered = {
        "enabled": cfg.get("enabled", False),
        "days_before": cfg.get("days_before", [7]) or [7],
        "send_time": cfg.get("send_time", "23:00"),
        "test_email": cfg.get("test_email"),
    }
    return MonthlyEmailReminderConfig(**filtered)


@router.put("/settings/email-reminder", response_model=MonthlyEmailReminderConfig)
def update_email_reminder_settings(payload: MonthlyEmailReminderConfig, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # require admin
    if getattr(current_user, "role", "") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    # store into separate monthly_ticket_sending_config table
    upsert_config(db, payload.dict(), updated_by=current_user.id)
    return payload


@router.delete("/{ticket_id}")
def delete_monthly_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(MonthlyTicket).get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy vé tháng.")

    db.delete(ticket)
    db.commit()
    return {"ok": True, "message": "Đã xóa vé tháng."}

