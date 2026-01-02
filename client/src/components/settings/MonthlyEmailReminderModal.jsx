import React from "react";
import ModalShell from "../common/ModalShell";
import commonStyles from "../../styles/commonStyles";
import { EMAIL_DAY_PRESETS } from "./constants";
import { isValidEmail } from "./validators";

export default function MonthlyEmailReminderModal({
  open,
  onClose,
  value,
  onChange,
  onSave,
  onSendTest,
}) {
  if (!open) return null;

  const v = value || {
    enabled: true,
    days_before: [5, 10],
    send_time: "08:30",
    test_email: "",
    scope: "all",
    area: "",
  };

  const set = (patch) => onChange?.({ ...v, ...patch });

  return (
    <ModalShell
      title="Nhắc hết hạn vé tháng qua Email"
      subtitle="Cấu hình tự động gửi email cho khách khi vé tháng sắp hết hạn."
      onClose={onClose}
      footer={
        <>
          <button type="button" style={commonStyles.buttonSecondary} onClick={onClose}>
            Hủy
          </button>

          <button
            type="button"
            style={commonStyles.buttonSecondary}
            onClick={() => {
              const email = (v.test_email || "").trim();
              if (!email) return alert("Nhập email nhận thử trước đã.");
              if (!isValidEmail(email)) return alert("Email nhận thử không đúng định dạng.");
              onSendTest?.(email);
            }}
            disabled={!v.enabled}
          >
            Gửi test
          </button>

          <button
            type="button"
            style={commonStyles.buttonPrimary}
            onClick={() => {
              if (v.enabled) {
                if (!v.days_before?.length) {
                  alert("Vui lòng chọn ít nhất 1 mốc ngày (vd: 5 hoặc 10).");
                  return;
                }
                if (!v.send_time) {
                  alert("Vui lòng chọn giờ gửi.");
                  return;
                }
                if (v.test_email && !isValidEmail(v.test_email)) {
                  alert("Email nhận thử không đúng định dạng.");
                  return;
                }
              }
              onSave?.(v);
            }}
          >
            Lưu thay đổi
          </button>
        </>
      }
    >
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 14,
          background: "#fff",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={!!v.enabled}
            onChange={(e) => set({ enabled: e.target.checked })}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>
              Bật nhắc hạn bằng cách gửi email
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Khi bật, hệ thống sẽ tự gửi email theo mốc ngày đã chọn.
            </div>
          </div>
        </label>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <label style={commonStyles.label}>
            Giờ gửi 
            <input
              type="time"
              style={commonStyles.input}
              value={v.send_time}
              onChange={(e) => set({ send_time: e.target.value })}
              disabled={!v.enabled}
            />
          </label>

          <label style={commonStyles.label}>
            Email nhận thử
            <input
              type="email"
              style={{
                ...commonStyles.input,
                border:
                  v.test_email && !isValidEmail(v.test_email)
                    ? "1px solid #ef4444"
                    : commonStyles.input?.border,
              }}
              value={v.test_email}
              onChange={(e) => set({ test_email: e.target.value })}
              placeholder="test@email.com"
              disabled={!v.enabled}
            />
            {v.test_email && !isValidEmail(v.test_email) ? (
              <div style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
                Email không đúng định dạng.
              </div>
            ) : null}
          </label>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>
            Gửi trước khi hết hạn (chọn nhiều mốc)
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            Ví dụ: chọn 5 và 10 nghĩa là hệ thống sẽ gửi 2 lần: trước 10 ngày và trước 5 ngày.
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {EMAIL_DAY_PRESETS.map((d) => {
              const active = (v.days_before || []).includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    if (!v.enabled) return;
                    const curr = v.days_before || [];
                    const next = curr.includes(d)
                      ? curr.filter((x) => x !== d)
                      : [...curr, d].sort((a, b) => a - b);
                    set({ days_before: next });
                  }}
                  style={{
                    ...commonStyles.pill,
                    border: "1px solid #e5e7eb",
                    backgroundColor: active ? "#dcfce7" : "#f3f4f6",
                    color: active ? "#166534" : "#374151",
                    cursor: v.enabled ? "pointer" : "not-allowed",
                  }}
                  disabled={!v.enabled}
                >
                  {d} ngày
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
            Gợi ý: giờ gửi nên đặt 08:00–09:00 để nhân viên/khách dễ xử lý.
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
        Backend gợi ý: lưu config vào bảng settings và chạy cron mỗi ngày, lọc vé còn N ngày thì gửi.
      </div>
    </ModalShell>
  );
}
