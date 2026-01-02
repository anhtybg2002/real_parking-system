# app/pricing/schemas.py
from typing import Optional
from enum import Enum
from datetime import datetime

from pydantic import BaseModel


class PricingType(str, Enum):
    block = "block"    # theo ca
    hourly = "hourly"  # theo giờ


class PricingRuleBase(BaseModel):
    vehicle_type: str
    parking_area_id: Optional[int] = None

    pricing_type: PricingType = PricingType.block

    # block pricing (xe máy)
    morning_price: int = 0
    night_price: int = 0
    monthly_price: Optional[int] = None

    # hourly pricing (ô tô)
    hourly_price_day: Optional[int] = None
    hourly_price_night: Optional[int] = None

    is_active: bool = True


class PricingRuleCreate(PricingRuleBase):
    pass


class PricingRuleUpdate(BaseModel):
    vehicle_type: Optional[str] = None
    parking_area_id: Optional[int] = None

    pricing_type: Optional[PricingType] = None

    morning_price: Optional[int] = None
    night_price: Optional[int] = None
    monthly_price: Optional[int] = None

    hourly_price_day: Optional[int] = None
    hourly_price_night: Optional[int] = None

    is_active: Optional[bool] = None


class PricingRuleRead(PricingRuleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # nếu bạn dùng Pydantic v2
