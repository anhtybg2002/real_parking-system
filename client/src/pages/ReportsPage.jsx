// src/pages/ReportsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import Card from "../components/common/Card";
import commonStyles from "../styles/commonStyles";
import axiosClient from "../api/axiosClient";
import VehicleTypeSelect from "../components/common/VehicleTypeSelect";
import { useNavigate } from "react-router-dom";

/* ================= HELPERS ================= */

const formatMoney = (v) => Number(v || 0).toLocaleString("vi-VN") + "đ";
const todayKey = () => new Date().toLocaleDateString("en-CA");

const addDaysKey = (baseKey, deltaDays) => {
  const d = new Date(baseKey + "T00:00:00");
  d.setDate(d.getDate() + deltaDays);
  return d.toLocaleDateString("en-CA");
};

function KpiCard({ title, value, subtitle, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 14,
        background: "#fff",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
        {title}
      </div>
      <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, color: "#111827" }}>
        {value}
      </div>
      {subtitle ? (
        <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>{subtitle}</div>
      ) : null}
    </div>
  );
}

function InlineState({ loading, error }) {
  if (loading)
    return (
      <div style={{ padding: "8px 0", fontSize: 12, color: "#6b7280" }}>
        Đang tải dữ liệu...
      </div>
    );
  if (error)
    return (
      <div style={{ padding: "8px 0", fontSize: 12, color: "#b91c1c" }}>
        {error}
      </div>
    );
  return null;
}

