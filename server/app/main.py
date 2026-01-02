# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import json

# đảm bảo models được load để Base biết các bảng
import app.models  # noqa: F401

from app.db import Base, engine, SessionLocal
from app.models import User, ParkingArea, ParkingSlot, Permission

from app.auth.security import hash_password
from app import (
    auth,
    in_out,
    dashboard,
    pricing,
    monthlyticket,
    user,
    invoices,
    streaming,
    reports,
    parking,
    template,
    permission,
    site_info,
)

app = FastAPI(title="Parking System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# tạo bảng
Base.metadata.create_all(bind=engine)


# -----------------------------
# Seed admin
# -----------------------------
def init_admin():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            plain_pw = "admin123"
            if len(plain_pw) > 72:
                plain_pw = plain_pw[:72]

            admin = User(
                username="admin",
                password_hash=hash_password(plain_pw),
                role="admin",
                full_name="System Admin",
                phone="0971930966",
                email="anhtybg2002@gmail.com",
                is_active=True,
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()


# -----------------------------
# Seed ParkingArea + Map + Slots
# -----------------------------
def init_default_parking_area():
    """
    Tạo bãi S1 khớp UI:
    - map_rows=10, map_cols=12, cell_size=36
    - map_data mặc định
    """
    db = SessionLocal()
    try:
        area = db.query(ParkingArea).filter(ParkingArea.name == "S1").first()
        if not area:
            area = ParkingArea(
                name="S1",
                slot_count=0,
                current_count=0,
                map_rows=10,
                map_cols=12,
                cell_size=36,
                map_data=json.dumps({"mode": "GRID", "rows": 10, "cols": 12, "cells": {}}, ensure_ascii=False),
                is_active=True,
            )
            db.add(area)
            db.commit()
            db.refresh(area)
    finally:
        db.close()


def init_default_map_and_slots():
    """
    Seed map_data + slot mẫu (giống demo UI).
    Chỉ seed khi S1 chưa có slot.
    """
    db = SessionLocal()
    try:
        area = db.query(ParkingArea).filter(ParkingArea.name == "S1").first()
        if not area:
            return

        existed = db.query(ParkingSlot).filter(ParkingSlot.parking_area_id == area.id).first()
        if existed:
            return

        # map_data: demo vài ô đặc biệt
        map_data = {
            "mode": "GRID",
            "rows": area.map_rows,
            "cols": area.map_cols,
            "cells": {
                "0-0": {"kind": "ENTRANCE", "name": "Gate 1"},
                "0-1": {"kind": "LANE"},
                "0-2": {"kind": "LANE"},
                "2-5": {"kind": "BLOCKED"},
                "2-6": {"kind": "BLOCKED"},
            },
        }
        area.map_data = json.dumps(map_data, ensure_ascii=False)

        slots_seed = [
            ("A1-01", 1, 1, "motorbike", "EMPTY"),
            ("A1-02", 1, 2, "motorbike", "OCCUPIED"),
            ("A1-03", 1, 3, "motorbike", "RESERVED"),
            ("B1-01", 3, 1, "car", "LOCKED"),
            ("B1-02", 3, 2, "car", "MAINT"),
            ("C1-01", 6, 6, "motorbike", "EMPTY"),
            ("C1-02", 6, 7, "motorbike", "EMPTY"),
            ("D1-01", 8, 9, "car", "OCCUPIED"),
        ]

        for code, r, c, vtype, status in slots_seed:
            db.add(
                ParkingSlot(
                    parking_area_id=area.id,
                    code=code,
                    row=r,
                    col=c,
                    vehicle_type_allowed=vtype,
                    status=status,
                )
            )

        # sync slot_count
        # (commit trước để count chính xác nếu DB cần flush)
        db.commit()
        total_slots = db.query(ParkingSlot).filter(ParkingSlot.parking_area_id == area.id).count()
        area.slot_count = total_slots
        db.commit()
    finally:
        db.close()


# -----------------------------
# Seed permissions
# -----------------------------
DEFAULT_PERMISSIONS = [
    ("Trang chủ", "dashboard", "/dashboard", ["admin", "staff"]),
    ("Xe Vào/ Ra", "entry", "/dashboard/inout", ["admin", "staff"]),
    ("Vé Tháng", "monthly_ticket", "/dashboard/monthly-ticket", ["admin", "staff"]),
    ("Hóa đơn", "invoices", "/dashboard/invoices", ["admin", "staff"]),
    ("Cấu hình giá", "pricing", "/dashboard/pricing", ["admin"]),
    ("Quản lý chỗ đỗ bãi xe", None, "/dashboard/parking-area", ["admin"]),
    ("Nhân viên", "staff", "/dashboard/staff", ["admin"]),
    ("Báo cáo", "reports", "/dashboard/reports", ["admin"]),
    ("Cài đặt", "settings", "/dashboard/settings", ["admin"]),
]


def init_permissions():
    db = SessionLocal()
    try:
        for label, icon, path, roles in DEFAULT_PERMISSIONS:
            exists = db.query(Permission).filter(Permission.path == path).first()
            if not exists:
                db.add(
                    Permission(
                        label=label,
                        icon=icon,
                        path=path,
                        roles=roles,
                    )
                )
        db.commit()
    finally:
        db.close()


# ✅ chạy seed đúng thời điểm startup (đỡ bị chạy lại khi hot reload import)
@app.on_event("startup")
def on_startup():
    init_default_parking_area()
    init_default_map_and_slots()
    init_admin()
    init_permissions()


# -----------------------------
# Routers
# -----------------------------
app.include_router(auth.router)
app.include_router(in_out.router)
app.include_router(dashboard.router)
app.include_router(pricing.router)
app.include_router(monthlyticket.router)
app.include_router(user.router)
app.include_router(invoices.router)
app.include_router(streaming.router)
app.include_router(reports.router)
app.include_router(parking.router)
app.include_router(template.router)
app.include_router(permission.router)
app.include_router(site_info.router)


@app.get("/health")
def health():
    return {"status": "ok"}
