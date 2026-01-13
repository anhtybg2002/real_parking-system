import React, { useMemo } from "react";

function StatCard({ title, value }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, background: "#fff", padding: 14 }}>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700, color: "#111827" }}>{value}</div>
    </div>
  );
}

export default function ParkingStats({ slots }) {
  const stats = useMemo(() => {
    const s = slots || [];
    return {
      total: s.length,
      empty: s.filter((x) => x.status === "EMPTY").length,
      occupied: s.filter((x) => x.status === "OCCUPIED").length,
    };
  }, [slots]);

  return (
    <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
      <StatCard title="Tổng slot" value={stats.total} />
      <StatCard title="Trống" value={stats.empty} />
      <StatCard title="Đang đỗ" value={stats.occupied} />
    </div>
  );
}
