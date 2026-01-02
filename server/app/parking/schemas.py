# app/parking/schemas.py
from typing import Optional, Any, Dict, List
from pydantic import BaseModel, Field
from datetime import datetime
class ParkingAreaOut(BaseModel):
    id: int
    name: str
    slot_count: int=0
    current_count: int
    map_rows: Optional[int] = None
    map_cols: Optional[int] = None
    cell_size: Optional[int] = None
    is_active: bool

    class Config:
        from_attributes = True


class ParkingMapOut(BaseModel):
    parking_area_id: int
    name: str
    map_rows: int
    map_cols: int
    cell_size: int
    map_data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class ParkingSlotOut(BaseModel):
    id: int
    parking_area_id: int
    code: str
    row: int
    col: int
    vehicle_type_allowed: str
    status: str
    note: Optional[str] = None

    current_plate: Optional[str] = None
    current_vehicle_id: Optional[int] = None
    active_log_id: Optional[int] = None

    class Config:
        from_attributes = True


class ParkingSlotUpdate(BaseModel):
    code: Optional[str] = None
    vehicle_type_allowed: Optional[str] = None
    status: Optional[str] = None
    note: Optional[str] = None


class ParkingSlotSwapIn(BaseModel):
    slot_id_a: int
    slot_id_b: int


class UnassignedVehicleOut(BaseModel):
    log_id: int
    vehicle_id: int
    license_plate_number: str
    vehicle_type: str
    entry_time: datetime
    parking_area_id: Optional[int] = None

    class Config:
        from_attributes = True



class AssignLogIn(BaseModel):
    log_id: int


class ParkingMapUpdate(BaseModel):
    map_rows: Optional[int] = None
    map_cols: Optional[int] = None
    cell_size: Optional[int] = None
    map_data: Optional[Dict[str, Any]] = None  # JSON object



class CanEditMapResponse(BaseModel):
    can_edit: bool
    reason: Optional[str] = None
    occupied_count: int = 0


class ParkingAreaCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    map_rows: int = Field(default=10, ge=3, le=200)
    map_cols: int = Field(default=12, ge=3, le=200)
    cell_size: int = Field(default=36, ge=16, le=120)
    is_active: bool = True
    map_data: Optional[Dict[str, Any]] = None


class ParkingAreaToggleIn(BaseModel):
    is_active: bool