from typing import Optional
from datetime import datetime, date

from pydantic import BaseModel, Field, EmailStr


class MonthlyTicketBase(BaseModel):
    license_plate_number: str
    vehicle_type: str
    customer_name: str
    customer_phone: Optional[str] = None
    customer_id_number: Optional[str] = None
    area: Optional[str] = None
    start_date: datetime
    end_date: datetime
    price: int
    note: Optional[str] = None


class MonthlyTicketCreate(BaseModel):
    license_plate_number: str
    vehicle_type: str
    customer_name: str
    customer_phone: str
    customer_id_number: str
    email: EmailStr
    area: str
    start_date: date
    months: int = 1
    note: Optional[str] = None


class MonthlyTicketRead(MonthlyTicketBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MonthlyTicketRenewRequest(BaseModel):
    license_plate_number: str
    months: int = 1
