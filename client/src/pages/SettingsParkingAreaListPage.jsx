import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import commonStyles from "../styles/commonStyles";
import { getParkingAreas, canEditParkingMap } from "../api/parking";

export default function SettingsParkingAreaListPage() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkingEdit, setCheckingEdit] = useState({});
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await getParkingAreas({ includeInactive: true });
      setAreas(res?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const kw = (q || "").trim().toLowerCase();
    return (areas || [])
      .filter((a) => (kw ? (a?.name || "").toLowerCase().includes(kw) : true))
      .sort((a, b) => {
        const aa = a?.is_active !== false ? 0 : 1;
        const bb = b?.is_active !== false ? 0 : 1;
        if (aa !== bb) return aa - bb;
        const ta = a?.updated_at ? new Date(a.updated_at).getTime() : 0;
        const tb = b?.updated_at ? new Date(b.updated_at).getTime() : 0;
        return tb - ta;
      });
  }, [areas, q]);

  const onEditMap = async (area) => {
    if (!area?.id) return;
    if (checkingEdit[area.id]) return;
    setCheckingEdit((prev) => ({ ...prev, [area.id]: true }));
    try {
      const res = await canEditParkingMap(area.id);
      const data = res?.data;
      if (!data?.can_edit) {
        const reason = data?.reason || "Không thể chỉnh sửa bản đồ lúc này.";
        const occupied = data?.occupied_count ?? 0;
        alert(`${reason}\nXe đang đỗ: ${occupied}`);
        return;
      }
      navigate(`/dashboard/settings/parking-area/editor?areaId=${area.id}`);
    } catch (e) {
      console.error("canEditMap error", e);
      const msg = e?.response?.data?.detail || "Không kiểm tra được điều kiện chỉnh bản đồ.";
      alert(msg);
    } finally {
      setCheckingEdit((prev) => ({ ...prev, [area.id]: false }));
    }
  };

  return (
    <AppLayout title="Cài đặt: Bãi đỗ">
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Cài đặt / Bãi xe</div>
            <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: "#111827" }}>
              Danh sách bãi đỗ
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
              Chọn bãi và mở trình chỉnh sửa bản đồ.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên bãi…"
              style={{ ...commonStyles.input, width: 280, borderRadius: 12 }}
            />
            <button
              type="button"
              style={{ ...commonStyles.buttonSecondary, opacity: loading ? 0.7 : 1 }}
              onClick={refresh}
              disabled={loading}
            >
              {loading ? "Đang tải..." : "Tải lại"}
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <div style={{ overflow: "auto" }}>
            <table style={commonStyles.table}>
              <thead>
                <tr>
                  <th style={commonStyles.th}>Trạng thái</th>
                  <th style={commonStyles.th}>Tên bãi</th>
                  <th style={commonStyles.th}>Sức chứa</th>
                  <th style={commonStyles.th}>Đang đỗ</th>
                  <th style={{ ...commonStyles.th, textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const active = a?.is_active !== false;
                  return (
                    <tr key={a.id}>
                      <td style={commonStyles.td}>
                        <span
                          style={{
                            ...commonStyles.pill,
                            border: `1px solid ${active ? "#bbf7d0" : "#fecaca"}`,
                            backgroundColor: active ? "#dcfce7" : "#fee2e2",
                            color: active ? "#065f46" : "#991b1b",
                          }}
                        >
                          {active ? "Đang hoạt động" : "Đã tắt"}
                        </span>
                      </td>
                      <td style={commonStyles.td}>
                        <div style={{ fontWeight: 700 }}>{a?.name}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>ID: {a?.id}</div>
                      </td>
                      <td style={commonStyles.td}>{a?.slot_count ?? 0}</td>
                      <td style={commonStyles.td}>{a?.current_count ?? 0}</td>
                      <td style={{ ...commonStyles.td, textAlign: "right" }}>
                        <div style={commonStyles.rowActions}>
                          <button
                            type="button"
                            style={{
                              ...commonStyles.buttonSmall,
                              opacity: checkingEdit[a.id] ? 0.7 : 1,
                              cursor: checkingEdit[a.id] ? "not-allowed" : "pointer",
                            }}
                            onClick={() => onEditMap(a)}
                            disabled={!!checkingEdit[a.id]}
                          >
                            {checkingEdit[a.id] ? "Đang kiểm tra..." : "Chỉnh sửa bản đồ"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ ...commonStyles.td, padding: 16, color: "#6b7280" }}>
                      Không có bãi xe nào phù hợp bộ lọc hiện tại.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={5} style={{ ...commonStyles.td, padding: 16, color: "#6b7280" }}>
                      Đang tải dữ liệu bãi xe…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
