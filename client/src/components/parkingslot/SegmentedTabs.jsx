import React from "react";

export default function SegmentedTabs({ value, onChange }) {
  const wrap = {
    display: "inline-flex",
    gap: 6,
    padding: 4,
    borderRadius: 9999,
    border: "1px solid #e5e7eb",
    background: "#fff",
  };

  const item = (active) => ({
    padding: "8px 12px",
    borderRadius: 9999,
    border: active ? "none" : "1px solid transparent",
    background: active
      ? "linear-gradient(135deg, #4f46e5 0%, #6366f1 40%, #8b5cf6 100%)"
      : "#fff",
    color: active ? "#fff" : "#374151",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 13,
  });

  return (
    <div style={wrap}>
      <button type="button" style={item(value === "map")} onClick={() => onChange("map")}>
        Bản đồ bãi
      </button>
      <button type="button" style={item(value === "slots")} onClick={() => onChange("slots")}>
        Danh sách chỗ đỗ
      </button>
    </div>
  );
}
