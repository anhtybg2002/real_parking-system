// src/pages/SettingsHubPage.jsx
import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import Card from "../components/common/Card";
import commonStyles from "../styles/commonStyles";
import Tile from "../components/common/Tile";

import SiteInfoModal from "../components/settings/SiteInfoModal";
import MonthlyEmailReminderModal from "../components/settings/MonthlyEmailReminderModal";
import PrintTemplatesModal from "../components/settings/PrintTemplatesModal";
import RbacModal from "../components/settings/RbacModal";

import { isValidEmail } from "../components/settings/validators";
import {
  getTemplate,
  updateTemplate,
  resetTemplate,
  renderTemplate,
  sendTestMonthlyExpiryEmail,
} from "../api/settingsTemplates";

/** =========================================================
 * Helpers: "ăn mọi kiểu response"
 * ======================================================= */
function pickData(res) {
  const r = res?.data ?? res;
  return r?.data?.data ?? r?.data ?? r;
}

function pickTemplate(res, fallbackKey) {
  const d = pickData(res) || {};
  return {
    key: d.key ?? fallbackKey,
    subject: d.subject ?? (fallbackKey === "invoice_print" ? null : ""),
    body: d.body ?? "",
    description: d.description ?? "",
  };
}

function pickRendered(res) {
  const d = pickData(res) || {};
  return {
    subject: d.subject ?? "",
    body: d.body ?? "",
  };
}

