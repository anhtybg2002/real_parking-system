# app/parking_slot_events/schemas.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ParkingSlotEventOut(BaseModel):
    id: int
    log_id: int
    event_type: str
    
    # Vehicle info
    vehicle_id: Optional[int] = None
    license_plate: Optional[str] = None
    
    # Parking area
    parking_area_id: Optional[int] = None
    parking_area_name: Optional[str] = None
    
    # Slots
    from_slot_id: Optional[int] = None
    from_slot_code: Optional[str] = None
    to_slot_id: Optional[int] = None
    to_slot_code: Optional[str] = None
    
    # Staff
    staff_id: Optional[int] = None
    staff_name: Optional[str] = None
    
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
