import React from "react";
import commonStyles from "../../styles/commonStyles";

export default function ParkingAreaSelector({ areas, areaId, setAreaId, loading, readonly = false }) {
  const row = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
  const areaName = (areas || []).find((a) => a.id === areaId)?.name || "—";

  if (readonly) {
    return (
      <div style={{ marginTop: 12, ...row }}>
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 9999,
            border: "1px solid #e5e7eb",
            background: "#a9b2a7ff",
            color: "#111827",
            fontSize: 30,
            fontWeight: 600,
          }}
        >
          {areaName}
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
