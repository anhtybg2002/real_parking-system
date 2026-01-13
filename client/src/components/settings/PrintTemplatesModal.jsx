// src/components/settings/PrintTemplatesModal.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ModalShell from "../common/ModalShell";
import commonStyles from "../../styles/commonStyles";

const TAB = { INVOICE: "invoice", EMAIL: "email", ENTRY_TICKET: "entry_ticket" };

// Tokens backend hỗ trợ
const VARS = [
  { key: "{license_plate}", label: "Biển số" },
  { key: "{vehicle_type}", label: "Loại xe" },
  { key: "{entry_time}", label: "Giờ vào" },
  { key: "{exit_time}", label: "Giờ ra" },
  { key: "{duration}", label: "Thời gian gửi" },
  { key: "{amount}", label: "Tổng tiền" },
  { key: "{customer_name}", label: "Tên khách" },
  { key: "{customer_phone}", label: "SĐT" },
  { key: "{log_type}", label: "Loại hóa đơn" },
  { key: "{ticket_id}", label: "Số hiệu vé" },
  { key: "{parking_area}", label: "Khu vực đỗ xe" },
  { key: "{parking_slot}", label: "Slot đỗ xe" },

  { key: "{site_name}", label: "Tên bãi xe" },
  { key: "{site_phone}", label: "SĐT bãi xe" },
  { key: "{site_address}", label: "Địa chỉ bãi xe" },
  { key: "{invoice_note}", label: "Ghi chú hóa đơn" },

  { key: "{end_date}", label: "Ngày hết hạn" },
  { key: "{days_left}", label: "Số ngày còn lại" },
];

function VarChips({ onInsert }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {VARS.map((v) => (
        <button
          key={v.key}
          type="button"
          onClick={() => onInsert(v.key)}
          style={{
            border: "1px solid #e5e7eb",
            background: "#fff",
            borderRadius: 999,
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
          title="Click để chèn vào vị trí con trỏ"
        >
          {v.label}{" "}
          <span style={{ color: "#6b7280", fontWeight: 800 }}>{v.key}</span>
        </button>
      ))}
    </div>
  );
}

/* =========================
 * Rich editor helpers
 * ========================= */

function restoreSelection(savedRange) {
  if (!savedRange) return;
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(savedRange);
}

function saveSelection() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  return sel.getRangeAt(0).cloneRange();
}

function exec(cmd, value = null) {
  // Chrome/Edge OK
  document.execCommand(cmd, false, value);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// wrap selection bằng span style; nếu không có selection thì set "pending style" bằng cách chèn span rỗng và focus vào
function wrapSelectionWithSpanStyle(styleObj) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  const text = sel.toString();

  const styleStr = Object.entries(styleObj)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");

  if (!text) {
    // Không bôi đen -> chèn span "zero width" để tiếp tục gõ theo style
    exec("insertHTML", `<span style="${styleStr}">\u200B</span>`);
    return;
  }

  exec("insertHTML", `<span style="${styleStr}">${escapeHtml(text)}</span>`);
}

function insertTextAtSelection(text) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  // move caret to end
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

