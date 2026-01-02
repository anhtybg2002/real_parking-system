import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import Card from "../components/common/Card";
import commonStyles from "../styles/commonStyles";
import axiosClient from "../api/axiosClient";
import { formatTime } from "../components/common/deps";

/* =========================
 * Utils
 * ======================= */
const formatMoney = (v) =>
  Number(v || 0).toLocaleString("vi-VN") + "đ";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function kpiLabel(kpi) {
  if (kpi === "total_trips") return "Tổng lượt xe";
  if (kpi === "total_revenue") return "Tổng doanh thu";
  if (kpi === "parking_revenue") return "Doanh thu gửi xe";
  if (kpi === "monthly_revenue") return "Doanh thu vé tháng";
  if (kpi === "active_in_yard") return "Xe trong bãi";
  if (kpi === "staff_active") return "Nhân viên hoạt động";
  return "Tất cả logs";
}

/* =========================
 * Staff stats (KPI staff_active)
 * ======================= */
const buildStaffStats = (rows = []) => {
  const map = new Map(); // name -> { name, count }

  for (const r of rows) {
    const names = new Set(
      [r.entry_staff_name, r.exit_staff_name].filter(Boolean)
    );

    for (const name of names) {
      const prev = map.get(name);
      map.set(name, {
        name,
        count: (prev?.count || 0) + 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
};

/* =========================
 * Page
 * ======================= */
export default function ReportsLogsPage() {
  const q = useQuery();
  const navigate = useNavigate();

  /* ---- Filters (đúng chuẩn backend Query("all")) ---- */
  const from_date = q.get("from_date") || "";
  const to_date = q.get("to_date") || "";
  const kpi = q.get("kpi") || "all";
  const vehicle_type = q.get("vehicle_type") || "all";
  const staff = q.get("staff") || "all";
  const parking_area = q.get("parking_area") || "all"; // 👈 BÃI

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    rows: [],
    total: 0,
    total_amount: 0,
  });

  /* ---- KPI staff_active ---- */
  const staffStats = useMemo(
    () => buildStaffStats(data.rows),
    [data.rows]
  );

  /* =========================
   * Fetch logs
   * ======================= */
  const fetchLogs = async () => {
    if (!from_date || !to_date) {
      setError("Thiếu from_date / to_date trên URL.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axiosClient.get("/reports/logs", {
        params: {
          from_date,
          to_date,
          kpi,
          vehicle_type,
          staff,
          parking_area, // 👈 GỬI LÊN BACKEND
        },
      });

      const d = res?.data ?? res;

      setData({
        rows: Array.isArray(d.rows) ? d.rows : [],
        total: d.total ?? 0,
        total_amount: d.total_amount ?? 0,
      });
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.detail || "Không lấy được logs.");
      setData({ rows: [], total: 0, total_amount: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from_date, to_date, kpi, vehicle_type, staff, parking_area]);

  /* =========================
   * Render
   * ======================= */
  return (
    <AppLayout title="Logs báo cáo">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* ================= Header / Summary ================= */}
        <Card>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>
                {kpiLabel(kpi)}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  marginTop: 4,
                  lineHeight: 1.5,
                }}
              >
                Khoảng: <b>{from_date}</b> → <b>{to_date}</b> •
                Vehicle: <b>{vehicle_type}</b> •
                Staff: <b>{staff}</b> •
                Bãi: <b>{parking_area}</b>
              </div>
            </div>

            <button
              style={commonStyles.buttonSecondary}
              type="button"
              onClick={() => navigate(-1)}
            >
              Quay lại
            </button>
          </div>

          <div style={{ height: 12 }} />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <SummaryBox label="Tổng bản ghi" value={data.total} />
            <SummaryBox
              label="Tổng tiền"
              value={formatMoney(data.total_amount)}
            />
            <SummaryBox label="Loại KPI" value={kpiLabel(kpi)} small />
          </div>

          {loading && (
            <div style={{ padding: "10px 0", fontSize: 12, color: "#6b7280" }}>
              Đang tải...
            </div>
          )}

          {error && (
            <div style={{ padding: "10px 0", fontSize: 12, color: "#b91c1c" }}>
              {error}
            </div>
          )}
        </Card>

        {/* ================= Body ================= */}
        <Card>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#111827",
              marginBottom: 8,
            }}
          >
            {kpi === "staff_active"
              ? "Danh sách nhân viên hoạt động"
              : "Danh sách logs"}
          </div>

          {kpi === "staff_active" ? (
            <StaffTable
              rows={staffStats}
              loading={loading}
              onViewLogs={(name) => {
                const qs = new URLSearchParams({
                  from_date,
                  to_date,
                  kpi: "all",
                  vehicle_type,
                  staff: name,
                  parking_area, // 👈 GIỮ NGUYÊN BÃI
                });
                navigate(`/dashboard/reports/logs?${qs.toString()}`);
              }}
            />
          ) : (
            <LogsTable rows={data.rows} loading={loading} />
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

/* =========================
 * Sub components
 * ======================= */

function SummaryBox({ label, value, small }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: small ? 13 : 20,
          fontWeight: 800,
          color: "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StaffTable({ rows, loading, onViewLogs }) {
  return (
    <table style={commonStyles.table}>
      <thead>
        <tr>
          <th style={commonStyles.th}>Nhân viên</th>
          <th style={commonStyles.th}>Số logs</th>
          <th style={commonStyles.th}></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((s) => (
          <tr key={s.name}>
            <td style={commonStyles.td}>{s.name}</td>
            <td style={{ ...commonStyles.td, fontWeight: 800 }}>
              {s.count}
            </td>
            <td style={commonStyles.td}>
              <button
                style={commonStyles.buttonSmall}
                type="button"
                onClick={() => onViewLogs(s.name)}
              >
                Xem logs
              </button>
            </td>
          </tr>
        ))}

        {!rows.length && !loading && (
          <tr>
            <td colSpan={3} style={{ ...commonStyles.td, color: "#6b7280" }}>
              Không có nhân viên nào trong khoảng thời gian đã chọn.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function LogsTable({ rows, loading }) {
  return (
    <table style={commonStyles.table}>
      <thead>
        <tr>
          <th style={commonStyles.th}>ID</th>
          <th style={commonStyles.th}>Loại</th>
          <th style={commonStyles.th}>Biển số</th>
          <th style={commonStyles.th}>Khu</th>
          <th style={commonStyles.th}>NV vào</th>
          <th style={commonStyles.th}>NV ra</th>
          <th style={commonStyles.th}>Giờ vào</th>
          <th style={commonStyles.th}>Giờ ra</th>
          <th style={commonStyles.th}>Tiền</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td style={commonStyles.td}>{r.id}</td>
            <td style={commonStyles.td}>{r.log_type}</td>
            <td style={commonStyles.td}>{r.license_plate || "—"}</td>
            <td style={commonStyles.td}>{r.parking_area_name || "—"}</td>
            <td style={commonStyles.td}>{r.entry_staff_name || "—"}</td>
            <td style={commonStyles.td}>{r.exit_staff_name || "—"}</td>
            <td style={commonStyles.td}>{formatTime(r.entry_time)}</td>
            <td style={commonStyles.td}>{formatTime(r.exit_time)}</td>
            <td style={commonStyles.td}>{formatMoney(r.amount)}</td>
          </tr>
        ))}

        {!rows.length && !loading && (
          <tr>
            <td colSpan={9} style={{ ...commonStyles.td, color: "#6b7280" }}>
              Không có logs phù hợp bộ lọc.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
