import React from "react";
import useVehicleTypes from "../../hooks/useVehicleTypes";
import Card from "../common/Card";
import styles from "../../styles/commonStyles";

export default function PricingForm({
  vehicleType,
  setVehicleType,
  parkingAreaId,
  setParkingAreaId,
  parkingAreas,
  pricingType,
  setPricingType,
  // block pricing (xe máy)
  morningPrice,
  setMorningPrice,
  nightPrice,
  setNightPrice,
  // monthly cho cả hai
  monthlyPrice,
  setMonthlyPrice,
  // hourly pricing (ô tô)
  hourlyPriceDay,
  setHourlyPriceDay,
  hourlyPriceNight,
  setHourlyPriceNight,
  onSubmit,
  onCancel,
}) {
  const isCar = vehicleType === "car";
  const isMotorbike = vehicleType === "motorbike";
  const vt = useVehicleTypes();
  const isHourly = pricingType === "hourly";
  const isBlock = pricingType === "block";

  return (
    <Card title="Thêm / chỉnh sửa cấu hình giá">
      <form onSubmit={onSubmit} style={styles.form}>
        {/* Loại xe */}
        <label style={styles.label}>
          Loại xe
          <select
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            style={styles.select}
          >
            {/** dynamic types from API */}
            <option value="">-- Chọn loại xe --</option>
            {vt.list.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
            Chọn loại xe. Mặc định ô tô dùng "giá theo giờ", xe máy thường dùng "giá theo ca".
          </span>
        </label>

        {/* Kiểu tính tiền */}
        <label style={styles.label}>
          Kiểu tính tiền
          <select
            value={pricingType}
            onChange={(e) => setPricingType(e.target.value)}
            style={styles.select}
          >
            <option value="hourly">Giá theo giờ</option>
            <option value="block">Giá theo ca</option>
          </select>
          <span style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
            Chọn phương thức tính tiền: theo giờ hoặc theo ca (sáng/đêm).
          </span>
        </label>

        {/* Khu vực áp dụng */}
        <label style={styles.label}>
          Khu vực áp dụng
          <select
            value={parkingAreaId}
            onChange={(e) => setParkingAreaId(e.target.value)}
            style={styles.select}
          >
            <option value="">-- Chọn khu vực --</option>
            {parkingAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
            Bắt buộc chọn. Có thể cấu hình nhiều bảng giá cho các khu khác nhau.
          </span>
        </label>

        {/* --- Giá theo ca --- */}
        {isBlock && (
          <>
            <label style={styles.label}>
              Giá ca sáng (06:00 – 18:00) (VNĐ)
              <input
                type="number"
                min="0"
                value={morningPrice}
                onChange={(e) => setMorningPrice(e.target.value)}
                style={styles.input}
                placeholder="VD: 5.000"
              />
            </label>

            <label style={styles.label}>
              Giá ca đêm (18:00 – 06:00) (VNĐ)
              <input
                type="number"
                min="0"
                value={nightPrice}
                onChange={(e) => setNightPrice(e.target.value)}
                style={styles.input}
                placeholder="VD: 10.000"
              />
            </label>
          </>
        )}

        {/* --- Giá theo giờ --- */}
        {isHourly && (
          <>
            <label style={styles.label}>
              Giá theo giờ ban ngày (VNĐ)
              <input
                type="number"
                min="0"
                value={hourlyPriceDay}
                onChange={(e) => setHourlyPriceDay(e.target.value)}
                style={styles.input}
                placeholder="VD: 20.000 / giờ"
              />
            </label>

            <label style={styles.label}>
              Giá theo giờ ban đêm (VNĐ)
              <input
                type="number"
                min="0"
                value={hourlyPriceNight}
                onChange={(e) => setHourlyPriceNight(e.target.value)}
                style={styles.input}
                placeholder="Có thể để trống nếu dùng chung giá ban ngày"
              />
            </label>
          </>
        )}

        {/* --- Vé tháng: dùng chung cho cả ô tô & xe máy --- */}
        <label style={styles.label}>
          Giá vé tháng (VNĐ)
          <input
            type="number"
            min="0"
            value={monthlyPrice}
            onChange={(e) => setMonthlyPrice(e.target.value)}
            style={styles.input}
            placeholder="Có thể để trống nếu không bán vé tháng"
          />
        </label>

        <div style={styles.actionsRow}>
          <button type="submit" style={styles.buttonPrimary}>
            Lưu cấu hình
          </button>
          <button
            type="button"
            style={styles.buttonSecondary}
            onClick={onCancel}
          >
            Đặt lại
          </button>
        </div>
      </form>
    </Card>
  );
}
