import React from "react";
import Card from "../common/Card";
import styles from "../../styles/commonStyles";

export default function PricingList({
  loading,
  pricingRules,
  resolveAreaName,
  onEdit,
  onDelete,
}) {
  return (
    <Card title="Danh sách cấu hình giá">
      {loading ? (
        <p style={{ fontSize: 13, color: "#6b7280" }}>Đang tải dữ liệu...</p>
      ) : pricingRules.length === 0 ? (
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          Chưa có cấu hình giá nào. Hãy thêm mới ở form bên cạnh.
        </p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Khu vực</th>
              <th style={styles.th}>Loại xe</th>
              <th style={styles.th}>Kiểu tính</th>
              <th style={styles.th}>Giá ca sáng</th>
              <th style={styles.th}>Giá ca đêm</th>
              <th style={styles.th}>Vé tháng</th>
              <th style={styles.th}>Giá giờ ngày</th>
              <th style={styles.th}>Giá giờ đêm</th>
              <th style={{ ...styles.th, textAlign: "right" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {pricingRules.map((rule) => {
              const isCar = rule.vehicle_type === "car";
              const isMotorbike = rule.vehicle_type === "motorbike";
              const pricingTypeLabel =
                rule.pricing_type === "hourly"
                  ? "Theo giờ"
                  : rule.pricing_type === "block"
                  ? "Theo ca"
                  : rule.pricing_type || "Không rõ";

              return (
                <tr key={rule.id}>
                  {/* Khu vực */}
                  <td style={styles.td}>{resolveAreaName(rule)}</td>

                  {/* Loại xe */}
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.pill,
                        backgroundColor: isCar
                          ? "#e0f2fe"
                          : isMotorbike
                          ? "#dcfce7"
                          : "#fef3c7",
                        color: isCar
                          ? "#0369a1"
                          : isMotorbike
                          ? "#166534"
                          : "#92400e",
                      }}
                    >
                      {isCar
                        ? "Ô tô"
                        : isMotorbike
                        ? "Xe máy"
                        : rule.vehicle_type || "Khác"}
                    </span>
                  </td>

                  {/* Kiểu tính giá */}
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.pill,
                        backgroundColor:
                          rule.pricing_type === "hourly"
                            ? "#fee2e2"
                            : "#e5e7eb",
                        color:
                          rule.pricing_type === "hourly"
                            ? "#b91c1c"
                            : "#374151",
                      }}
                    >
                      {pricingTypeLabel}
                    </span>
                  </td>

                  {/* Giá ca sáng (áp dụng chủ yếu cho xe máy / block) */}
                  <td style={styles.td}>
                    {rule.morning_price != null && rule.morning_price !== 0
                      ? `${rule.morning_price.toLocaleString("vi-VN")} đ`
                      : "—"}
                  </td>

                  {/* Giá ca đêm */}
                  <td style={styles.td}>
                    {rule.night_price != null && rule.night_price !== 0
                      ? `${rule.night_price.toLocaleString("vi-VN")} đ`
                      : "—"}
                  </td>

                  {/* Vé tháng */}
                  <td style={styles.td}>
                    {rule.monthly_price
                      ? `${rule.monthly_price.toLocaleString("vi-VN")} đ`
                      : "—"}
                  </td>

                  {/* Giá giờ ban ngày (ô tô) */}
                  <td style={styles.td}>
                    {rule.hourly_price_day != null &&
                    rule.hourly_price_day !== 0
                      ? `${rule.hourly_price_day.toLocaleString("vi-VN")} đ`
                      : "—"}
                  </td>

                  {/* Giá giờ ban đêm (ô tô) */}
                  <td style={styles.td}>
                    {rule.hourly_price_night != null &&
                    rule.hourly_price_night !== 0
                      ? `${rule.hourly_price_night.toLocaleString("vi-VN")} đ`
                      : "—"}
                  </td>

                  {/* Thao tác */}
                  <td style={styles.td}>
                    <div style={styles.rowActions}>
                      <button
                        type="button"
                        style={styles.buttonSmall}
                        onClick={() => onEdit(rule)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        style={styles.buttonDanger}
                        onClick={() => onDelete(rule)}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}
