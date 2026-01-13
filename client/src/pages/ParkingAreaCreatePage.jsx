import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { createParkingArea } from "../api/parking";
import useVehicleTypes from "../hooks/useVehicleTypes";

const clampInt = (v, min, max, fallback) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
};

export default function ParkingAreaCreatePage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const vehicleTypes = useVehicleTypes();

  const [form, setForm] = useState({
    name: "",
    map_rows: 10,
    map_cols: 12,
    cell_size: 36,
    is_active: true,
  });

  const canSubmit = useMemo(() => {
    return String(form.name || "").trim().length > 0 && !saving && (vehicleTypes.list?.length ?? 0) > 0;
  }, [form.name, saving]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if ((vehicleTypes.list?.length ?? 0) === 0) {
      alert("Vui lòng cấu hình ít nhất một loại xe (Cài đặt → Loại xe) trước khi tạo bãi.");
      return;
    }
    if (!canSubmit) return;

    const payload = {
      name: String(form.name || "").trim(),
      map_rows: clampInt(form.map_rows, 3, 200, 10),
      map_cols: clampInt(form.map_cols, 3, 200, 12),
      cell_size: clampInt(form.cell_size, 16, 120, 36),
      is_active: !!form.is_active,
      map_data: { cells: {}, paths: [] },
    };

    try {
      setSaving(true);
      const res = await createParkingArea(payload);
      const areaId = res?.data?.parking_area_id;

      alert("Đã tạo bãi mới.");

      // Option 1: quay về danh sách bãi
      // navigate("/dashboard/parking-area");

      // Option 2 (khuyến nghị): chuyển thẳng sang editor để set map
      if (areaId) navigate(`/dashboard/settings/parking-area/editor?areaId=${areaId}`);
      else navigate("/dashboard/parking-area");
    } catch (err) {
      console.error("createParkingArea error:", err);
      const msg = err?.response?.data?.detail || "Không tạo được bãi. Kiểm tra API POST /parking/areas";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    fontSize: 14,
    outline: "none",
  };

  const labelStyle = { fontSize: 12, fontWeight: 800, color: "#6b7280", marginBottom: 6 };

  return (
    <AppLayout title="Thêm bãi đỗ xe mới">
      <div style={{ padding: 24, maxWidth: 720 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#111827" }}>Thêm bãi đỗ xe mới</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
          Tạo bãi trước, sau đó chuyển qua trang chỉnh bản đồ để thiết kế layout.
        </div>

        <form onSubmit={onSubmit} style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={labelStyle}>Tên bãi</div>
            <input
              style={inputStyle}
              value={form.name}
              placeholder="VD: S2, B1, Khu A..."
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div>
              <div style={labelStyle}>Rows</div>
              <input
                type="number"
                min={3}
                max={200}
                style={inputStyle}
                value={form.map_rows}
                onChange={(e) => setForm((p) => ({ ...p, map_rows: e.target.value }))}
              />
            </div>

            <div>
              <div style={labelStyle}>Cols</div>
              <input
                type="number"
                min={3}
                max={200}
                style={inputStyle}
                value={form.map_cols}
                onChange={(e) => setForm((p) => ({ ...p, map_cols: e.target.value }))}
              />
            </div>

            <div>
              <div style={labelStyle}>Cell size</div>
              <input
                type="number"
                min={16}
                max={120}
                style={inputStyle}
                value={form.cell_size}
                onChange={(e) => setForm((p) => ({ ...p, cell_size: e.target.value }))}
              />
            </div>
          </div>

          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "#374151" }}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            />
            Kích hoạt bãi (is_active)
          </label>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => navigate("/dashboard/parking-area")}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 800,
                color: "#374151",
              }}
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "none",
                background: canSubmit ? "linear-gradient(135deg,#4f46e5,#6366f1,#8b5cf6)" : "#e5e7eb",
                color: canSubmit ? "#fff" : "#9ca3af",
                cursor: canSubmit ? "pointer" : "not-allowed",
                fontWeight: 900,
              }}
            >
              {saving ? "Đang tạo..." : "Tạo bãi"}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
