from sqlalchemy.orm import Session
from app.models import MonthlyTicketSendingConfig

DEFAULT_CONFIG = {
    "enabled": False,
    "days_before": [7],
    "send_time": "23:00",
    "test_email": "",
}



def get_config(db: Session):
    row = db.query(MonthlyTicketSendingConfig).first()
    if not row:
        # create default
        row = MonthlyTicketSendingConfig(value=DEFAULT_CONFIG)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row.value or DEFAULT_CONFIG


def upsert_config(db: Session, payload: dict, updated_by: int | None = None):
    row = db.query(MonthlyTicketSendingConfig).first()
    if not row:
        row = MonthlyTicketSendingConfig(value=payload, updated_by=updated_by)
        db.add(row)
    else:
        row.value = payload
        row.updated_by = updated_by
    db.commit()
    db.refresh(row)
    return row.value
