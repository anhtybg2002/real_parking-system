// src/pages/InvoicesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import Card from "../components/common/Card";
import commonStyles from "../styles/commonStyles";
import axiosClient from "../api/axiosClient";
import { formatTime } from "../components/common/deps";

import { renderTemplate } from "../api/settingsTemplates";


// -----------------------------
// Helpers
// -----------------------------
const safeStr = (v) => (v == null ? "" : String(v));




const formatDuration = (entryIso, exitIso) => {
  const a = parseToLocalDate(entryIso);
  const b = parseToLocalDate(exitIso);
  if (!a || !b) return "—";
  const ms = Math.max(0, b.getTime() - a.getTime());
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m} phút`;
  return `${h} giờ ${m} phút`;
};

const openPrintWindow = (textOrHtml) => {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) {
    alert("Trình duyệt đang chặn popup. Hãy cho phép pop-up để in hóa đơn.");
    return;
  }

  // Nếu template bạn lưu là text thuần -> hiển thị trong <pre>
  // Nếu template là HTML -> vẫn OK (sẽ render như HTML)
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
        <title>In hóa đơn</title>
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



const parseToLocalDate = (isoString) => {
  if (!isoString) return null;
  // Nếu backend trả ISO UTC kiểu "...Z" => dùng luôn
  // Nếu backend trả "...+00:00" hoặc "...+07:00" => Date parse được
  // Nếu backend trả thiếu timezone => cố tình append Z (treat as UTC)
  const s = String(isoString);
  const normalized = /Z$|[+-]\d{2}:\d{2}$/.test(s) ? s : `${s}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
};

const toDateKey = (d) => (d ? d.toLocaleDateString("en-CA") : "");

const vehicleTypeLabel = (type) => {
  const t = safeStr(type).trim().toLowerCase();
  if (t === "motorbike") return "Xe Máy";
  if (t === "car") return "Ô Tô";
  return "Khác";
};

const logTypeLabel = (type) => {
  if (type === "parking") return "Gửi xe";
  if (type === "monthly_payment") return "Vé tháng";
  return safeStr(type);
};

