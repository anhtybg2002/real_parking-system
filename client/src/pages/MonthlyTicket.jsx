// src/pages/MonthlyTickets.jsx
import React, { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import Card from "../components/common/Card";
import AlertMessages from "../components/inout/AlertMessages";
import axiosClient from "../api/axiosClient";
import styles from "../styles/commonStyles";
import { formatTime } from "../components/common/deps";
import ExpiryReminderPanel from "../components/monthlyticket/ExpiryReminderPanel";
import { renderTemplate } from "../api/settingsTemplates";

import useVehicleTypes from "../hooks/useVehicleTypes";

// Helper: Mở cửa sổ in
const openPrintWindow = (textOrHtml) => {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) {
    alert("Trình duyệt đang chặn popup. Hãy cho phép pop-up để in.");
    return;
  }

  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(String(textOrHtml || ""));

  const body = looksLikeHtml
    ? String(textOrHtml || "")
    : `<pre style="white-space:pre-wrap;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;font-size:13px;line-height:1.6;margin:0;">${String(
        textOrHtml || "—"
      )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</pre>`;

  w.document.open();
  w.document.write(`
    <html>
      <head>
        <title>In hóa đơn vé tháng</title>
        <meta charset="utf-8" />
        <style>
          @media print { body { margin: 0; } }
          body { padding: 16px; color: #111827; }
        </style>
      </head>
      <body>
        ${body}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  w.document.close();
};

// Dùng chung: trả về CHỈ ngày dd/mm/yyyy
const formatDateVN = (value) => {
  if (!value) return "";

  // Nếu backend trả "YYYY-MM-DD" (kiểu date thuần)
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }

  // Nếu là datetime → dùng formatTime rồi lấy phần ngày
  const full = formatTime(value); // ví dụ "04/12/2025 16:34:26"
  return full ? full.split(" ")[0] : "";
};
const isValidEmail = (email) => {
  if (!email) return true; // cho phép bỏ trống
  // Regex đủ chặt cho UI (không quá khó chịu)
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
};





export default function MonthlyTicketsPage() {
  const vehicleTypes = useVehicleTypes();
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: "", message: "" });
  const todayStr = new Date().toISOString().slice(0, 10);




  const [reminderConfig, setReminderConfig] = useState({
  enabled: true,
  days_before: [5, 10],
  send_time: "08:30",
  timezone: "Asia/Ho_Chi_Minh",
  scope: "all",   // "all" | "by_area"
  area: "",
  test_email: "",
  });


  const [savingReminder, setSavingReminder] = useState(false);


  const [formCreate, setFormCreate] = useState({
    license_plate_number: "",
    vehicle_type: "car",
    customer_name: "",
    customer_phone: "",
    customer_id_number: "",
    email:"",
    area: "",
    start_date: todayStr,
    months: 1,
    note: "",
  });

  const [renewPlate, setRenewPlate] = useState("");
  const [renewMonths, setRenewMonths] = useState(1);
  const [monthlyPrice, setMonthlyPrice] = useState("");

  // Hàm in hóa đơn vé tháng
  const handlePrintInvoice = async (ticketData) => {
    try {
      const siteInfo = {
        site_name: "Bãi Đỗ Xe ABC",
        site_address: "123 Đường XYZ, Quận 1, TP.HCM",
        site_phone: "0123 456 789",
        invoice_note: "Giữ vé cẩn thận – mất vé phạt theo quy định"
      };

      const vehicleLabel = vehicleTypes.list.find(v => v.key === ticketData?.vehicle_type)?.label || ticketData?.vehicle_type || "—";

      const templateData = {
        log_type: "Vé tháng",
        license_plate: ticketData?.license_plate_number || "—",
        vehicle_type: vehicleLabel,
        entry_time: ticketData?.start_date ? formatDateVN(ticketData.start_date) : "—",
        exit_time: ticketData?.end_date ? formatDateVN(ticketData.end_date) : "—",
        amount: ticketData?.price ? ticketData.price.toLocaleString("vi-VN") : "0",
        customer_name: ticketData?.customer_name || "—",
        area: ticketData?.area || "—",
        ...siteInfo
      };

      const res = await renderTemplate("invoice_print", templateData);
      const r = res?.data ?? res;
      const d = r?.data?.data ?? r?.data ?? r;
      const body = d?.body ?? d?.rendered ?? d ?? "";

      if (!body) {
        alert("Không thể tạo hóa đơn in.");
        return;
      }

      openPrintWindow(body);
    } catch (err) {
      console.error("Print invoice error:", err);
      alert(err?.response?.data?.detail || "Lỗi khi in hóa đơn.");
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);

      const res = await axiosClient.get("/monthly-tickets", {
        params: {
          q: search || undefined,
          start_date: filterStart || undefined,
          end_date: filterEnd || undefined,
        },
      });

      // axiosClient đã interceptor → res thường là data luôn
      const data = res?.data ?? res ?? [];
      setTickets(Array.isArray(data) ? data : data.data ?? []);
    } catch (err) {
      console.error(err);
      setAlert({
        type: "error",
        message:
          "Không tải được danh sách vé tháng. Kiểm tra API /monthly-tickets.",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveReminderConfig = async () => {
  // Validate logic
    if (reminderConfig.enabled) {
      if (!reminderConfig.days_before?.length) {
        setAlert({ type: "error", message: "Vui lòng chọn ít nhất 1 mốc ngày nhắc hạn." });
        return;
      }
      if (reminderConfig.scope === "by_area" && !reminderConfig.area) {
        setAlert({ type: "error", message: "Vui lòng chọn khu vực áp dụng." });
        return;
      }
    }

    try {
      setSavingReminder(true);

      // TODO: gọi API thật
      // await axiosClient.put("/settings/monthly-ticket-reminder", reminderConfig);

      setAlert({ type: "entry", message: "Đã lưu cấu hình nhắc hạn email." });
    } catch (e) {
      console.error(e);
      setAlert({ type: "error", message: "Không lưu được cấu hình nhắc hạn." });
    } finally {
      setSavingReminder(false);
    }
  };

  const sendTestEmail = async () => {
    const email = (reminderConfig.test_email || "").trim();
    if (!email) {
      setAlert({ type: "error", message: "Vui lòng nhập email nhận thử." });
      return;
    }
    if (!isValidEmail(email)) {
      setAlert({ type: "error", message: "Email nhận thử không đúng định dạng." });
      return;
    }

    try {
      // TODO: gọi API thật
      // await axiosClient.post("/monthly-tickets/reminder/test", { email, config: reminderConfig });

      setAlert({ type: "entry", message: `Đã gửi email test tới ${email} (mock UI).` });
    } catch (e) {
      console.error(e);
      setAlert({ type: "error", message: "Gửi email test thất bại." });
    }
  };


  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteTicket = async (ticket) => {
    if (
      !window.confirm(
        `Xóa vé tháng của xe ${ticket.license_plate_number} ở khu vực ${
          ticket.area || ""
        }?`
      )
    ) {
      return;
    }

    try {
      await axiosClient.delete(`/monthly-tickets/${ticket.id}`);
      setAlert({
        type: "entry",
        message: "Đã xóa vé tháng.",
      });
      await fetchTickets();
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.detail ||
        "Không thể xóa vé tháng. Vui lòng thử lại.";
      setAlert({
        type: "error",
        message: msg,
      });
    }
  };

  const handleChangeCreate = (e) => {
    const { name, value } = e.target;

    setFormCreate((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "vehicle_type" || name === "area") {
        fetchMonthlyPrice(
          name === "vehicle_type" ? value : next.vehicle_type,
          name === "area" ? value : next.area
        );
      }

      return next;
    });
  };

  const fetchMonthlyPrice = async (vehicleType, area) => {
    if (!vehicleType || !area) {
      setMonthlyPrice("");
      return;
    }
    try {
      const res = await axiosClient.get(
        "/monthly-tickets/quote-monthly-price",
        {
          params: { vehicle_type: vehicleType, area },
        }
      );
      const data = res?.data ?? res;
      setMonthlyPrice(data.monthly_price ?? "");
      setAlert((prev) =>
        prev.type === "error" ? { type: "", message: "" } : prev
      );
    } catch (err) {
      console.error(err);
      setMonthlyPrice("");
      setAlert({
        type: "error",
        message: "Chưa cấu hình giá vé tháng cho khu vực / loại xe này.",
      });
    }
  };

  const handleResetCreate = () => {
    setFormCreate({
      license_plate_number: "",
      vehicle_type: "car",
      customer_name: "",
      customer_phone: "",
      customer_id_number: "",
      email: "",
      area: "",
      start_date: todayStr,
      months: 1,
      note: "",
    });
    setMonthlyPrice("");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setAlert({ type: "", message: "" });

    const emailTrim = (formCreate.email || "").trim();

    if (!isValidEmail(emailTrim)) {
      setAlert({ type: "error", message: "Email không đúng định dạng." });
      return;
    }


    if (!formCreate.license_plate_number.trim()) {
      setAlert({ type: "error", message: "Vui lòng nhập biển số xe." });
      return;
    }

    if (!formCreate.area.trim()) {
      setAlert({ type: "error", message: "Vui lòng nhập khu vực." });
      return;
    }

    if (!formCreate.start_date) {
      setAlert({
        type: "error",
        message: "Vui lòng chọn ngày bắt đầu.",
      });
      return;
    }

    if (!formCreate.months || Number(formCreate.months) <= 0) {
      setAlert({
        type: "error",
        message: "Thời gian (tháng) phải > 0.",
      });
      return;
    }

    try {
      const res = await axiosClient.post("/monthly-tickets", {
        license_plate_number: formCreate.license_plate_number.trim(),
        vehicle_type: formCreate.vehicle_type,
        customer_name: formCreate.customer_name.trim(),
        customer_phone: formCreate.customer_phone.trim() || null,
        customer_id_number: formCreate.customer_id_number.trim() || null,
        email:emailTrim || null,
        area: formCreate.area.trim(),
        start_date: formCreate.start_date,
        months: Number(formCreate.months),
        note: formCreate.note.trim() || null,
      });

      const raw = res?.data ?? res;
      const ticket = raw?.data ?? raw;
      const amount = typeof ticket?.price === "number" ? ticket.price : 0;

      let message = "Đã lưu vé tháng.";
      if (amount > 0) {
        message += ` Số tiền cần thu: ${amount.toLocaleString("vi-VN")} đ.`;
      }

      setAlert({
        type: "entry",
        message,
        entryData: ticket, // Lưu dữ liệu ticket để in
      });

      await fetchTickets();
      handleResetCreate();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        "Không thể lưu vé tháng. Vui lòng kiểm tra lại dữ liệu.";
      setAlert({ type: "error", message: msg });
    }
  };

  const handleRenew = async (e) => {
    e.preventDefault();
    setAlert({ type: "", message: "" });

    if (!renewPlate.trim()) {
      setAlert({ type: "error", message: "Vui lòng nhập biển số cần gia hạn." });
      return;
    }

    try {
      await axiosClient.post("/monthly-tickets/renew", {
        license_plate_number: renewPlate.trim(),
        months: Number(renewMonths || 1),
      });

      setAlert({ type: "entry", message: "Đã gia hạn vé tháng." });
      await fetchTickets();
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.detail ||
        "Không thể gia hạn vé tháng. Vui lòng kiểm tra lại.";
      setAlert({ type: "error", message: msg });
    }
  };

  const statusLabel = (ticket) => {
    if (!ticket.is_active)
      return { text: "Đã hủy", bg: "#f3f4f6", color: "#4b5563" };
    const now = new Date();
    const end = new Date(ticket.end_date);
    const diffDays = (end - now) / (1000 * 60 * 60 * 24);
    if (diffDays < 0)
      return { text: "Hết hạn", bg: "#fee2e2", color: "#b91c1c" };
    if (diffDays <= 7)
      return { text: "Sắp hết hạn", bg: "#fef3c7", color: "#92400e" };
    return { text: "Còn hiệu lực", bg: "#dcfce7", color: "#166534" };
  };

  const vehicleLabel = (value) => {
    const found = vehicleTypes.list.find((v) => v.key === value);
    return found ? found.label : value;
  };

  return (
    <AppLayout title="Vé tháng">
      <AlertMessages alert={alert} onPrintTicket={handlePrintInvoice} />



        
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Hàng trên: Đăng ký + Gia hạn */}
        <div style={styles.pageGrid}>
          {/* Đăng ký vé tháng */}
          <Card>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              Đăng ký vé tháng
            </h3>

            <form
              onSubmit={handleCreate}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                fontSize: 13,
              }}
            >
              <label style={styles.label}>
                <span>Biển số</span>
                <input
                  name="license_plate_number"
                  value={formCreate.license_plate_number}
                  onChange={handleChangeCreate}
                  placeholder="30A-123.45"
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                <span>Khu vực</span>
                <input
                  name="area"
                  value={formCreate.area}
                  onChange={handleChangeCreate}
                  placeholder="A, B, Tầng 2..."
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                <span>Loại xe</span>
                <select
                  name="vehicle_type"
                  value={formCreate.vehicle_type}
                  onChange={handleChangeCreate}
                  style={styles.select}
                >
                  {(vehicleTypes.list.length ? vehicleTypes.list : [
                    { key: "car", label: "Ô tô" },
                    { key: "motorbike", label: "Xe máy" },
                    { key: "other", label: "Khác" },
                  ]).map((v) => (
                    <option key={v.key} value={v.key}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.label}>
                <span>Tên chủ xe</span>
                <input
                  name="customer_name"
                  value={formCreate.customer_name}
                  onChange={handleChangeCreate}
                  placeholder="Tên khách hàng"
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                <span>SĐT</span>
                <input
                  name="customer_phone"
                  value={formCreate.customer_phone}
                  onChange={handleChangeCreate}
                  placeholder="Số điện thoại liên hệ"
                  style={styles.input}
                />
              </label>
              
              <label style={styles.label}>
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  value={formCreate.email}
                  onChange={handleChangeCreate}
                  placeholder="abc@email.com"
                  style={{
                    ...styles.input,
                    border:
                      formCreate.email && !isValidEmail(formCreate.email)
                        ? "1px solid #ef4444"
                        : styles.input?.border,
                  }}
                />
                {formCreate.email && !isValidEmail(formCreate.email) && (
                  <div style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
                    Email không đúng định dạng.
                  </div>
                )}
              </label>

              <label style={styles.label}>
                <span>CMND/CCCD</span>
                <input
                  name="customer_id_number"
                  value={formCreate.customer_id_number}
                  onChange={handleChangeCreate}
                  placeholder="Số giấy tờ tùy thân (nếu có)"
                  style={styles.input}
                />
              </label>

              <label style={{ ...styles.label, gridColumn: "1 / -1" }}>
                <span>Ngày bắt đầu</span>
                <input
                  type="date"
                  name="start_date"
                  value={formCreate.start_date}
                  onChange={handleChangeCreate}
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                <span>Thời gian (tháng)</span>
                <input
                  type="number"
                  name="months"
                  min={1}
                  value={formCreate.months}
                  onChange={handleChangeCreate}
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                <span>Giá vé tháng (VND)</span>
                <input
                  name="monthly_price_display"
                  value={
                    monthlyPrice !== ""
                      ? monthlyPrice.toLocaleString("vi-VN")
                      : ""
                  }
                  readOnly
                  style={{
                    ...styles.input,
                    backgroundColor: "#eef2ff",
                    cursor: "not-allowed",
                  }}
                  placeholder="Tự lấy từ cấu hình giá"
                />
              </label>

              <label style={{ ...styles.label, gridColumn: "1 / -1" }}>
                <span>Ghi chú</span>
                <input
                  name="note"
                  value={formCreate.note}
                  onChange={handleChangeCreate}
                  placeholder="Có thể để trống nếu không có ghi chú"
                  style={styles.input}
                />
              </label>

              <div
                style={{
                  ...styles.actionsRow,
                  justifyContent: "flex-end",
                  gridColumn: "1 / -1",
                  marginTop: 6,
                }}
              >
                <button
                  type="button"
                  onClick={handleResetCreate}
                  style={styles.buttonSecondary}
                >
                  Đặt lại
                </button>
                <button type="submit" style={styles.buttonPrimary}>
                  Lưu
                </button>
              </div>
            </form>
          </Card>

          {/* Gia hạn vé tháng */}
          <Card>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              Gia hạn vé tháng
            </h3>

            <form style={styles.form} onSubmit={handleRenew}>
              <label style={styles.label}>
                <span>Biển số</span>
                <input
                  value={renewPlate}
                  onChange={(e) => setRenewPlate(e.target.value)}
                  placeholder="30A-123.45"
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                <span>Thời gian gia hạn (tháng)</span>
                <input
                  type="number"
                  min={1}
                  value={renewMonths}
                  onChange={(e) => setRenewMonths(e.target.value)}
                  style={styles.input}
                />
              </label>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 6,
                }}
              >
                <button type="submit" style={styles.buttonPrimary}>
                  Gia hạn
                </button>
              </div>
            </form>
          </Card>
        </div>

        {/* Danh sách vé tháng */}
        <Card>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              Danh sách vé tháng
            </h3>
            <button
              type="button"
              onClick={fetchTickets}
              style={styles.buttonSecondary}
            >
              Tìm kiếm
            </button>
          </div>

          {/* bộ lọc */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <input
              placeholder="Tìm theo biển số / tên / khu vực..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...styles.input, maxWidth: 260 }}
            />
            <input
              type="date"
              value={filterStart}
              onChange={(e) => setFilterStart(e.target.value)}
              style={styles.input}
            />
            <input
              type="date"
              value={filterEnd}
              onChange={(e) => setFilterEnd(e.target.value)}
              style={styles.input}
            />
          </div>

          {loading ? (
            <div style={{ padding: 12 }}>Đang tải...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Biển số</th>
                    <th style={styles.th}>Khu vực</th>
                    <th style={styles.th}>Ngày bắt đầu</th>
                    <th style={styles.th}>Ngày hết hạn</th>
                    <th style={styles.th}>Loại xe</th>
                    <th style={styles.th}>Trạng thái</th>
                    <th style={styles.th}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => {
                    const st = statusLabel(t);
                    return (
                      <tr key={t.id}>
                        <td style={styles.td}>{t.license_plate_number}</td>
                        <td style={styles.td}>{t.area}</td>
                        <td style={styles.td}>{formatDateVN(t.start_date)}</td>
                        <td style={styles.td}>{formatDateVN(t.end_date)}</td>
                        <td style={styles.td}>{vehicleLabel(t.vehicle_type)}</td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.pill,
                              backgroundColor: st.bg,
                              color: st.color,
                            }}
                          >
                            {st.text}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <button
                            type="button"
                            onClick={() => handleDeleteTicket(t)}
                            style={styles.buttonDanger}
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!tickets.length && (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          ...styles.td,
                          textAlign: "center",
                          color: "#6b7280",
                        }}
                      >
                        Chưa có vé tháng nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
