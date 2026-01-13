import React from "react";
import { useNavigate } from "react-router-dom";
import commonStyles from "../../styles/commonStyles";

export default function ParkingHeader() {
  const navigate = useNavigate();
  
  const headerRow = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  };
  const title = { fontSize: 22, fontWeight: 700, color: "#111827" };
  const sub = { fontSize: 13, color: "#6b7280", marginTop: 6 };
  const row = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };

  return (
    <div style={headerRow}>
      <div>
        <div style={{ fontSize: 13, color: "#6b7280" }}>Cài đặt / Bãi xe</div>
        <div style={{ marginTop: 6, ...title }}>Bãi xe</div>
        <div style={sub}>
          Bản đồ + danh sách slot theo khu vực. Hiển thị icon xe và biển số xe đang đỗ.
        </div>
      </div>

      <div style={row}>
        <button
          type="button"
          style={{
            ...commonStyles.buttonSecondary,
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 600,
          }}
          onClick={() => navigate("/dashboard/parking-slot-events")}
        >
          📋 Xem lịch sử chỗ đỗ
        </button>
        
        {/* Removed: edit map button from header */}
      </div>
    </div>
  );
}
