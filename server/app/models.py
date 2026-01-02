from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime,UniqueConstraint ,  func, Text, JSON
from app.db import Base
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

# -------------------------------------------------
# User
# -------------------------------------------------
def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="staff")

    full_name = Column(String(100), nullable=True)
    phone = Column(String(20), unique=True, nullable=True)
    email = Column(String(120), unique=True, nullable=True)

    

    is_active = Column(Boolean, default=True)


# -------------------------------------------------
# Vehicle
# -------------------------------------------------


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    license_plate_number = Column(String, unique=True, index=True, nullable=False)
    vehicle_type = Column(String(20), nullable=False)

    logs = relationship("Log", back_populates="vehicle")

    # 🔹 NEW: Quan hệ tới vé tháng
    monthly_tickets = relationship(
        "MonthlyTicket",
        back_populates="vehicle",
        cascade="all, delete-orphan",
    )


# -------------------------------------------------
# ParkingArea
# -------------------------------------------------


class ParkingArea(Base):
    __tablename__ = "parking_areas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    # Tổng số chỗ (có thể sync theo số slot)
    slot_count = Column(Integer, nullable=False, default=0)

    current_count = Column(Integer, default=0)

    # --- NEW: cấu hình bản đồ lưới đơn giản ---
    map_rows = Column(Integer, nullable=False, default=10)
    map_cols = Column(Integer, nullable=False, default=12)
    cell_size = Column(Integer, nullable=False, default=36)

    # Lưu layout đơn giản: lane/blocked/entrance... (JSON string)
    # Ví dụ {"cells":{"0-0":{"kind":"ENTRANCE"},"2-5":{"kind":"BLOCKED"}}}
    map_data = Column(Text, nullable=True)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Quan hệ
    logs = relationship("Log", back_populates="parking_area")
    slots = relationship("ParkingSlot", back_populates="parking_area", cascade="all, delete-orphan")



