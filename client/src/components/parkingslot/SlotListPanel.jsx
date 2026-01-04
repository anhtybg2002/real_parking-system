import React, { useMemo } from "react";
import useVehicleTypes from "../../hooks/useVehicleTypes";
import commonStyles from "../../styles/commonStyles";
import Pill from "./Pill";
import { renderVehicleIcon, renderVehicleType } from "./constants";

export default function SlotListPanel({
  slots,
  filters,
  setFilters,
  onRefresh,
  onViewOnMap,
  onToggleLockInline,
  onReleaseInline,
}) {
  const vt = useVehicleTypes();
  const card = { border: "1px solid #e5e7eb", borderRadius: 16, background: "#fff", padding: 16 };
  const headerRow = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  };
  const row = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };

  const listData = useMemo(() => {
    const q = (filters.q || "").toLowerCase();
    return (slots || []).filter((s) => {
      const okQ =
        !q ||
        (s.code || "").toLowerCase().includes(q) ||
        (s.current_plate || "").toLowerCase().includes(q);

      const okStatus = filters.status === "all" ? true : s.status === filters.status;

      const okType =
        filters.type === "all"
          ? true
          : (s.vehicle_type_allowed || "").toLowerCase() === filters.type.toLowerCase();

      return okQ && okStatus && okType;
    });
  }, [slots, filters]);

  return (
    <div style={{ marginTop: 14 }}>
      <div style={card}>
        <div style={{ ...headerRow, alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Danh sách chỗ đỗ</div>
          <div style={row}>
            <button type="button" style={commonStyles.buttonSecondary} onClick={onRefresh}>
              Làm mới
            </button>
          </div>
        </div>

        <div style={{ height: 1, background: "#f3f4f6", margin: "12px 0" }} />

        <div style={{ ...row, marginBottom: 12 }}>
          <input
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Tìm theo mã chỗ / biển số..."
            style={{ ...commonStyles.input, borderRadius: 9999, width: 320 }}
          />

          <select
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            style={{ ...commonStyles.select, borderRadius: 9999 }}
          >
            <option value="all">Tất cả loại xe</option>
            {vt.list.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            style={{ ...commonStyles.select, borderRadius: 9999 }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="EMPTY">Trống</option>
            <option value="RESERVED">Giữ chỗ</option>
            <option value="OCCUPIED">Đang đỗ</option>
            <option value="LOCKED">Khóa</option>
            <option value="MAINT">Bảo trì</option>
          </select>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
          <table style={commonStyles.table}>
            <thead style={{ background: "#f9fafb" }}>
              <tr>
                <th style={commonStyles.th}>Mã chỗ</th>
                <th style={commonStyles.th}>Area</th>
                <th style={commonStyles.th}>Loại xe</th>
                <th style={commonStyles.th}>Trạng thái</th>
                <th style={commonStyles.th}>Biển số</th>
                <th style={commonStyles.th}>Tọa độ</th>
                <th style={{ ...commonStyles.th, textAlign: "right" }}>Hành động</th>
              </tr>
            </thead>

            <tbody>
              {listData.map((s) => (
                <tr key={s.id}>
                  <td style={{ ...commonStyles.td, fontWeight: 800 }}>
                    {(vt.icons?.[s.vehicle_type_allowed] ?? renderVehicleIcon(s.vehicle_type_allowed))} {s.code}
                  </td>
                  <td style={commonStyles.td}>#{s.parking_area_id}</td>
                  <td style={commonStyles.td}>{vt.map[s.vehicle_type_allowed] ?? renderVehicleType(s.vehicle_type_allowed)}</td>
                  <td style={commonStyles.td}><Pill status={s.status} /></td>
                  <td style={commonStyles.td}>{s.current_plate || "—"}</td>
                  <td style={commonStyles.td}>r{s.row}, c{s.col}</td>

                  <td style={commonStyles.td}>
                    <div style={commonStyles.rowActions}>
                      <button style={commonStyles.buttonSmall} type="button" onClick={() => onViewOnMap?.(s)}>
                        Xem bản đồ
                      </button>

                      <button style={commonStyles.buttonSmall} type="button" onClick={() => onToggleLockInline?.(s)}>
                        {s.status === "LOCKED" ? "Mở khóa" : "Khóa"}
                      </button>

                      <button
                        style={{
                          ...commonStyles.buttonSmall,
                          opacity: ["OCCUPIED", "RESERVED"].includes(s.status) ? 1 : 0.4,
                          cursor: ["OCCUPIED", "RESERVED"].includes(s.status) ? "pointer" : "not-allowed",
                        }}
                        type="button"
                        disabled={!["OCCUPIED", "RESERVED"].includes(s.status)}
                        onClick={() => onReleaseInline?.(s)}
                      >
                        Đặt trống
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {listData.length === 0 && (
                <tr>
                  <td style={{ ...commonStyles.td, padding: 18, textAlign: "center", color: "#6b7280" }} colSpan={7}>
                    Không có dữ liệu phù hợp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
          Gợi ý: bạn có thể tìm theo biển số (current_plate) hoặc mã chỗ.
        </div>
      </div>
    </div>
  );
}
