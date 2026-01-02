import React, { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import commonStyles from "../styles/commonStyles";
import { getParkingAreas, toggleParkingArea, canEditParkingMap } from "../api/parking";
import { useNavigate } from "react-router-dom"; // ✅ thêm

export default function ParkingAreasPage() {
  const navigate = useNavigate(); // ✅ thêm

  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);


  const [checkingEdit, setCheckingEdit] = useState({}); 

  const refresh = async () => {
  setLoading(true);
  try {
    const res = await getParkingAreas({ includeInactive: showInactive });
    setAreas(res?.data || []);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    refresh();
  }, [showInactive]);

  const filtered = useMemo(() => {
    const kw = (q || "").trim().toLowerCase();
    return (areas || [])
      .filter((a) => (showInactive ? true : a?.is_active !== false))

      .filter((a) => (kw ? (a?.name || "").toLowerCase().includes(kw) : true))
      .sort((a, b) => {
        const aa = a?.is_active !== false ? 0 : 1;
        const bb = b?.is_active !== false ? 0 : 1;
        if (aa !== bb) return aa - bb;
        const ta = a?.updated_at ? new Date(a.updated_at).getTime() : 0;
        const tb = b?.updated_at ? new Date(b.updated_at).getTime() : 0;
        return tb - ta;
      });
  }, [areas, q, showInactive]);

  const onCreateArea = () => navigate("/dashboard/parking-area/new");
  

  const onOpenMapEditor = async (area) => {
  if (!area?.id) return;

  // tránh double click
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

    navigate(`/dashboard/parking-area/editor?areaId=${area.id}`);
  } catch (e) {
    console.error("canEditMap error", e);
    const msg = e?.response?.data?.detail || "Không kiểm tra được điều kiện chỉnh bản đồ.";
    alert(msg);
  } finally {
    setCheckingEdit((prev) => ({ ...prev, [area.id]: false }));
  }
};


  
  const onViewDetail = (area) => {
    // Gợi ý route: /parking/slots?areaId=...
    // Bạn thay "/parking/slots" đúng theo router của bạn
    navigate(`/dashboard/parking-area/info?areaId=${area.id}`);
  };

  const pillStyle = (active) => ({
    ...commonStyles.pill,
    border: `1px solid ${active ? "#bbf7d0" : "#fecaca"}`,
    backgroundColor: active ? "#dcfce7" : "#fee2e2",
    color: active ? "#065f46" : "#991b1b",
  });



  const onToggleArea = async (a) => {
    const turnOff = a?.is_active !== false; // đang active -> tắt
    const ok = window.confirm(
      turnOff
        ? `Tắt bãi ${a?.name}? (Bãi sẽ không còn hoạt động)`
        : `Bật lại bãi ${a?.name}?`
    );
    if (!ok) return;

    try {
      await toggleParkingArea(a.id, !turnOff); // turnOff=true => set false
      await refresh({ includeInactive: showInactive });
    } catch (e) {
      console.error("toggleParkingArea error", e);
      const msg = e?.response?.data?.detail || "Không đổi trạng thái bãi được.";
      alert(msg);
    }
  };
  return (
    <AppLayout title="Quản lý bãi xe">
      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Cài đặt / Bãi xe</div>
            <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: "#111827" }}>
              Quản lý bãi xe
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
              Danh sách các bãi xe đang hoạt động.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              style={{ ...commonStyles.buttonSecondary, opacity: loading ? 0.7 : 1 }}
              onClick={refresh}
              disabled={loading}
            >
              {loading ? "Đang tải..." : "Tải lại"}
            </button>

            <button type="button" style={commonStyles.buttonPrimary} onClick={onCreateArea}>
              + Thêm bãi đỗ xe mới
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên bãi…"
              style={{ ...commonStyles.input, width: 320, borderRadius: 9999 }}
            />

            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Hiển thị bãi đã tắt
            </label>
          </div>

          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Tổng: <b>{filtered.length}</b> bãi
          </div>
        </div>

        {/* Table */}
        <div
          style={{
            marginTop: 14,
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
                        <span style={pillStyle(active)}>{active ? "Đang hoạt động" : "Đã tắt"}</span>
                      </td>

                      <td style={commonStyles.td}>
                        <div style={{ fontWeight: 700 }}>{a?.name}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>ID: {a?.id}</div>
                      </td>

                      <td style={commonStyles.td}>{a?.slot_count ?? 0}</td>
                      <td style={commonStyles.td}>{a?.current_count ?? 0}</td>

                      <td style={{ ...commonStyles.td, textAlign: "right" }}>
                        <div style={commonStyles.rowActions}>
                          {/* ✅ NEW */}
                          <button
                            type="button"
                            style={commonStyles.buttonSmall}
                            onClick={() => onViewDetail(a)}
                            title="Xem bản đồ hiện tại và xe đang đỗ theo vị trí"
                          >
                            Xem chi tiết
                          </button>

                          <button
                            type="button"
                            style={{
                              ...commonStyles.buttonSmall,
                              opacity: checkingEdit[a.id] ? 0.7 : 1,
                              cursor: checkingEdit[a.id] ? "not-allowed" : "pointer",
                            }}
                            onClick={() => onOpenMapEditor(a)}
                            disabled={!!checkingEdit[a.id]}
                            title="Chỉ cho phép chỉnh khi bãi không còn xe OCCUPIED"
                          >
                            {checkingEdit[a.id] ? "Đang kiểm tra..." : "Chỉnh bản đồ"}
                          </button>


                          <button
                            type="button"
                            style={active ? commonStyles.buttonDanger : commonStyles.buttonSmall}
                            onClick={() => onToggleArea(a)}
                          >
                            {active ? "Tắt bãi" : "Bật bãi"}
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