function SectionHeader({ title, subtitle, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>{title}</div>
        {subtitle ? (
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, lineHeight: 1.5 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}

function MiniBarList({ title, subtitle, rows }) {
  const maxVal = useMemo(() => {
    const m = Math.max(...rows.map((r) => Number(r.value || 0)), 0);
    return m || 1;
  }, [rows]);

  return (
    <Card>
      <SectionHeader title={title} subtitle={subtitle} />
      <div style={{ height: 12 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r) => (
          <div
            key={r.label}
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr 90px",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{r.label}</div>

            <div style={{ height: 10, borderRadius: 9999, background: "#f3f4f6" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.round((Number(r.value || 0) / maxVal) * 100)}%`,
                  borderRadius: 9999,
                  background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 40%, #8b5cf6 100%)",
                }}
              />
            </div>

            <div style={{ fontSize: 12, textAlign: "right", color: "#111827" }}>
              {r.valueDisplay ?? r.value}
            </div>
          </div>
        ))}

        {!rows.length && <div style={{ fontSize: 12, color: "#6b7280" }}>Không có dữ liệu.</div>}
      </div>
    </Card>
  );
}

/* ================= PAGE ================= */

export default function ReportsPage() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    from_date: addDaysKey(todayKey(), -6),
    to_date: todayKey(),
    vehicle_type: "all",
    staff: "all",
    parking_area: "all", // ✅ chuẩn backend: "all" | "<id-as-string>"
  });

  /* ---------- Options ---------- */
  const [staffOptions, setStaffOptions] = useState([]);
  const [areaOptions, setAreaOptions] = useState([]);

  /* ---------- Data ---------- */
  const [summary, setSummary] = useState({
    totalTrips: 0,
    totalRevenue: 0,
    activeInYard: 0,
    staffActive: 0,
  });

  const [revenueBySource, setRevenueBySource] = useState({ parking: 0, monthly: 0 });
  const [dailyRows, setDailyRows] = useState([]);
  const [revByDay, setRevByDay] = useState([]);
  const [vehicleMix, setVehicleMix] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ---------- Build params (tránh sót parking_area) ---------- */
  const buildReportParams = (p) => ({
    from_date: p.from_date,
    to_date: p.to_date,
    vehicle_type: p.vehicle_type || "all",
    staff: p.staff || "all",
    parking_area: p.parking_area || "all", // ✅ luôn gửi
    log_type: "all",
  });

  const goLogs = (kpi) => {
    const qs = new URLSearchParams({
      from_date: filters.from_date,
      to_date: filters.to_date,
      vehicle_type: filters.vehicle_type,
      staff: filters.staff,
      parking_area: filters.parking_area, // ✅ giữ bãi
      kpi,
    });
    navigate(`/dashboard/reports/logs?${qs.toString()}`);
  };

  /* ---------- Fetch ---------- */
  const fetchOptions = async () => {
    try {
      const [staffRes, areasRes] = await Promise.all([
        axiosClient.get("/users/options"),
        axiosClient.get("/parking/areas", { params: { is_active: true } }),
      ]);

      const staffData = staffRes?.data ?? staffRes;
      setStaffOptions(Array.isArray(staffData) ? staffData.map((s) => s.full_name).filter(Boolean) : []);

      const areasData = areasRes?.data ?? areasRes;
      setAreaOptions(Array.isArray(areasData) ? areasData : []);
    } catch (e) {
      console.error(e);
      // options lỗi thì vẫn cho xem report bình thường
    }
  };

  const fetchReport = async (overrideFilters) => {
    const p = overrideFilters || filters;

    setLoading(true);
    setError("");

    try {
      const res = await axiosClient.get("/reports", {
        params: buildReportParams(p), // ✅ 1 nơi duy nhất build params
      });

      const data = res?.data ?? res;

      setSummary({
        totalTrips: data?.summary?.total_trips ?? 0,
        totalRevenue: data?.summary?.total_revenue ?? 0,
        activeInYard: data?.summary?.active_in_yard ?? 0,
        staffActive: data?.summary?.staff_active ?? 0,
      });

      setRevenueBySource({
        parking: data?.revenue_by_source?.parking ?? 0,
        monthly: data?.revenue_by_source?.monthly ?? 0,
      });

      setRevByDay(
        (data?.revenue_by_day ?? []).map((r) => ({
          label: String(r.date || "").slice(5),
          value: r.revenue ?? 0,
          valueDisplay: formatMoney(r.revenue),
        }))
      );

      setVehicleMix([
        { label: "Xe máy", value: data?.vehicle_mix?.motorbike ?? 0, valueDisplay: String(data?.vehicle_mix?.motorbike ?? 0) },
        { label: "Ô tô", value: data?.vehicle_mix?.car ?? 0, valueDisplay: String(data?.vehicle_mix?.car ?? 0) },
        { label: "Khác", value: data?.vehicle_mix?.other ?? 0, valueDisplay: String(data?.vehicle_mix?.other ?? 0) },
      ]);

      setDailyRows(Array.isArray(data?.daily_table) ? data.daily_table : []);
    } catch (e) {
      console.error(e);
      setError("Không lấy được dữ liệu báo cáo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Events ---------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // ✅ dùng filters hiện tại (state)
    fetchReport(filters);
  };

  const applyQuickRange = (type) => {
    const to = todayKey();
    let next = { ...filters, to_date: to };

    if (type === "today") next.from_date = to;
    if (type === "7d") next.from_date = addDaysKey(to, -6);
    if (type === "30d") next.from_date = addDaysKey(to, -29);

    setFilters(next);
    fetchReport(next); // ✅ truyền next để không bị lệch state
  };

  const resetAll = () => {
    const next = {
      from_date: addDaysKey(todayKey(), -6),
      to_date: todayKey(),
      vehicle_type: "all",
      staff: "all",
      parking_area: "all",
    };
    setFilters(next);
    fetchReport(next);
  };

  /* ================= RENDER ================= */

  return (
    <AppLayout title="Báo cáo">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Card>
          <SectionHeader
            title="Báo cáo"
            subtitle="Tổng hợp doanh thu, lưu lượng và cơ cấu xe theo khoảng thời gian."
            right={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button style={commonStyles.buttonSmall} onClick={() => applyQuickRange("today")} type="button">
                  Hôm nay
                </button>
                <button style={commonStyles.buttonSmall} onClick={() => applyQuickRange("7d")} type="button">
                  7 ngày
                </button>
                <button style={commonStyles.buttonSmall} onClick={() => applyQuickRange("30d")} type="button">
                  30 ngày
                </button>
              </div>
            }
          />

          <div style={{ height: 12 }} />

          <form onSubmit={handleSubmit} style={{ ...commonStyles.form, gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
              <label style={commonStyles.label}>
                Từ ngày
                <input type="date" name="from_date" value={filters.from_date} onChange={handleChange} style={commonStyles.input} />
              </label>

              <label style={commonStyles.label}>
                Đến ngày
                <input type="date" name="to_date" value={filters.to_date} onChange={handleChange} style={commonStyles.input} />
              </label>

              <label style={commonStyles.label}>
                Loại xe
                <VehicleTypeSelect value={filters.vehicle_type} onChange={handleChange} />
              </label>

              <label style={commonStyles.label}>
                Nhân viên
                <select name="staff" value={filters.staff} onChange={handleChange} style={commonStyles.select}>
                  <option value="all">Tất cả</option>
                  {staffOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label style={commonStyles.label}>
                Bãi đỗ
                <select
                  name="parking_area"
                  value={filters.parking_area}
                  onChange={handleChange}
                  style={commonStyles.select}
                >
                  <option value="all">Tất cả</option>
                  {areaOptions.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={commonStyles.actionsRow}>
              <button type="submit" style={commonStyles.buttonPrimary} disabled={loading}>
                Xem báo cáo
              </button>
              <button type="button" style={commonStyles.buttonSecondary} onClick={resetAll} disabled={loading}>
                Reset
              </button>
            </div>

            <InlineState loading={loading} error={error} />
          </form>
        </Card>

        <Card>
          <SectionHeader title="Tổng quan" subtitle="KPI chính theo bộ lọc hiện tại." />
          <div style={{ height: 12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
            <KpiCard title="Tổng lượt xe" value={summary.totalTrips} onClick={() => goLogs("total_trips")} />
            <KpiCard title="Tổng doanh thu" value={formatMoney(summary.totalRevenue)} onClick={() => goLogs("total_revenue")} />
            <KpiCard title="Doanh thu gửi xe" value={formatMoney(revenueBySource.parking)} onClick={() => goLogs("parking_revenue")} />
            <KpiCard title="Doanh thu vé tháng" value={formatMoney(revenueBySource.monthly)} onClick={() => goLogs("monthly_revenue")} />
            <KpiCard title="Xe trong bãi" value={String(summary.activeInYard)} onClick={() => goLogs("active_in_yard")} />
          </div>
        </Card>

        <div style={commonStyles.pageGrid}>
          <MiniBarList title="Doanh thu theo ngày" subtitle="Tổng doanh thu theo từng ngày trong khoảng lọc." rows={revByDay} />
          <MiniBarList title="Cơ cấu xe" subtitle="Tổng lượt theo loại xe." rows={vehicleMix} />
        </div>

        <Card>
          <SectionHeader title="Bảng chi tiết" subtitle="Tổng hợp theo ngày (daily_table)." />
          <div style={{ height: 10 }} />

          <table style={commonStyles.table}>
            <thead>
              <tr>
                <th style={commonStyles.th}>Ngày</th>
                <th style={commonStyles.th}>Lượt</th>
                <th style={commonStyles.th}>Doanh thu</th>
                <th style={commonStyles.th}>Xe máy</th>
                <th style={commonStyles.th}>Ô tô</th>
                <th style={commonStyles.th}>Khác</th>
              </tr>
            </thead>
            <tbody>
              {dailyRows.map((r) => (
                <tr key={r.date}>
                  <td style={commonStyles.td}>{r.date}</td>
                  <td style={commonStyles.td}>{r.trips}</td>
                  <td style={commonStyles.td}>{formatMoney(r.revenue)}</td>
                  <td style={commonStyles.td}>{r.motorbike}</td>
                  <td style={commonStyles.td}>{r.car}</td>
                  <td style={commonStyles.td}>{r.other}</td>
                </tr>
              ))}

              {!dailyRows.length && !loading ? (
                <tr>
                  <td style={{ ...commonStyles.td, color: "#6b7280" }} colSpan={6}>
                    Không có dữ liệu trong khoảng thời gian đã chọn.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </div>
    </AppLayout>
  );
}