const buildImageSrc = (raw) => {
  if (!raw) return null;

  const s = String(raw).trim();

  // đã là data url
  if (s.startsWith("data:image")) return s;

  // Nếu lỡ trả về dạng b'xxxxx' hoặc "xxxxx"
  let cleaned = s.replace(/^b['"]|['"]$/g, "");
  cleaned = cleaned.replace(/\s/g, "");

  // base64 thuần
  return `data:image/jpeg;base64,${cleaned}`;
};



// -----------------------------
// Component
// -----------------------------
export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [printingId, setPrintingId] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    license_plate: "",
    entry_date: "",
    exit_date: "",
    entry_staff: "all",
    exit_staff: "all",
  });
  

  // Modal detail
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const actionButton = useMemo(
    () => ({
      ...commonStyles.buttonSmall,
      padding: "4px 10px",
      fontSize: 12,
      whiteSpace: "nowrap",
    }),
    []
  );

  // -----------------------------
  // Fetch invoices
  // -----------------------------
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/invoices");
      const data = res?.data || [];

      const formatted = (Array.isArray(data) ? data : []).map((item) => {
        const entryObj = parseToLocalDate(item.entry_time);
        const exitObj = parseToLocalDate(item.exit_time);

        return {
          ...item,

          // display
          entry_time_display: formatTime(item.entry_time),
          exit_time_display: formatTime(item.exit_time),

          // date keys for filtering
          entryDateKey: toDateKey(entryObj),
          exitDateKey: toDateKey(exitObj),

          // normalize
          license_plate_norm: safeStr(item.license_plate).toLowerCase(),
          entry_staff_norm: safeStr(item.entry_staff),
          exit_staff_norm: safeStr(item.exit_staff),

          // safe amount
          amount_safe: typeof item.amount === "number" ? item.amount : Number(item.amount) || 0,
        };
      });

      setInvoices(formatted);
    } catch (err) {
      console.error(err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // -----------------------------
  // Filter options (staff)
  // -----------------------------
  const entryStaffOptions = useMemo(() => {
    const s = new Set();
    invoices.forEach((i) => {
      if (i?.entry_staff_norm) s.add(i.entry_staff_norm);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "vi"));
  }, [invoices]);

  const exitStaffOptions = useMemo(() => {
    const s = new Set();
    invoices.forEach((i) => {
      if (i?.exit_staff_norm) s.add(i.exit_staff_norm);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "vi"));
  }, [invoices]);

  // -----------------------------
  // Filtered list
  // -----------------------------
  const filteredInvoices = useMemo(() => {
    const plate = safeStr(filters.license_plate).trim().toLowerCase();

    return invoices.filter((inv) => {
      const byPlate = plate ? inv.license_plate_norm.includes(plate) : true;

      const byEntryDate = filters.entry_date ? inv.entryDateKey === filters.entry_date : true;
      const byExitDate = filters.exit_date ? inv.exitDateKey === filters.exit_date : true;

      const byEntryStaff =
        filters.entry_staff === "all" ? true : inv.entry_staff_norm === filters.entry_staff;

      const byExitStaff =
        filters.exit_staff === "all" ? true : inv.exit_staff_norm === filters.exit_staff;

      return byPlate && byEntryDate && byExitDate && byEntryStaff && byExitStaff;
    });
  }, [invoices, filters]);

  // -----------------------------
  // Handlers
  // -----------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      license_plate: "",
      entry_date: "",
      exit_date: "",
      entry_staff: "all",
      exit_staff: "all",
    });
  };

  const handleViewDetail = (invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedInvoice(null);
  };
  
  const handlePrintInvoice = async (inv) => {
  try {
    setPrintingId(inv?.id ?? "tmp");

    // Data gửi sang backend render template invoice_print
    // ✅ keys khớp PrintTemplatesModal bạn đang dùng
    const data = {
      // log fields
      license_plate: inv.license_plate || "—",
      vehicle_type: vehicleTypeLabel(inv.vehicle_type) || "—",
      entry_time: inv.entry_time_display || formatTime(inv.entry_time) || "—",
      exit_time: inv.exit_time_display || formatTime(inv.exit_time) || "—",
      duration: formatDuration(inv.entry_time, inv.exit_time),
      amount: (inv.amount_safe ?? 0).toLocaleString("vi-VN"),

      // staff (nếu invoices API đã trả string tên)
      entry_staff: inv.entry_staff || "—",
      exit_staff: inv.exit_staff || "—",

      // optional (nếu invoices API có trả)
      parking_area: inv.parking_area || inv.parking_area_name || "—",
      slot_code: inv.slot_code || inv.parking_slot_code || "—",

      // thêm vài biến hay dùng nếu bạn muốn đưa vào template
      log_id: inv.id ?? "",
      log_type:
        inv.log_type === "parking"
          ? "Vé gửi xe"
          : inv.log_type === "monthly_payment"
          ? "Vé tháng"
          : "",
    };

    // Gọi backend render template "invoice_print"
    const res = await renderTemplate("invoice_print", data);

    // pickRendered giống SettingsHubPage (ăn mọi kiểu response)
    const r = res?.data ?? res;
    const d = r?.data?.data ?? r?.data ?? r;
    const body = d?.body ?? d?.rendered ?? d ?? "";

    openPrintWindow(body);
  } catch (e) {
    console.error(e);
    alert(e?.response?.data?.detail || "In hóa đơn thất bại.");
  } finally {
    setPrintingId(null);
  }
};






  // -----------------------------
  // Render
  // -----------------------------
  return (
    <AppLayout title="Quản lý hóa đơn">
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Quản lý hóa đơn</h2>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="button" style={commonStyles.buttonSecondary} onClick={fetchInvoices} disabled={loading}>
              {loading ? "Đang tải..." : "Tải lại"}
            </button>
            <button type="button" style={commonStyles.buttonSecondary} onClick={handleResetFilters}>
              Reset lọc
            </button>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            marginTop: 14,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "flex-end",
          }}
        >
          {/* Plate */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>Biển số xe</span>
            <input
              type="text"
              name="license_plate"
              value={filters.license_plate}
              onChange={handleChange}
              placeholder="Nhập biển số..."
              style={commonStyles.input}
            />
          </div>

          {/* Entry date */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>Ngày vào</span>
            <input type="date" name="entry_date" value={filters.entry_date} onChange={handleChange} style={commonStyles.input} />
          </div>

          {/* Exit date */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>Ngày ra</span>
            <input type="date" name="exit_date" value={filters.exit_date} onChange={handleChange} style={commonStyles.input} />
          </div>

          {/* Entry staff */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>Nhân viên vào</span>
            <select name="entry_staff" value={filters.entry_staff} onChange={handleChange} style={commonStyles.select}>
              <option value="all">Tất cả</option>
              {entryStaffOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Exit staff */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>Nhân viên thu</span>
            <select name="exit_staff" value={filters.exit_staff} onChange={handleChange} style={commonStyles.select}>
              <option value="all">Tất cả</option>
              {exitStaffOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Count */}
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>
            Đang hiển thị: <b>{filteredInvoices.length}</b> / {invoices.length}
          </div>
        </div>

        {/* Table */}
        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table style={commonStyles.table}>
            <thead>
              <tr>
                <th style={commonStyles.th}>#</th>
                <th style={commonStyles.th}>Loại hóa đơn</th>
                <th style={commonStyles.th}>Biển số</th>
                <th style={commonStyles.th}>Tổng tiền</th>
                <th style={commonStyles.th}>Nhân viên vào</th>
                <th style={commonStyles.th}>Nhân viên thu tiền</th>
                <th style={commonStyles.th}>Giờ vào</th>
                <th style={commonStyles.th}>Giờ ra</th>
                <th style={{ ...commonStyles.th, textAlign: "right" }}>Hành động</th>
              </tr>
            </thead>

            <tbody>
              {filteredInvoices.map((inv, idx) => (
                <tr key={inv.id ?? `${inv.license_plate}-${idx}`}>
                  <td style={commonStyles.td}>{idx + 1}</td>
                  <td style={commonStyles.td}>{logTypeLabel(inv.log_type)}</td>
                  <td style={commonStyles.td}>{inv.license_plate || "—"}</td>
                  <td style={commonStyles.td}>{(inv.amount_safe ?? 0).toLocaleString("vi-VN")}đ</td>
                  <td style={commonStyles.td}>{inv.entry_staff || "—"}</td>
                  <td style={commonStyles.td}>{inv.exit_staff || "—"}</td>
                  <td style={commonStyles.td}>{inv.entry_time_display || "—"}</td>
                  <td style={commonStyles.td}>{inv.exit_time_display || "—"}</td>
                  <td style={{ ...commonStyles.td, textAlign: "right" }}>
                    <div style={commonStyles.rowActions}>
                      <button type="button" style={actionButton} onClick={() => handleViewDetail(inv)}>
                        Xem chi tiết
                      </button>
                      <button
                        type="button"
                        style={actionButton}
                        onClick={() => handlePrintInvoice(inv)}
                        disabled={printingId === (inv?.id ?? "tmp")}
                      >
                        {printingId === (inv?.id ?? "tmp") ? "Đang in..." : "In hóa đơn"}
                      </button>

                    </div>
                  </td>
                </tr>
              ))}

              {!loading && filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={9} style={commonStyles.td}>
                    Không có hóa đơn nào phù hợp bộ lọc.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={9} style={commonStyles.td}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail modal */}
      {isDetailOpen && selectedInvoice && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={handleCloseDetail}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 12,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 540,
              maxWidth: "100%",
              maxHeight: "90vh",
              background: "#fff",
              borderRadius: 12,
              padding: 18,
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Chi tiết hóa đơn</h3>
              <button type="button" onClick={handleCloseDetail} style={commonStyles.buttonSecondary}>
                Đóng
              </button>
            </div>

            {/* Text info */}
            <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.7 }}>
              <div><strong>Biển số:</strong> {selectedInvoice.license_plate || "—"}</div>
              <div><strong>Loại hóa đơn:</strong> {logTypeLabel(selectedInvoice.log_type) || "—"}</div>
              <div><strong>Loại xe:</strong> {vehicleTypeLabel(selectedInvoice.vehicle_type) || "—"}</div>
              <div><strong>Nhân viên vào:</strong> {selectedInvoice.entry_staff || "—"}</div>
              <div><strong>Nhân viên thu tiền:</strong> {selectedInvoice.exit_staff || "—"}</div>
              <div><strong>Giờ vào:</strong> {selectedInvoice.entry_time_display || "—"}</div>
              <div><strong>Giờ ra:</strong> {selectedInvoice.exit_time_display || "—"}</div>
              <div>
                <strong>Tổng tiền:</strong>{" "}
                {(Number(selectedInvoice.amount) || 0).toLocaleString("vi-VN")}đ
              </div>
            </div>

            {/* Images */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Ảnh biển số</div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {/* Entry image */}
                {buildImageSrc(selectedInvoice.entry_plate_image) ? (
                  <div style={{ flex: "1 1 48%", minWidth: 200 }}>
                    <div style={{ fontSize: 13, marginBottom: 6, fontWeight: 600 }}>Ảnh lúc vào</div>
                    <div style={{ borderRadius: 8, border: "1px solid #e5e7eb", padding: 6, background: "#f9fafb" }}>
                      <img
                        src={buildImageSrc(selectedInvoice.entry_plate_image)}
                        alt="Biển số lúc vào"
                        style={{ width: "100%", height: "auto", display: "block", borderRadius: 6, objectFit: "contain" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: "1 1 48%", minWidth: 200, fontSize: 13, color: "#6b7280" }}>
                    Không có ảnh lúc vào.
                  </div>
                )}

                {/* Exit image */}
                {buildImageSrc(selectedInvoice.exit_plate_image) ? (
                  <div style={{ flex: "1 1 48%", minWidth: 200 }}>
                    <div style={{ fontSize: 13, marginBottom: 6, fontWeight: 600 }}>Ảnh lúc ra</div>
                    <div style={{ borderRadius: 8, border: "1px solid #e5e7eb", padding: 6, background: "#f9fafb" }}>
                      <img
                        src={buildImageSrc(selectedInvoice.exit_plate_image)}
                        alt="Biển số lúc ra"
                        style={{ width: "100%", height: "auto", display: "block", borderRadius: 6, objectFit: "contain" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: "1 1 48%", minWidth: 200, fontSize: 13, color: "#6b7280" }}>
                    Không có ảnh lúc ra.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