export default function SettingsHubPage() {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null);

  // ===== SITE INFO (chuẩn hoá key: site_*) =====
  const [site, setSite] = useState({
    site_name: "Hệ thống quản lý đỗ xe",
    site_phone: "",
    site_address: "",
    invoice_note: "Giữ vé cẩn thận – mất vé phạt theo quy định",
  });

  // ===== Monthly Email Reminder (demo state) =====
  const [monthlyEmail, setMonthlyEmail] = useState({
    enabled: true,
    days_before: [5, 10],
    send_time: "08:30",
    test_email: "",
    scope: "all",
    area: "",
  });

  // ===== Templates from backend =====
  const [invoiceTpl, setInvoiceTpl] = useState({
    key: "invoice_print",
    subject: null,
    body: "",
    description: "",
  });

  const [emailTpl, setEmailTpl] = useState({
    key: "monthly_expiry_email",
    subject: "",
    body: "",
    description: "",
  });

  const [entryTicketTpl, setEntryTicketTpl] = useState({
    key: "entry_ticket_print",
    subject: null,
    body: "",
    description: "",
  });

  // ===== Previews =====
  const [invoicePreview, setInvoicePreview] = useState("");
  const [emailPreview, setEmailPreview] = useState({ subject: "", body: "" });
  const [entryTicketPreview, setEntryTicketPreview] = useState("");

  // ===== Loading/saving flags =====
  const [tplLoading, setTplLoading] = useState(false); // load template lần đầu
  const [previewLoading, setPreviewLoading] = useState(false); // render preview (debounce ở modal)
  const [tplSaving, setTplSaving] = useState(false);

  // ===== Preview queue: last-write-wins =====
  const previewInFlightRef = useRef(false);
  const pendingPreviewRef = useRef(null);


  const sectionTitle = (t) => (
    <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
      {t}
    </div>
  );

  const hint = (t) => (
    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, lineHeight: 1.5 }}>
      {t}
    </div>
  );

  // ===== Build preview data (demo) - All templates =====
  const buildPreviewData = () => ({
    // Site info (common)
    site_name: site.site_name || "Bãi xe Miền Đông",
    site_address: site.site_address || "123 Đường Nguyễn Huệ, Quận 1, TP.HCM",
    site_phone: site.site_phone || "028 3821 9999",
    invoice_note: site.invoice_note || "",

    // Vehicle info (common)
    license_plate: "30A-123.45",
    vehicle_type: "Ô tô",
    entry_time: "27/12/2025 08:10",

    // Invoice specific
    log_type: "Vé gửi xe hoặc Vé tháng",
    exit_time: "27/12/2025 10:20",
    duration: "2 giờ 10 phút",
    amount: "20,000",

    // Email specific
    customer_name: "Nguyễn Văn A",
    area: "A",
    end_date: "01/01/2026",
    days_left: 5,

    // Entry ticket specific
    ticket_id: "VE20251227081001",
    parking_area: "Khu A - Tầng 1",
    parking_slot: "S100",
  });

  // =========================================================
  // 0) Helper: run preview 1 job
  // =========================================================
  const runPreview = async (draft, tab) => {
    if (tab === "invoice") {
      const body = String(draft?.body ?? "");

      const pvInvoiceRes = await renderTemplate("invoice_print", buildPreviewData(), {
        template_subject: null,
        template_body: body,
      });

      const pv = pickRendered(pvInvoiceRes);
      setInvoicePreview(pv.body || "");
      return;
    }

    if (tab === "email") {
      const subject = String(draft?.subject ?? "");
      const body = String(draft?.body ?? "");

      const pvEmailRes = await renderTemplate("monthly_expiry_email", buildPreviewData(), {
        template_subject: subject,
        template_body: body,
      });

      const pv = pickRendered(pvEmailRes);
      setEmailPreview({ subject: pv.subject || "", body: pv.body || "" });
    }

    if (tab === "entry_ticket") {
      const body = String(draft?.body ?? "");

      const pvEntryRes = await renderTemplate("entry_ticket_print", buildPreviewData(), {
        template_subject: null,
        template_body: body,
      });

      const pv = pickRendered(pvEntryRes);
      setEntryTicketPreview(pv.body || "");
    }
  };

  // =========================================================
  // 1) OPEN MODAL: load DB 1 lần + render preview 1 lần
  // =========================================================
  const handleOpenPrintTemplates = async () => {
    setActiveModal("printTemplates");
    setTplLoading(true);

    try {
      // Load templates từ DB (1 lần)
      const [resInvoice, resEmail, resEntry] = await Promise.all([
        getTemplate("invoice_print"),
        getTemplate("monthly_expiry_email"),
        getTemplate("entry_ticket_print"),
      ]);

      const inv = pickTemplate(resInvoice, "invoice_print");
      const em = pickTemplate(resEmail, "monthly_expiry_email");
      const et = pickTemplate(resEntry, "entry_ticket_print");

      setInvoiceTpl(inv);
      setEmailTpl(em);
      setEntryTicketTpl(et);

      // Render preview 1 lần theo template hiện tại
      const [pvInvoiceRes, pvEmailRes, pvEntryRes] = await Promise.all([
        renderTemplate("invoice_print", buildPreviewData(), {
          template_subject: null,
          template_body: inv.body ?? "",
        }),
        renderTemplate("monthly_expiry_email", buildPreviewData(), {
          template_subject: em.subject ?? "",
          template_body: em.body ?? "",
        }),
        renderTemplate("entry_ticket_print", buildPreviewData(), {
          template_subject: null,
          template_body: et.body ?? "",
        }),
      ]);

      const pvInvoice = pickRendered(pvInvoiceRes);
      const pvEmail = pickRendered(pvEmailRes);
      const pvEntry = pickRendered(pvEntryRes);

      setInvoicePreview(pvInvoice.body || "");
      setEmailPreview({ subject: pvEmail.subject || "", body: pvEmail.body || "" });
      setEntryTicketPreview(pvEntry.body || "");
    } catch (e) {
      console.error(e);
      alert("Không tải được templates");
      setActiveModal(null);
    } finally {
      setTplLoading(false);
    }
  };

  // =========================================================
  // 2) REFRESH PREVIEW: last-write-wins (không drop khi in-flight)
  // =========================================================
  const handleRefreshPreview = async (draft, tab) => {
    // luôn giữ job mới nhất
    pendingPreviewRef.current = { draft, tab };

    // nếu đang chạy, job mới sẽ được loop xử lý sau
    if (previewInFlightRef.current) return;

    previewInFlightRef.current = true;
    setPreviewLoading(true);

    try {
      while (pendingPreviewRef.current) {
        const job = pendingPreviewRef.current;
        pendingPreviewRef.current = null;
        await runPreview(job.draft, job.tab);
      }
    } catch (e) {
      console.error(e);
    } finally {
      previewInFlightRef.current = false;
      setPreviewLoading(false);
    }
  };

  // =========================================================
  // 3) SAVE: chỉ lưu DB, không reload DB lại
  // =========================================================
  const handleSaveInvoiceTemplate = async (nextTpl) => {
    const body = String(nextTpl?.body ?? "").trim();
    if (!body) return alert("Mẫu in hóa đơn không được để trống.");

    try {
      setTplSaving(true);

      await updateTemplate("invoice_print", {
        subject: null,
        body,
        description: nextTpl?.description ? String(nextTpl.description) : null,
      });

      setInvoiceTpl((p) => ({ ...p, body }));

      alert("Đã lưu mẫu in hóa đơn.");
      setActiveModal(null);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || "Lưu mẫu in thất bại.");
    } finally {
      setTplSaving(false);
    }
  };

  const handleSaveEmailTemplate = async (nextTpl) => {
    const subject = String(nextTpl?.subject ?? "").trim();
    const body = String(nextTpl?.body ?? "").trim();

    if (!subject) return alert("Subject email không được để trống.");
    if (!body) return alert("Nội dung email không được để trống.");

    try {
      setTplSaving(true);

      await updateTemplate("monthly_expiry_email", {
        subject,
        body,
        description: nextTpl?.description ? String(nextTpl.description) : null,
      });

      setEmailTpl((p) => ({ ...p, subject, body }));

      alert("Đã lưu mẫu email nhắc hết hạn.");
      setActiveModal(null);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || "Lưu mẫu email thất bại.");
    } finally {
      setTplSaving(false);
    }
  };

  const handleSaveEntryTicketTemplate = async (nextTpl) => {
    const body = String(nextTpl?.body ?? "").trim();
    if (!body) return alert("Mẫu in vé vào bãi không được để trống.");

    try {
      setTplSaving(true);

      await updateTemplate("entry_ticket_print", {
        subject: null,
        body,
        description: nextTpl?.description ? String(nextTpl.description) : null,
      });

      setEntryTicketTpl((p) => ({ ...p, body }));

      alert("Đã lưu mẫu in vé vào bãi.");
      setActiveModal(null);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || "Lưu mẫu vé thất bại.");
    } finally {
      setTplSaving(false);
    }
  };

  // =========================================================
  // 4) RESET: reset DB rồi load lại template 1 lần
  // =========================================================
  const handleResetInvoiceTemplate = async () => {
    if (!window.confirm("Reset mẫu in hóa đơn về mặc định?")) return;

    try {
      setTplSaving(true);
      await resetTemplate("invoice_print");

      const resInvoice = await getTemplate("invoice_print");
      const inv = pickTemplate(resInvoice, "invoice_print");
      setInvoiceTpl(inv);

      const pvInvoiceRes = await renderTemplate("invoice_print", buildPreviewData(), {
        template_subject: null,
        template_body: inv.body ?? "",
      });
      const pv = pickRendered(pvInvoiceRes);
      setInvoicePreview(pv.body || "");

      alert("Đã reset mẫu in hóa đơn.");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || "Reset mẫu in thất bại.");
    } finally {
      setTplSaving(false);
    }
  };

  const handleResetEmailTemplate = async () => {
    if (!window.confirm("Reset mẫu email về mặc định?")) return;

    try {
      setTplSaving(true);
      await resetTemplate("monthly_expiry_email");

      const resEmail = await getTemplate("monthly_expiry_email");
      const em = pickTemplate(resEmail, "monthly_expiry_email");
      setEmailTpl(em);

      const pvEmailRes = await renderTemplate("monthly_expiry_email", buildPreviewData(), {
        template_subject: em.subject ?? "",
        template_body: em.body ?? "",
      });
      const pv = pickRendered(pvEmailRes);
      setEmailPreview({ subject: pv.subject || "", body: pv.body || "" });

      alert("Đã reset mẫu email.");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || "Reset mẫu email thất bại.");
    } finally {
      setTplSaving(false);
    }
  };

  const handleResetEntryTicketTemplate = async () => {
    if (!window.confirm("Reset mẫu in vé vào bãi về mặc định?")) return;

    try {
      setTplSaving(true);
      await resetTemplate("entry_ticket_print");

      const resEntry = await getTemplate("entry_ticket_print");
      const et = pickTemplate(resEntry, "entry_ticket_print");
      setEntryTicketTpl(et);

      const pvEntryRes = await renderTemplate("entry_ticket_print", buildPreviewData(), {
        template_subject: null,
        template_body: et.body ?? "",
      });
      const pv = pickRendered(pvEntryRes);
      setEntryTicketPreview(pv.body || "");

      alert("Đã reset mẫu in vé vào bãi.");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || "Reset mẫu vé thất bại.");
    } finally {
      setTplSaving(false);
    }
  };

  // ===== Send email test =====
  const handleSendEmailTest = async (toEmail) => {
    const email = String(toEmail || "").trim();
    if (!email) return alert("Nhập email nhận thử trước đã.");
    if (!isValidEmail(email)) return alert("Email nhận thử không đúng định dạng.");

    try {
      setTplSaving(true);
      await sendTestMonthlyExpiryEmail(email, buildPreviewData());
      alert(`Đã gửi test tới ${email}`);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || "Gửi test thất bại.");
    } finally {
      setTplSaving(false);
    }
  };

  // NOTE: Search box demo
  const onSearch = () => {};

  return (
    <AppLayout title="Cài đặt hệ thống">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Header */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>Cài đặt hệ thống</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                Quản lý cấu hình bãi xe, vé tháng, loại xe và phân quyền nhân viên.
              </div>
            </div>

            <input
              placeholder="Tìm kiếm theo tên cấu hình..."
              style={{ ...commonStyles.input, width: 340, maxWidth: "100%" }}
              onChange={onSearch}
            />
          </div>
        </Card>

        {/* Tiles */}
        <Card>
          {sectionTitle("Thiết lập bãi xe")}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
            <Tile
              icon="🏢"
              title="Thông tin bãi xe"
              desc="Quản lý tên bãi, địa chỉ, SĐT và ghi chú trên hóa đơn."
              onClick={() => setActiveModal("site")}
            />

            <Tile
              icon="📧"
              title="Nhắc hết hạn vé tháng (Email)"
              desc="Cấu hình lịch gửi: chọn mốc ngày, giờ gửi và email test."
              onClick={() => setActiveModal("monthlyEmail")}
            />

            <Tile
              icon="🖨️"
              title="Cài đặt mẫu in & email"
              desc="Quản lý mẫu in hóa đơn và mẫu email gửi khách (nhắc hết hạn vé tháng)."
              onClick={handleOpenPrintTemplates}
              badge={tplLoading ? "Đang tải" : null}
            />

            <Tile
              icon="👥"
              title="Nhân viên & phân quyền"
              desc="Bật/tắt quyền truy cập các trang cho tài khoản nhân viên."
              onClick={() => setActiveModal("rbac")}
            />

            <Tile
              icon="➕"
              title="Thêm bãi đỗ xe"
              desc="Tạo bãi đỗ xe mới với bản đồ chỗ đỗ."
              onClick={() => navigate("/dashboard/settings/parking-area/new")}
            />

            <Tile
              icon="🗺️"
              title="Chỉnh sửa bản đồ bãi"
              desc="Chọn bãi và mở trình chỉnh sửa bản đồ."
              onClick={() => navigate("/dashboard/settings/parking-area")}
            />

            {/* Vehicle type settings removed — using default types: Xe máy / Ô tô / Khác */}
          </div>

          <div style={{ marginTop: 12 }}>
            {hint("Bạn có thể mở từng ô để cấu hình chi tiết. Template đã gắn API. RBAC đã gắn API qua modal.")}
          </div>
        </Card>
      </div>

      {/* ===== Modals ===== */}

      <SiteInfoModal
        open={activeModal === "site"}
        onClose={() => setActiveModal(null)}
        value={site}
        onChange={setSite}
        onSave={(v) => setSite(v)}
      />

      <MonthlyEmailReminderModal
        open={activeModal === "monthlyEmail"}
        onClose={() => setActiveModal(null)}
        value={monthlyEmail}
        onChange={setMonthlyEmail}
        onSendTest={handleSendEmailTest}
        onSave={(v) => {
          setMonthlyEmail(v);
          alert("TODO: save monthly email reminder settings");
          setActiveModal(null);
        }}
      />

      <PrintTemplatesModal
        open={activeModal === "printTemplates"}
        onClose={() => setActiveModal(null)}
        invoiceValue={invoiceTpl}
        emailValue={emailTpl}
        entryTicketValue={entryTicketTpl}
        invoicePreview={invoicePreview}
        emailPreview={emailPreview}
        entryTicketPreview={entryTicketPreview}
        loading={previewLoading}
        saving={tplSaving}
        onSaveInvoice={handleSaveInvoiceTemplate}
        onSaveEmail={handleSaveEmailTemplate}
        onSaveEntryTicket={handleSaveEntryTicketTemplate}
        onResetInvoice={handleResetInvoiceTemplate}
        onResetEmail={handleResetEmailTemplate}
        onResetEntryTicket={handleResetEntryTicketTemplate}
        onRefreshPreview={handleRefreshPreview}
      />

      {/* VehicleTypeModal removed — vehicle types are fixed defaults. */}

      {/* RBAC modal: all-in-one (tự GET/POST/PUT) */}
      <RbacModal open={activeModal === "rbac"} onClose={() => setActiveModal(null)} />
    </AppLayout>
  );
}
