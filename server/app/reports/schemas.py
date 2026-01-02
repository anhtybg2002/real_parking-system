from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, date
class RevenueBySourceOut(BaseModel):
    parking: int
    monthly: int

class ReportSummaryOut(BaseModel):
    total_trips: int
    total_revenue: int
    active_in_yard: int
    staff_active: int

class RevenueByDayRowOut(BaseModel):
    date: str  # YYYY-MM-DD
    revenue: int

class DailyTableRowOut(BaseModel):
    date: str  # YYYY-MM-DD
    trips: int
    revenue: int
    motorbike: int
    car: int
    other: int

class VehicleMixOut(BaseModel):
    motorbike: int
    car: int
    other: int

class ReportOut(BaseModel):
    summary: ReportSummaryOut
    revenue_by_day: List[RevenueByDayRowOut]
    vehicle_mix: VehicleMixOut
    daily_table: List[DailyTableRowOut]
    revenue_by_source: RevenueBySourceOut



class ReportLogRow(BaseModel):
    id: int
    log_type: str
    license_plate: Optional[str] = None
    vehicle_type: Optional[str] = None
    parking_area_id: Optional[int] = None
    parking_area_name: Optional[str] = None

    entry_time: Optional[datetime] = None
    exit_time: Optional[datetime] = None

    amount: Optional[int] = None

    entry_staff_name: Optional[str] = None
    exit_staff_name: Optional[str] = None

class ReportLogsOut(BaseModel):
    rows: List[ReportLogRow]
    total: int
    total_amount: int



