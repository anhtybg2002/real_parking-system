import React from "react";

export default function Legend() {
  const row = {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    alignItems: "center",
  };

  const item = {
    display: "flex",
    gap: 6,
    alignItems: "center",
    fontSize: 12,
    color: "#111827",
    fontWeight: 500,
  };

  const dot = (bg) => ({
    width: 12,
    height: 12,
    borderRadius: 4,
    background: bg,
    border: "1px solid #9ca3af",
  });

  const lane = (bg) => ({
    width: 28,
    height: 10,
    borderRadius: 4,
    background: bg,
    border: "2px dashed #92400e",
  });

  return (
    <div style={row}>
      <div style={item}><span style={dot("#F3F4F6")} /> Trống</div>
      <div style={item}><span style={dot("#8B5CF6")} /> Giữ chỗ</div>
      <div style={item}><span style={dot("#16A34A")} /> Đang đỗ</div>
      <div style={item}><span style={dot("#111827")} /> Khóa</div>
      <div style={item}><span style={dot("#F97316")} /> Bảo trì</div>

      <div style={item}><span style={dot("#2563EB")} /> Cổng vào</div>
      <div style={item}><span style={dot("#DC2626")} /> Cổng ra</div>
      <div style={item}><span style={lane("#FACC15")} /> Đường đi</div>
    </div>
  );
}
