export const CELL_KIND_META = {
  // ✅ ô trống (editor cần)
  EMPTY: { label: "Trống", bg: "#f8fafc", color: "#374151", icon: "⬚" },

  // ✅ vùng chỗ đỗ (editor cần)
  PARKING: { label: "Vùng chỗ đỗ", bg: "#e9d5ff", color: "#6b21a8", icon: "🅿️" },

  // các loại infra sẵn có (giữ lại nếu đã có)
  LANE: { label: "Đường đi", bg: "#fde68a", color: "#92400e", icon: "⇢" },
  ENTRANCE: { label: "Cổng vào", bg: "#93c5fd", color: "#1d4ed8", icon: "➡️" },
  EXIT: { label: "Cổng ra", bg: "#fecaca", color: "#b91c1c", icon: "⬅️" },
  BLOCKED: { label: "Chặn", bg: "#111827", color: "#ffffff", icon: "⛔" },
};