function EditorToolbar({ onCmd, fontSize, setFontSize, onApplyFontSize }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "center",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 8,
        background: "#fff",
      }}
    >
      <button type="button" style={commonStyles.buttonSmall} onClick={() => onCmd("justifyLeft")}>
        Trái
      </button>
      <button type="button" style={commonStyles.buttonSmall} onClick={() => onCmd("justifyCenter")}>
        Giữa
      </button>
      <button type="button" style={commonStyles.buttonSmall} onClick={() => onCmd("justifyRight")}>
        Phải
      </button>
      <button type="button" style={commonStyles.buttonSmall} onClick={() => onCmd("justifyFull")}>
        Đều
      </button>

      <div style={{ width: 10 }} />

      <button type="button" style={commonStyles.buttonSmall} onClick={() => onCmd("bold")}>
        B
      </button>
      <button type="button" style={commonStyles.buttonSmall} onClick={() => onCmd("italic")}>
        I
      </button>
      <button type="button" style={commonStyles.buttonSmall} onClick={() => onCmd("underline")}>
        U
      </button>

      <div style={{ width: 10 }} />

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: "#374151",
          fontWeight: 800,
        }}
      >
        Cỡ chữ
        <select
          value={fontSize}
          onChange={(e) => setFontSize(e.target.value)}
          style={{ ...commonStyles.select, height: 34 }}
        >
          <option value="12px">12</option>
          <option value="13px">13</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="20px">20</option>
        </select>
      </label>

      <button
        type="button"
        style={commonStyles.buttonSmall}
        onClick={onApplyFontSize}
        title="Áp cỡ chữ cho đoạn đang bôi đen"
      >
        Áp dụng
      </button>

      <button type="button" style={commonStyles.buttonSmall} onClick={() => onCmd("br")} title="Xuống dòng">
        BR
      </button>
      <button type="button" style={commonStyles.buttonSmall} onClick={() => onCmd("hr")} title="Kẻ ngang">
        HR
      </button>
      <button type="button" style={commonStyles.buttonSmall} onClick={() => onCmd("clear")} title="Xóa format">
        Clear
      </button>
    </div>
  );
}