class ParkingSlot(Base):
    __tablename__ = "parking_slots"

    id = Column(Integer, primary_key=True, index=True)

    parking_area_id = Column(
        Integer,
        ForeignKey("parking_areas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Mã chỗ: A1-01...
    code = Column(String(50), nullable=False)

    # Vị trí trên lưới
    row = Column(Integer, nullable=False)
    col = Column(Integer, nullable=False)

    # Loại xe cho phép (để sau này lọc/điều hướng)
    vehicle_type_allowed = Column(String(20), nullable=False, default="motorbike")


    
    # Trạng thái slot (đồng bộ với UI)
    # EMPTY | RESERVED | OCCUPIED | LOCKED | MAINT
    status = Column(String(20), nullable=False, default="EMPTY", index=True)

    note = Column(String(255), nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    parking_area = relationship("ParkingArea", back_populates="slots")

    __table_args__ = (
        UniqueConstraint("parking_area_id", "code", name="uq_slot_code_in_area"),
        UniqueConstraint("parking_area_id", "row", "col", name="uq_slot_position_in_area"),
    )
    
    logs = relationship(
    "Log",
    back_populates="parking_slot",
    foreign_keys="Log.parking_slot_id",
    )


class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)

    
    log_type = Column(String(30), nullable=False, default="parking")

    # --- Tham chiếu đối tượng liên quan ---
    vehicle_id = Column(
        Integer,
        ForeignKey("vehicles.id", ondelete="RESTRICT"),
        nullable=True,   # parking: thường != None, payment: vẫn có vehicle
    )

    parking_area_id = Column(
        Integer,
        ForeignKey("parking_areas.id", ondelete="RESTRICT"),
        nullable=True,   # monthly_payment có thể không gắn bãi cụ thể
    )

    entry_staff_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    exit_staff_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # NEW: log liên quan tới vé tháng nào (nếu là thanh toán/gia hạn)
    monthly_ticket_id = Column(
        Integer,
        ForeignKey("monthly_tickets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    
    entry_time = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    exit_time = Column(DateTime, nullable=True)


    duration_hours = Column(Integer, nullable=True)      
    amount = Column(Integer, nullable=True)              
    is_monthly_ticket = Column(Boolean, default=False)   
    pricing_rule_id = Column(
        Integer,
        ForeignKey("pricing_rules.id", ondelete="SET NULL"),
        nullable=True,
    )

    
    description = Column(String(255), nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    
    vehicle = relationship("Vehicle", back_populates="logs")
    parking_area = relationship("ParkingArea", back_populates="logs")
    
    entry_plate_image = Column(Text, nullable=True)
    exit_plate_image = Column(Text, nullable=True)

    entry_staff = relationship(
    "User",
    foreign_keys=[entry_staff_id],
    backref="entry_logs"
    )

    exit_staff = relationship(
        "User",
        foreign_keys=[exit_staff_id],
        backref="exit_logs"
    )
    parking_slot_id = Column(
    Integer,
    ForeignKey("parking_slots.id", ondelete="SET NULL"),
    nullable=True,
    index=True,
    )

    

    parking_slot = relationship(
    "ParkingSlot",
    back_populates="logs",
    foreign_keys=[parking_slot_id],
    )


    pricing_rule = relationship("PricingRule")

    monthly_ticket = relationship("MonthlyTicket", back_populates="logs")




# -------------------------------------------------
# Quy tắc giá
# -------------------------------------------------


class PricingRule(Base):
    __tablename__ = "pricing_rules"

    id = Column(Integer, primary_key=True, index=True)

    vehicle_type = Column(String(20), nullable=False, index=True)

    parking_area_id = Column(
        Integer,
        ForeignKey("parking_areas.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    parking_area = relationship("ParkingArea")

    # NEW: loại hình tính giá ("hourly" hoặc "block")
    pricing_type = Column(String(20), nullable=False, default="block")

    # --- Giá áp dụng theo ca (xe máy dùng block pricing) ---
    morning_price = Column(Integer, nullable=True)
    night_price = Column(Integer, nullable=True)
    monthly_price = Column(Integer, nullable=True)


    

    # --- Giá áp dụng theo giờ (ô tô dùng hourly pricing) ---
    hourly_price_day = Column(Integer, nullable=True)      # giá ban ngày theo giờ
    hourly_price_night = Column(Integer, nullable=True)    # giá ban đêm theo giờ

    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    __table_args__ = (
        UniqueConstraint(
            "vehicle_type",
            "parking_area_id",
            name="uq_pricing_vehicle_parking_area",
        ),
    )



class MonthlyTicket(Base):
    __tablename__ = "monthly_tickets"

    id = Column(Integer, primary_key=True, index=True)

    # Gắn với 1 xe cụ thể
    vehicle_id = Column(
        Integer,
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Cache lại biển số cho truy vấn nhanh / phòng khi muốn cho phép đổi biển
    license_plate_number = Column(String, index=True, nullable=False)

    # Loại xe ở thời điểm đăng ký vé (car / motorbike / other)
    vehicle_type = Column(String(20), nullable=False)

    # Thông tin chủ xe
    customer_name = Column(String(100), nullable=False)
    customer_phone = Column(String(20), nullable=False)
    customer_id_number = Column(String(50), nullable=False)  # CMND/CCCD (nếu cần)
    email = Column(String(50),nullable=False)
    # Khu vực bãi (nếu vé tháng gắn với khu cố định)
    area = Column(String(50), nullable=True, index=True)
    # Thời hạn vé
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)

    # Giá đã thu cho vé tháng này (theo thời điểm bán)
    price = Column(Integer, nullable=False)

    # Vé còn hiệu lực hay đã hủy thủ công
    is_active = Column(Boolean, nullable=False, default=True)

    note = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # Quan hệ ngược
    vehicle = relationship("Vehicle", back_populates="monthly_tickets")
    logs = relationship("Log", back_populates="monthly_ticket")


class ParkingSlotEvent(Base):
    __tablename__ = "parking_slot_events"

    id = Column(Integer, primary_key=True, index=True)

    # log parking session đang active (hoặc log liên quan)
    log_id = Column(Integer, ForeignKey("logs.id", ondelete="CASCADE"), nullable=False, index=True)

    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="RESTRICT"), nullable=True, index=True)
    parking_area_id = Column(Integer, ForeignKey("parking_areas.id", ondelete="RESTRICT"), nullable=True, index=True)

    # event types: ASSIGN | RELEASE | SWAP | MOVE | LOCK | UNLOCK
    event_type = Column(String(20), nullable=False, index=True)

    from_slot_id = Column(Integer, ForeignKey("parking_slots.id", ondelete="SET NULL"), nullable=True, index=True)
    to_slot_id = Column(Integer, ForeignKey("parking_slots.id", ondelete="SET NULL"), nullable=True, index=True)

    staff_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    note = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # relationships (optional)
    log = relationship("Log", foreign_keys=[log_id])
    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id])
    parking_area = relationship("ParkingArea", foreign_keys=[parking_area_id])
    from_slot = relationship("ParkingSlot", foreign_keys=[from_slot_id])
    to_slot = relationship("ParkingSlot", foreign_keys=[to_slot_id])
    staff = relationship("User", foreign_keys=[staff_id])



class Template(Base):
    __tablename__ = "templates"
    __table_args__ = (
        UniqueConstraint("key", name="uq_templates_key"),
    )

    id = Column(Integer, primary_key=True, index=True)

    # key cố định: "invoice_print" | "monthly_expiry_email"
    key = Column(String(64), nullable=False, index=True)

    # email: cần subject; invoice: subject có thể null
    subject = Column(String(255), nullable=True)

    # body template (text)
    body = Column(Text, nullable=False)

    # optional meta
    description = Column(String(255), nullable=True)

    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)


class Page(Base):
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True)
    key = Column(String(50), unique=True, nullable=False)
    label = Column(String(100), nullable=False)
    path = Column(String(200), unique=True, nullable=False)



class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True)
    label = Column(String(100), nullable=False)
    icon = Column(String(50), nullable=True)
    path = Column(String(200), unique=True, nullable=False)
    roles = Column(JSON, nullable=False) 


class SiteInfo(Base):
    __tablename__ = "site_info"

    id = Column(Integer, primary_key=True)  # luôn dùng id = 1
    value = Column(JSON, nullable=False)    # chứa toàn bộ thông tin UI
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)