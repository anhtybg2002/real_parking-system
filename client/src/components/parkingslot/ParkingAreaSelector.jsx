import React from "react";
import commonStyles from "../../styles/commonStyles";

export default function ParkingAreaSelector({ areas, areaId, setAreaId, loading, readonly = false }) {
  const row = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
  const areaName = (areas || []).find((a) => a.id === areaId)?.name || "—";

  if (readonly) {
    return (
      <div style={{ marginTop: 12, ...row }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          
          <div
            style={{
              padding: "10px 16px",
              borderRadius: 14,
              border: "1px solid #e5e7eb",
              background: "#f8fafc",
              color: "#0f172a",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 0.2,
            }}
          >
            {areaName}
          </div>
        </div>

        {loading && <div style={{ fontSize: 13, color: "#6b7280" }}>Đang tải dữ liệu...</div>}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, ...row }}>
      <select
        value={areaId || ""}
        onChange={(e) => setAreaId(Number(e.target.value))}
        style={{ ...commonStyles.select, borderRadius: 9999 }}
      >
        {(areas || []).map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>

      {loading && <div style={{ fontSize: 13, color: "#6b7280" }}>Đang tải dữ liệu...</div>}
    </div>
  );
}