export default function PrintTemplatesModal({
  open,
  onClose,

  invoiceValue,
  emailValue,
  entryTicketValue,

  invoicePreview,
  emailPreview,
  entryTicketPreview,

  loading,
  saving,

  onSaveInvoice,
  onSaveEmail,
  onSaveEntryTicket,

  onResetInvoice,
  onResetEmail,
  onResetEntryTicket,

  onRefreshPreview,
}) {
  const [tab, setTab] = useState(TAB.INVOICE);

  // state lưu html
  const [invoice, setInvoice] = useState(invoiceValue);
  const [email, setEmail] = useState(emailValue);
  const [entryTicket, setEntryTicket] = useState(entryTicketValue);

  const [dirty, setDirty] = useState(false);
  const markDirty = useCallback(() => setDirty(true), []);

  // editor refs
  const invoiceEditorRef = useRef(null);
  const emailEditorRef = useRef(null);
  const emailSubjectRef = useRef(null);
  const entryTicketEditorRef = useRef(null);

  // selection memory (để click toolbar vẫn apply đúng vùng bôi đen)
  const selectionRef = useRef(null);

  // font size hiện tại
  const [fontSize, setFontSize] = useState("13px");

  // debounce sync editor -> state (giảm lag + tránh overwrite)
  const syncTimerRef = useRef(null);

  // hydrate control: chỉ đổ innerHTML khi mở modal / data từ backend đổi, không đổ theo mỗi lần state đổi
  const hydratedRef = useRef({ invoice: false, email: false, entry_ticket: false });

  // =========================
  // 1) Sync props -> local khi mở modal / backend load template
  // =========================
  useEffect(() => {
    if (!open) return;

    setInvoice(invoiceValue);
    setEmail(emailValue);
    setEntryTicket(entryTicketValue);
    setDirty(false);

    hydratedRef.current = { invoice: false, email: false, entry_ticket: false };

    // đổ HTML tương ứng tab hiện tại ngay để user thấy
    requestAnimationFrame(() => {
      if (invoiceEditorRef.current) invoiceEditorRef.current.innerHTML = invoiceValue?.body ?? "";
      if (emailEditorRef.current) emailEditorRef.current.innerHTML = emailValue?.body ?? "";
      if (entryTicketEditorRef.current) entryTicketEditorRef.current.innerHTML = entryTicketValue?.body ?? "";
      hydratedRef.current = { invoice: true, email: true, entry_ticket: true };
    });
  }, [open, invoiceValue, emailValue, entryTicketValue]);

  // =========================
  // 2) Hydrate theo tab nếu cần (tránh trắng khi switch tab)
  // =========================
  useEffect(() => {
    if (!open) return;

    requestAnimationFrame(() => {
      if (tab === TAB.INVOICE) {
        if (!hydratedRef.current.invoice && invoiceEditorRef.current) {
          invoiceEditorRef.current.innerHTML = invoice?.body ?? invoiceValue?.body ?? "";
          hydratedRef.current.invoice = true;
        }
      } else if (tab === TAB.EMAIL) {
        if (!hydratedRef.current.email && emailEditorRef.current) {
          emailEditorRef.current.innerHTML = email?.body ?? emailValue?.body ?? "";
          hydratedRef.current.email = true;
        }
      } else if (tab === TAB.ENTRY_TICKET) {
        if (!hydratedRef.current.entry_ticket && entryTicketEditorRef.current) {
          entryTicketEditorRef.current.innerHTML = entryTicket?.body ?? entryTicketValue?.body ?? "";
          hydratedRef.current.entry_ticket = true;
        }
      }
    });
    // chỉ phụ thuộc open/tab
  }, [open, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // =========================
  // 3) Current draft để gọi preview
  // =========================
  const currentDraft = useMemo(() => {
    if (tab === TAB.INVOICE) return { body: invoice?.body ?? "" };
    if (tab === TAB.EMAIL) return { subject: email?.subject ?? "", body: email?.body ?? "" };
    return { body: entryTicket?.body ?? "" };
  }, [tab, invoice?.body, email?.subject, email?.body, entryTicket?.body]);

  // =========================
  // 4) Preview: call immediately on open/tab + debounce 1.2s khi gõ
  // =========================
  const lastSentRef = useRef({ tab: null, payloadStr: "" });
  const debouncePreviewRef = useRef(null);

  const callPreview = useCallback(
    (draft, whichTab) => {
      if (!onRefreshPreview) return;
      onRefreshPreview(draft, whichTab);
    },
    [onRefreshPreview]
  );

  useEffect(() => {
    if (!open) return;
    if (!onRefreshPreview) return;

    const whichTab = tab === TAB.INVOICE ? "invoice" : tab === TAB.EMAIL ? "email" : "entry_ticket";
    callPreview(currentDraft, whichTab);
    lastSentRef.current = { tab: null, payloadStr: "" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  useEffect(() => {
    if (!open) return;
    if (!onRefreshPreview) return;

    if (debouncePreviewRef.current) clearTimeout(debouncePreviewRef.current);

    debouncePreviewRef.current = setTimeout(() => {
      const payloadStr = JSON.stringify(currentDraft);
      if (lastSentRef.current.tab === tab && lastSentRef.current.payloadStr === payloadStr) return;

      const whichTab = tab === TAB.INVOICE ? "invoice" : tab === TAB.EMAIL ? "email" : "entry_ticket";
      callPreview(currentDraft, whichTab);
      lastSentRef.current = { tab, payloadStr };
    }, 1200);

    return () => {
      if (debouncePreviewRef.current) clearTimeout(debouncePreviewRef.current);
    };
  }, [open, tab, currentDraft, onRefreshPreview, callPreview]);

  // =========================
  // 5) Selection capture
  // =========================
  const captureSelection = () => {
    selectionRef.current = saveSelection();
  };

  // =========================
  // 6) Sync editor -> state (debounced)
  // =========================
  const syncEditorToStateDebounced = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    syncTimerRef.current = setTimeout(() => {
      if (tab === TAB.INVOICE) {
        const html = invoiceEditorRef.current?.innerHTML ?? "";
        setInvoice((p) => ({ ...p, body: html }));
      } else if (tab === TAB.EMAIL) {
        const html = emailEditorRef.current?.innerHTML ?? "";
        setEmail((p) => ({ ...p, body: html }));
      } else if (tab === TAB.ENTRY_TICKET) {
        const html = entryTicketEditorRef.current?.innerHTML ?? "";
        setEntryTicket((p) => ({ ...p, body: html }));
      }
    }, 250);
  }, [tab]);

  // force sync ngay (dùng trước khi switch tab / save)
  const syncEditorToStateNow = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    if (tab === TAB.INVOICE) {
      const html = invoiceEditorRef.current?.innerHTML ?? "";
      setInvoice((p) => ({ ...p, body: html }));
      return;
    }
    if (tab === TAB.EMAIL) {
      const html = emailEditorRef.current?.innerHTML ?? "";
      setEmail((p) => ({ ...p, body: html }));
      return;
    }
    if (tab === TAB.ENTRY_TICKET) {
      const html = entryTicketEditorRef.current?.innerHTML ?? "";
      setEntryTicket((p) => ({ ...p, body: html }));
    }
  }, [tab]);

  // =========================
  // 7) Switch tab: sync trước để không bị trắng
  // =========================
  const handleSwitchTab = (nextTab) => {
    // sync editor hiện tại -> state trước
    syncEditorToStateNow();

    // reset selection
    selectionRef.current = null;

    // đổi tab
    setTab(nextTab);

    // đánh dấu tab kia cần hydrate (để chắc chắn)
    if (nextTab === TAB.INVOICE) hydratedRef.current.invoice = false;
    if (nextTab === TAB.EMAIL) hydratedRef.current.email = false;
    if (nextTab === TAB.ENTRY_TICKET) hydratedRef.current.entry_ticket = false;
  };

  // =========================
  // 8) Toolbar commands
  // =========================
  const runCmd = (cmd) => {
    // restore selection trước khi exec (vì click toolbar làm mất selection)
    restoreSelection(selectionRef.current);

    if (cmd === "br") {
      exec("insertHTML", "<br/>");
      markDirty();
      syncEditorToStateDebounced();
      captureSelection();
      return;
    }

    if (cmd === "hr") {
      exec("insertHTML", "<hr/>");
      markDirty();
      syncEditorToStateDebounced();
      captureSelection();
      return;
    }

    if (cmd === "clear") {
      exec("removeFormat");
      markDirty();
      syncEditorToStateDebounced();
      captureSelection();
      return;
    }

    exec(cmd);
    markDirty();
    syncEditorToStateDebounced();
    captureSelection();
  };

  const applyFontSize = () => {
    restoreSelection(selectionRef.current);
    wrapSelectionWithSpanStyle({ "font-size": fontSize || "13px" });
    markDirty();
    syncEditorToStateDebounced();
    captureSelection();
  };

  // =========================
  // 9) Insert var at caret
  // =========================
  const insertVar = (varText) => {
    restoreSelection(selectionRef.current);

    if (tab === TAB.INVOICE) {
      invoiceEditorRef.current?.focus();
      insertTextAtSelection(varText);
      markDirty();
      syncEditorToStateDebounced();
      captureSelection();
      return;
    }

    if (tab === TAB.ENTRY_TICKET) {
      entryTicketEditorRef.current?.focus();
      insertTextAtSelection(varText);
      markDirty();
      syncEditorToStateDebounced();
      captureSelection();
      return;
    }

    // tab email: nếu focus body thì insert body, còn không thì subject
    const active = document.activeElement;
    if (active === emailEditorRef.current) {
      insertTextAtSelection(varText);
      markDirty();
      syncEditorToStateDebounced();
      captureSelection();
      return;
    }

    // subject
    const el = emailSubjectRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const v = el.value ?? "";
    const next = v.slice(0, start) + varText + v.slice(end);
    setEmail((p) => ({ ...p, subject: next }));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + varText.length;
      el.setSelectionRange(pos, pos);
    });
    markDirty();
  };

  // =========================
  // 10) Save handlers (sync NOW trước khi save)
  // =========================
  const handleSaveInvoice = () => {
    // đảm bảo invoice.body là HTML mới nhất
    if (tab === TAB.INVOICE) syncEditorToStateNow();
    // gọi save sau 1 tick để setState kịp
    setTimeout(() => onSaveInvoice?.({ ...invoice, body: invoiceEditorRef.current?.innerHTML ?? invoice?.body ?? "" }), 0);
  };

  const handleSaveEmail = () => {
    if (tab === TAB.EMAIL) syncEditorToStateNow();
    setTimeout(
      () =>
        onSaveEmail?.({
          ...email,
          body: emailEditorRef.current?.innerHTML ?? email?.body ?? "",
        }),
      0
    );
  };

  const handleSaveEntryTicket = () => {
    if (tab === TAB.ENTRY_TICKET) syncEditorToStateNow();
    setTimeout(() => onSaveEntryTicket?.({ ...entryTicket, body: entryTicketEditorRef.current?.innerHTML ?? entryTicket?.body ?? "" }), 0);
  };

  if (!open) return null;

  return (
    <ModalShell
      title="Cài đặt mẫu in & email"
      subtitle="Bên trái là giao diện soạn thảo (WYSIWYG). Bôi đen rồi dùng toolbar căn lề / đậm / nghiêng / gạch chân / cỡ chữ. Preview gọi backend."
      onClose={onClose}
      footer={
        <>
          <button type="button" style={commonStyles.buttonSecondary} onClick={onClose} disabled={saving}>
            Đóng
          </button>

          {tab === TAB.INVOICE ? (
            <>
              <button type="button" style={commonStyles.buttonSecondary} onClick={onResetInvoice} disabled={saving}>
                Reset mẫu hóa đơn
              </button>
              <button
                type="button"
                style={commonStyles.buttonPrimary}
                onClick={handleSaveInvoice}
                disabled={saving}
                title={dirty ? "Có thay đổi chưa lưu" : ""}
              >
                Lưu mẫu hóa đơn
              </button>
            </>
          ) : tab === TAB.EMAIL ? (
            <>
              <button type="button" style={commonStyles.buttonSecondary} onClick={onResetEmail} disabled={saving}>
                Reset mẫu email
              </button>
              <button
                type="button"
                style={commonStyles.buttonPrimary}
                onClick={handleSaveEmail}
                disabled={saving}
                title={dirty ? "Có thay đổi chưa lưu" : ""}
              >
                Lưu mẫu email
              </button>
            </>
          ) : (
            <>
              <button type="button" style={commonStyles.buttonSecondary} onClick={onResetEntryTicket} disabled={saving}>
                Reset mẫu vé vào bãi
              </button>
              <button
                type="button"
                style={commonStyles.buttonPrimary}
                onClick={handleSaveEntryTicket}
                disabled={saving}
                title={dirty ? "Có thay đổi chưa lưu" : ""}
              >
                Lưu mẫu vé vào bãi
              </button>
            </>
          )}
        </>
      }
    >
      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => handleSwitchTab(TAB.INVOICE)}
          style={{
            ...commonStyles.buttonSmall,
            background: tab === TAB.INVOICE ? "#111827" : "#fff",
            color: tab === TAB.INVOICE ? "#fff" : "#111827",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: "8px 12px",
            fontWeight: 800,
          }}
        >
          Mẫu in hóa đơn
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab(TAB.EMAIL)}
          style={{
            ...commonStyles.buttonSmall,
            background: tab === TAB.EMAIL ? "#111827" : "#fff",
            color: tab === TAB.EMAIL ? "#fff" : "#111827",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: "8px 12px",
            fontWeight: 800,
          }}
        >
          Mẫu email gửi khách
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab(TAB.ENTRY_TICKET)}
          style={{
            ...commonStyles.buttonSmall,
            background: tab === TAB.ENTRY_TICKET ? "#111827" : "#fff",
            color: tab === TAB.ENTRY_TICKET ? "#fff" : "#111827",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: "8px 12px",
            fontWeight: 800,
          }}
        >
          Mẫu in vé vào bãi
        </button>

        {loading ? (
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>Đang render preview...</span>
        ) : null}
      </div>

      {/* Var chips */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10, marginBottom: 12, background: "#fff" }}>
        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800, marginBottom: 8 }}>
          Chèn biến nhanh (click để chèn vào vị trí con trỏ):
        </div>
        <VarChips onInsert={insertVar} />
      </div>

      {/* Toolbar */}
      <EditorToolbar
        onCmd={runCmd}
        fontSize={fontSize}
        setFontSize={setFontSize}
        onApplyFontSize={applyFontSize}
      />
      <div style={{ height: 10 }} />

      {/* Content */}
      {tab === TAB.INVOICE ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ ...commonStyles.label, marginBottom: 6 }}>Nội dung mẫu in hóa đơn</div>

            <div
              ref={invoiceEditorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={() => {
                markDirty();
                syncEditorToStateDebounced();
              }}
              onMouseUp={captureSelection}
              onKeyUp={captureSelection}
              onFocus={captureSelection}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
                minHeight: 360,
                background: "#fff",
                outline: "none",
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            />

            <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
              Tip: Bôi đen đoạn cần format rồi bấm toolbar. Cỡ chữ: chọn số rồi bấm <b>Áp dụng</b>. Preview tự cập nhật sau ~1.2s.
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>Xem trước</div>
            <div
              style={{
                marginTop: 8,
                border: "1px dashed #e5e7eb",
                borderRadius: 12,
                padding: 12,
                background: "#fafafa",
                minHeight: 360,
              }}
              dangerouslySetInnerHTML={{ __html: invoicePreview || "—" }}
            />
          </div>
        </div>
      ) : tab === TAB.EMAIL ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={commonStyles.label}>
              Subject
              <input
                ref={emailSubjectRef}
                style={commonStyles.input}
                value={email?.subject ?? ""}
                onChange={(e) => {
                  setEmail((p) => ({ ...p, subject: e.target.value }));
                  markDirty();
                }}
              />
            </label>

            <div style={{ ...commonStyles.label, marginTop: 10, marginBottom: 6 }}>Nội dung email</div>

            <div
              ref={emailEditorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={() => {
                markDirty();
                syncEditorToStateDebounced();
              }}
              onMouseUp={captureSelection}
              onKeyUp={captureSelection}
              onFocus={captureSelection}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
                minHeight: 300,
                background: "#fff",
                outline: "none",
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            />

            <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
              Tip: Toolbar áp dụng cho vùng bạn đang bôi đen trong body. Click chip sẽ chèn vào nơi đang đặt con trỏ (ưu tiên body nếu đang focus).
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>Xem trước</div>
            <div
              style={{
                marginTop: 8,
                border: "1px dashed #e5e7eb",
                borderRadius: 12,
                padding: 12,
                background: "#fafafa",
                minHeight: 360,
              }}
            >
              <div style={{ fontSize: 12, color: "#6b7280" }}>Subject:</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>{emailPreview?.subject || "—"}</div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>Body:</div>
              <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: emailPreview?.body || "—" }} />
            </div>
          </div>
        </div>
      ) : (
        // TAB.ENTRY_TICKET
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ ...commonStyles.label, marginBottom: 6 }}>Nội dung mẫu in vé vào bãi</div>

            <div
              ref={entryTicketEditorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={() => {
                markDirty();
                syncEditorToStateDebounced();
              }}
              onMouseUp={captureSelection}
              onKeyUp={captureSelection}
              onFocus={captureSelection}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
                minHeight: 360,
                background: "#fff",
                outline: "none",
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            />

            <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
              Tip: Bôi đen đoạn cần format rồi bấm toolbar. Cỡ chữ: chọn số rồi bấm <b>Áp dụng</b>. Preview tự cập nhật sau ~1.2s.
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>Xem trước</div>
            <div
              style={{
                marginTop: 8,
                border: "1px dashed #e5e7eb",
                borderRadius: 12,
                padding: 12,
                background: "#fafafa",
                minHeight: 360,
              }}
              dangerouslySetInnerHTML={{ __html: entryTicketPreview || "—" }}
            />
          </div>
        </div>
      )}
    </ModalShell>
  );
}
