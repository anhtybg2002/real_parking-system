import os
from datetime import datetime, timedelta, timezone
import smtplib
import ssl
from email.message import EmailMessage

from dotenv import load_dotenv
from sqlalchemy.orm import Session
from zoneinfo import ZoneInfo
import logging
import traceback

from app.db import SessionLocal
from app.models import MonthlyTicket, Log
from app.template.crud import ensure_template_exists
from app.template.render import render_template
from app.site_info.crud import get_site_info
from app.monthlyticket.config_crud import get_config


load_dotenv()

# configure simple logging to console for cron debugging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("monthlyticket.cron")


def _send_email_smtp(subject: str, body: str, to_email: str, from_email: str | None = None) -> None:
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "465"))
    user = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    use_ssl = os.getenv("SMTP_USE_SSL", "true").lower() in ("1", "true", "yes")

    if not host:
        raise RuntimeError("SMTP_HOST not configured")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_email or user or "no-reply@example.com"
    msg["To"] = to_email
    msg.set_content(body)

    if use_ssl:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(host, port, context=context) as server:
            if user and password:
                server.login(user, password)
            server.send_message(msg)
    else:
        with smtplib.SMTP(host, port) as server:
            server.starttls()
            if user and password:
                server.login(user, password)
            server.send_message(msg)




def notify_expiring_tickets(days_before: int = 7):
    """
    Gửi email nhắc cho các vé tháng sắp hết hạn trong `days_before` ngày.
    - Không gửi lại nếu đã có log `monthly_expiry_notification` cho vé đó.
    """
    db: Session = SessionLocal()
    sent = 0
    failed = 0
    try:
        logger.info("notify_expiring_tickets start: days_before=%s", days_before)
        # DB stores naive UTC datetimes (datetime.utcnow()), so use naive now
        now = datetime.utcnow()
        end_window = now + timedelta(days=days_before)

        tickets = (
            db.query(MonthlyTicket)
            .filter(MonthlyTicket.is_active == True)
            .filter(MonthlyTicket.end_date >= now)
            .filter(MonthlyTicket.end_date <= end_window)
            .all()
        )

        if not tickets:
            logger.info("No expiring tickets found in next %s days", days_before)
            return

        site = get_site_info(db)

        for t in tickets:
            # tránh gửi trùng
            existed = (
                db.query(Log)
                .filter(Log.log_type == "monthly_expiry_notification")
                .filter(Log.monthly_ticket_id == t.id)
                .first()
            )
            if existed:
                continue

            tpl = ensure_template_exists(db, "monthly_expiry_email")
            # normalize ticket end_date to naive UTC for subtraction/formatting
            end_dt = t.end_date
            if getattr(end_dt, "tzinfo", None) is not None:
                end_dt = end_dt.astimezone(timezone.utc).replace(tzinfo=None)

            data = {
                "customer_name": t.customer_name,
                "license_plate": t.license_plate_number,
                "end_date": end_dt.strftime("%Y-%m-%d"),
                "days_left": max(0, (end_dt - now).days),
                "site_name": site.get("site_name", ""),
                "site_phone": site.get("site_phone", ""),
            }

            subject = render_template(tpl.subject or "", data) if tpl.subject else f"Vé tháng sắp hết hạn: {t.license_plate_number}"
            body = render_template(tpl.body or "", data)

            try:
                logger.info("Sending expiry email to %s (ticket_id=%s, end_date=%s, days_left=%s)", t.email, t.id, data["end_date"], data["days_left"])
                _send_email_smtp(subject=subject, body=body, to_email=t.email)
                # tạo log để tránh gửi trùng
                log = Log(
                    log_type="monthly_expiry_notification",
                    monthly_ticket_id=t.id,
                    entry_time=datetime.utcnow(),
                    description=f"Sent expiry email to {t.email}",
                )
                db.add(log)
                db.commit()
                sent += 1
                logger.info("Email sent to %s", t.email)
            except Exception as ex:
                failed += 1
                logger.exception("Failed to send expiry email to %s: %s", t.email, ex)
                # Không raise ở cron; chỉ ghi log lỗi vào DB để sau này kiểm tra
                err_log = Log(
                    log_type="monthly_expiry_notification",
                    monthly_ticket_id=t.id,
                    entry_time=datetime.utcnow(),
                    description=f"Failed to send expiry email to {t.email}: {str(ex)}",
                )
                db.add(err_log)
                db.commit()
                # also record traceback string in console for quick debugging
                logger.debug(traceback.format_exc())
        logger.info("notify_expiring_tickets finished: sent=%s failed=%s", sent, failed)
    finally:
        db.close()


def get_reminder_config(db: Session):
    """Return reminder config from monthly_ticket_sending_config table.
    Expected shape (flat):
      {"enabled": bool, "days_before": [int], "send_time": "HH:MM", "test_email": "..."}
    """
    cfg = get_config(db)
    if not cfg:
        return {
            "enabled": False,
            "days_before": [7],
            "send_time": "23:00",
            "test_email": "",
        }
    # normalize
    return {
        "enabled": bool(cfg.get("enabled", False)),
        "days_before": cfg.get("days_before", [7]) or [7],
        "send_time": cfg.get("send_time", "23:00"),
        "test_email": cfg.get("test_email", ""),
    }


def job_wrapper():
    # Wrapper để APScheduler gọi. Reads settings from SiteInfo and triggers
    # notify_expiring_tickets for configured days_before only when current
    # Asia/Ho_Chi_Minh time matches configured send_time.
    logger.info("job_wrapper invoked")
    db = SessionLocal()
    try:
        cfg = get_reminder_config(db)
        if not cfg["enabled"]:
            logger.info("monthly email reminder disabled in config")
            return

        # check current time in Asia/Ho_Chi_Minh
        now_local = datetime.now(ZoneInfo("Asia/Ho_Chi_Minh"))
        send_time = cfg.get("send_time") or "23:00"
        try:
            hour, minute = [int(x) for x in send_time.split(":")]
        except Exception:
            hour, minute = 23, 0

        if now_local.hour == hour and now_local.minute == minute:
            logger.info("send_time matches current time %02d:%02d, running reminders", hour, minute)
            for d in cfg.get("days_before", []):
                try:
                    notify_expiring_tickets(days_before=int(d))
                except Exception:
                    logger.exception("Error while notifying for days_before=%s", d)
        else:
            logger.info("send_time %s does not match now %02d:%02d, skipping", send_time, now_local.hour, now_local.minute)
    finally:
        db.close()
