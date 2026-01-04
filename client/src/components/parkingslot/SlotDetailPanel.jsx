import React from "react";
import commonStyles from "../../styles/commonStyles";
import Pill from "./Pill";
import { renderVehicleIcon, renderVehicleType } from "./constants";
import useVehicleTypes from "../../hooks/useVehicleTypes";

export default function SlotDetailPanel({
  selected,
  swapMode,
  swapFrom,
  onStartSwap,
  onCancelSwap,
  onToggleLock,
  onRelease,
  onRefresh,
}) {
  const card = { border: "1px solid #e5e7eb", borderRadius: 16, background: "#fff", padding: 16 };
  const divider = { height: 1, background: "#f3f4f6", margin: "12px 0" };

  const swapHint = (() => {
    if (!swapMode) return null;

    // Nếu đang swap nhưng chưa có swapFrom (trường hợp hiếm), vẫn show hint chung
    if (!swapFrom) {
      return "Đang ở chế độ đổi chỗ: hãy chọn chỗ thứ 2 trên bản đồ để hoàn tất.";
    }

    const plate = swapFrom.current_plate || "—";
    const type = renderVehicleType(swapFrom.vehicle_type_allowed);

    return `Đang đổi chỗ: đã chọn ${swapFrom.code} (${plate}) • ${type}. Hãy click chỗ thứ 2 trên bản đồ (cùng loại xe) để đổi.`;
  })();

  const vt = useVehicleTypes();

  return (
    <div style={card}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Chi tiết chỗ đỗ</div>
      <div style={{ marginTop: 10, ...divider }} />

      {/* HINT: swap mode */}
      {swapMode && (
        <div
          style={{
            border: "1px solid #c7d2fe",
            background: "#eef2ff",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 13, color: "#3730a3", fontWeight: 700, lineHeight: 1.4 }}>
            {swapHint}
          </div>

          <button
            type="button"
            style={{
              ...commonStyles.buttonSmall,
              background: "#fff",
              border: "1px solid #c7d2fe",
              color: "#3730a3",
            }}
            onClick={onCancelSwap}
            title="Hủy chế độ đổi chỗ"
          >
            Hủy
          </button>
        </div>
      )}

      {!selected ? (
        <div
          style={{
            fontSize: 13,
            color: "#6b7280",
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 12,
          }}
        >
          Chưa chọn chỗ đỗ. Vui lòng click một ô trên bản đồ để xem thông tin.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
                {(vt.icons?.[selected.vehicle_type_allowed] ?? renderVehicleIcon(selected.vehicle_type_allowed))} {selected.code}
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                Area #{selected.parking_area_id} • {vt.map[selected.vehicle_type_allowed] ?? renderVehicleType(selected.vehicle_type_allowed)}
              </div>
            </div>
            <Pill status={selected.status} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Loại xe</div>
              <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: "#111827" }}>
                {renderVehicleType(selected.vehicle_type_allowed)}
              </div>
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Tọa độ</div>
              <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: "#111827" }}>
                r{selected.row}, c{selected.col}
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1", border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Biển số</div>
              <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: "#111827" }}>
                {selected.current_plate || "—"}
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1", border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Ghi chú</div>
              <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: "#111827" }}>
                {selected.note || "—"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={commonStyles.buttonSmall} onClick={onToggleLock}>
              {selected.status === "LOCKED" ? "Mở khóa" : "Khóa"}
            </button>

            <button
              type="button"
              style={commonStyles.buttonSmall}
              disabled={selected.status !== "OCCUPIED"}
              onClick={swapMode ? onCancelSwap : onStartSwap}
              title={selected.status !== "OCCUPIED" ? "Slot phải OCCUPIED mới đổi chỗ" : "Bật chế độ đổi chỗ"}
            >
              {swapMode ? "Hủy đổi chỗ" : "Đổi chỗ"}
            </button>

            <button
              type="button"
              style={{
                ...commonStyles.buttonSmall,
                opacity: ["OCCUPIED", "RESERVED"].includes(selected.status) ? 1 : 0.4,
              }}
              disabled={!["OCCUPIED", "RESERVED"].includes(selected.status)}
              onClick={onRelease}
            >
              Đặt trống
            </button>

            <button type="button" style={commonStyles.buttonSecondary} onClick={onRefresh}>
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
