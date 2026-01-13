# app/api/v1/endpoints/pricing_rules.py

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db import get_db
from app.models import PricingRule
from app.pricing.schemas import (
    PricingRuleCreate,
    PricingRuleUpdate,
    PricingRuleRead,
)
from app.permission.guards import require_page

router = APIRouter(prefix="/pricing/rules", tags=["pricing"], dependencies=[Depends(require_page("/dashboard/pricing"))])


@router.get("", response_model=List[PricingRuleRead])
def list_pricing_rules(
    db: Session = Depends(get_db),
    include_inactive: bool = True,
):
    """
    Danh sách các rule giá.
    - Có thể filter bỏ những rule inactive bằng include_inactive=False
    - Sắp xếp theo vehicle_type, parking_area_id.
    """
    query = db.query(PricingRule)
    if not include_inactive:
        query = query.filter(PricingRule.is_active == True)  # noqa: E712

    rules = query.order_by(
        PricingRule.vehicle_type,
        PricingRule.parking_area_id,
    ).all()
    return rules


@router.post(
    "",
    response_model=PricingRuleRead,
    status_code=status.HTTP_201_CREATED,
)
def create_pricing_rule(
    payload: PricingRuleCreate,
    db: Session = Depends(get_db),
):
    """
    Tạo mới cấu hình giá, bao gồm:
    - vehicle_type
    - parking_area_id (FK tới parking_areas.id, có thể None = áp dụng toàn bãi)
    - pricing_type:
        + "block"  : tính theo ca (morning_price, night_price, monthly_price)
        + "hourly" : tính theo giờ (hourly_price_day, hourly_price_night)
    - is_active

    Quy ước business:
    - Xe máy (motorbike)  : dùng pricing_type = "block"
    - Ô tô (car)          : dùng pricing_type = "hourly"
    - Loại khác           : dùng pricing_type trong payload

    Ràng buộc:
    - (vehicle_type, parking_area_id) không được trùng lặp.
    """

    # Check trùng (vehicle_type, parking_area_id)
    existed = (
        db.query(PricingRule)
        .filter(
            PricingRule.vehicle_type == payload.vehicle_type,
            PricingRule.parking_area_id == payload.parking_area_id,
        )
        .first()
    )
    if existed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đã tồn tại bảng giá cho loại xe này tại khu vực này.",
        )

    # Xác định pricing_type theo business
    if payload.vehicle_type == "car":
        pricing_type = "hourly"
        # Ô tô bắt buộc phải có giá theo giờ
        if payload.hourly_price_day is None and payload.hourly_price_night is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ô tô (car) phải khai báo ít nhất một trong hourly_price_day hoặc hourly_price_night.",
            )
    elif payload.vehicle_type == "motorbike":
        pricing_type = "block"
        # Xe máy cần giá theo ca
        if payload.morning_price is None or payload.night_price is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Xe máy (motorbike) phải khai báo morning_price và night_price.",
            )
    else:
        # Các loại xe khác: lấy theo payload.pricing_type (Enum kế thừa str)
        pricing_type = str(payload.pricing_type)

    rule = PricingRule(
        vehicle_type=payload.vehicle_type,
        parking_area_id=payload.parking_area_id,
        pricing_type=pricing_type,
        # block pricing
        morning_price=payload.morning_price,
        night_price=payload.night_price,
        monthly_price=payload.monthly_price,
        # hourly pricing
        hourly_price_day=payload.hourly_price_day,
        hourly_price_night=payload.hourly_price_night,
        is_active=payload.is_active,
    )

    db.add(rule)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Phòng trường hợp constraint UNIQUE (vehicle_type, parking_area_id) ở DB bắn lỗi
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đã tồn tại bảng giá cho loại xe này tại khu vực này.",
        )

    db.refresh(rule)
    return rule


@router.get("/{rule_id}", response_model=PricingRuleRead)
def get_pricing_rule(
    rule_id: int,
    db: Session = Depends(get_db),
):
    """
    Lấy chi tiết 1 rule giá theo ID.
    """
    rule = db.query(PricingRule).filter(PricingRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Pricing rule not found")
    return rule


@router.put("/{rule_id}", response_model=PricingRuleRead)
def update_pricing_rule(
    rule_id: int,
    payload: PricingRuleUpdate,
    db: Session = Depends(get_db),
):
    """
    Cập nhật cấu hình giá.
    - Chỉ những field được gửi lên (không unset) mới được update.
    - Sau update vẫn phải đảm bảo (vehicle_type, parking_area_id)
      không trùng với rule khác.
    """
    rule = db.query(PricingRule).filter(PricingRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Pricing rule not found")

    update_data = payload.dict(exclude_unset=True)

    # Lấy giá trị vehicle_type & parking_area_id sau update (nếu có gửi lên)
    new_vehicle_type = update_data.get("vehicle_type", rule.vehicle_type)
    new_parking_area_id = update_data.get(
        "parking_area_id",
        rule.parking_area_id,
    )

    # Check trùng với rule khác
    existed = (
        db.query(PricingRule)
        .filter(
            PricingRule.vehicle_type == new_vehicle_type,
            PricingRule.parking_area_id == new_parking_area_id,
            PricingRule.id != rule_id,  # loại trừ chính nó
        )
        .first()
    )
    if existed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đã tồn tại bảng giá cho loại xe này tại khu vực này.",
        )

    # Áp dụng update từng field
    for field, value in update_data.items():
        setattr(rule, field, value)

    # OPTIONAL: có thể thêm validation giống create()
    # ví dụ nếu sau update vehicle_type chuyển thành "car"
    # nhưng lại không có hourly_price_x thì báo lỗi.
    if rule.vehicle_type == "car":
        rule.pricing_type = "hourly"
        if rule.hourly_price_day is None and rule.hourly_price_night is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ô tô (car) phải có hourly_price_day hoặc hourly_price_night.",
            )
    elif rule.vehicle_type == "motorbike":
        rule.pricing_type = "block"
        if rule.morning_price is None or rule.night_price is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Xe máy (motorbike) phải có morning_price và night_price.",
            )

    db.add(rule)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đã tồn tại bảng giá cho loại xe này tại khu vực này.",
        )

    db.refresh(rule)
    return rule


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pricing_rule(
    rule_id: int,
    db: Session = Depends(get_db),
):
    """
    Xoá 1 rule giá.
    """
    rule = db.query(PricingRule).filter(PricingRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Pricing rule not found")

    db.delete(rule)
    db.commit()
    return None
