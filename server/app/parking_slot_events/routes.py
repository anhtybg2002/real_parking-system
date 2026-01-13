# app/parking_slot_events/routes.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from app.db import get_db
from app.auth.deps import get_current_user
from app.models import User, ParkingSlotEvent, Vehicle, ParkingArea, ParkingSlot
from .schemas import ParkingSlotEventOut

router = APIRouter(prefix="/parking-slot-events", tags=["Parking Slot Events"])


@router.get("", response_model=List[ParkingSlotEventOut])
def list_parking_slot_events(
    license_plate: Optional[str] = Query(None, description="Lọc theo biển số xe"),
    parking_area_id: Optional[int] = Query(None, description="Lọc theo bãi xe"),
    slot_code: Optional[str] = Query(None, description="Lọc theo mã slot"),
    date_from: Optional[date] = Query(None, description="Từ ngày (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="Đến ngày (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lấy danh sách lịch sử sự kiện chỗ đỗ xe với filters
    """
    try:
        query = db.query(ParkingSlotEvent).outerjoin(
            Vehicle, Vehicle.id == ParkingSlotEvent.vehicle_id
        ).outerjoin(
            ParkingArea, ParkingArea.id == ParkingSlotEvent.parking_area_id
        ).outerjoin(
            ParkingSlot, (ParkingSlot.id == ParkingSlotEvent.from_slot_id)
        )
        
        # Filter by license plate
        if license_plate:
            plate = license_plate.strip().upper()
            query = query.filter(Vehicle.license_plate_number.ilike(f"%{plate}%"))
        
        # Filter by parking area
        if parking_area_id:
            query = query.filter(ParkingSlotEvent.parking_area_id == parking_area_id)
        
        # Filter by slot code
        if slot_code:
            code = slot_code.strip().upper()
            query = query.filter(
                ParkingSlot.code.ilike(f"%{code}%")
            )
        
        # Filter by date range
        if date_from:
            start_dt = datetime.combine(date_from, datetime.min.time())
            query = query.filter(ParkingSlotEvent.created_at >= start_dt)
        
        if date_to:
            end_dt = datetime.combine(date_to, datetime.max.time())
            query = query.filter(ParkingSlotEvent.created_at <= end_dt)
        
        # Order by newest first
        query = query.order_by(ParkingSlotEvent.created_at.desc())
        
        # Pagination
        events = query.offset(offset).limit(limit).all()
        
        # Build response with joined data
        result = []
        for event in events:
            result.append(ParkingSlotEventOut(
                id=event.id,
                log_id=event.log_id,
                event_type=event.event_type,
                vehicle_id=event.vehicle_id,
                license_plate=event.vehicle.license_plate_number if event.vehicle else None,
                parking_area_id=event.parking_area_id,
                parking_area_name=event.parking_area.name if event.parking_area else None,
                from_slot_id=event.from_slot_id,
                from_slot_code=event.from_slot.code if event.from_slot else None,
                to_slot_id=event.to_slot_id,
                to_slot_code=event.to_slot.code if event.to_slot else None,
                staff_id=event.staff_id,
                staff_name=event.staff.username if event.staff else None,
                note=event.note,
                created_at=event.created_at,
            ))
        
        return result
    
    except Exception as e:
        print(f"Error in list_parking_slot_events: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
