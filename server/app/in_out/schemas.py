# app/in_out/schemas.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# =========================
# 🚘 VEHICLE
# =========================
class VehicleBase(BaseModel):
    license_plate_number: str
    vehicle_type: str  # motorbike | car


class VehicleOut(VehicleBase):
    id: int

    class Config:
        orm_mode = True


# =========================
# 🅿️ PARKING AREA
# =========================
class ParkingAreaOut(BaseModel):
    id: int
    name: str
    slot_count: int
    current_count: int

    class Config:
        orm_mode = True


# =========================
# 🅿️ PARKING SLOT (để LogOut trả được slot khi bạn đã thêm slot_id vào Log)
# =========================
class ParkingSlotOut(BaseModel):
    id: int
    parking_area_id: int
    code: str
    row: int
    col: int
    status: str
    vehicle_type_allowed: str
    note: Optional[str] = None

    class Config:
        orm_mode = True


# =========================
# 🧾 ENTRY / EXIT INPUT
# =========================
class VehicleEntryIn(BaseModel):
    license_plate_number: str
    vehicle_type: str

    # NEW: dùng id bãi xe (khớp model mới)
    parking_area_id: int

    # NEW: nếu FE chọn slot thì gửi lên
    preferred_slot_id: Optional[int] = None

    # ảnh biển số lúc vào
    entry_plate_image_base64: Optional[str] = None


class VehicleExitIn(BaseModel):
    license_plate_number: str
    exit_plate_image_base64: Optional[str] = None


# =========================
# 🧾 LOG OUTPUT
# =========================
class LogOut(BaseModel):
    id: int
    entry_time: datetime
    exit_time: Optional[datetime]

    vehicle: VehicleOut
    parking_area: Optional[ParkingAreaOut]
    parking_slot: Optional[ParkingSlotOut]

    duration_hours: Optional[int] = None
    amount: Optional[int] = None
    is_monthly_ticket: Optional[bool] = None
    pricing_rule_id: Optional[int] = None

    class Config:
        orm_mode = True

