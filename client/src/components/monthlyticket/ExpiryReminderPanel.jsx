// src/components/monthlyticket/ExpiryReminderPanel.jsx
import React, { useMemo, useState } from "react";
import Card from "../common/Card";
import styles from "../../styles/commonStyles";

const PRESETS = [3, 5, 7, 10, 15, 30];

export default function ExpiryReminderPanel({
  areas = [],              // optional: danh sách khu vực (nếu bạn muốn chọn theo khu vực)
  config,
  onChange,
  onSave,
  onSendTest,
  saving = false,
}) {
  const [customDay, setCustomDay] = useState("");

  const dayOptions = useMemo(() => {
    const set = new Set([...(config.days_before || []), ...PRESETS]);
    return Array.from(set).sort((a, b) => a - b);
  }, [config.days_before]);

  const toggleDay = (d) => {
    const has = (config.days_before || []).includes(d);
    const next = has
      ? (config.days_before || []).filter((x) => x !== d)
      : [...(config.days_before || []), d].sort((a, b) => a - b);

    onChange({ ...config, days_before: next });
  };

  const addCustomDay = () => {
    const v = Number(customDay);
    if (!v || v <= 0) return;
    if ((config.days_before || []).includes(v)) {
      setCustomDay("");
      return;
    }
    onChange({
      ...config,
      days_before: [...(config.days_before || []), v].sort((a, b) => a - b),
    });
    setCustomDay("");
  };

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Nhắc hạn vé tháng qua Email</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
            Tự động gửi email cho khách khi vé tháng sắp hết hạn theo số ngày bạn cấu hình.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={!!config.enabled}
              onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
            />
            Bật nhắc hạn
          </label>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
        {/* Left: cấu hình chính */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>1) Thời điểm gửi</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={styles.label}>
              <span>Giờ gửi (mỗi ngày)</span>
              <input
                type="time"
                value={config.send_time || "08:30"}
                onChange={(e) => onChange({ ...config, send_time: e.target.value })}
                style={styles.input}
                disabled={!config.enabled}
              />
            </label>

            <label style={styles.label}>
              <span>Múi giờ</span>
              <input
                value={config.timezone || "Asia/Ho_Chi_Minh"}
                readOnly
                style={{ ...styles.input, background: "#f3f4f6", cursor: "not-allowed" }}
              />
            </label>
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
            2) Gửi trước bao nhiêu ngày
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {dayOptions.map((d) => {
              const active = (config.days_before || []).includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  disabled={!config.enabled}
                  style={{
                    ...styles.pill,
                    border: "1px solid #e5e7eb",
                    backgroundColor: active ? "#dcfce7" : "#f3f4f6",
                    color: active ? "#166534" : "#374151",
                    cursor: config.enabled ? "pointer" : "not-allowed",
                  }}
                >
                  {d} ngày
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <input
              placeholder="Thêm số ngày..."
              value={customDay}
              onChange={(e) => setCustomDay(e.target.value)}
              style={{ ...styles.input, width: 160 }}
              disabled={!config.enabled}
            />
            <button
              type="button"
              onClick={addCustomDay}
              style={styles.buttonSecondary}
              disabled={!config.enabled}
            >
              + Thêm
            </button>
          </div>

          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
            3) Phạm vi áp dụng
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={styles.label}>
              <span>Áp dụng</span>
              <select
                value={config.scope || "all"}
                onChange={(e) => onChange({ ...config, scope: e.target.value, area: "" })}
                style={styles.select}
                disabled={!config.enabled}
              >
                <option value="all">Tất cả vé</option>
                <option value="by_area">Theo khu vực</option>
              </select>
            </label>

            <label style={styles.label}>
              <span>Khu vực</span>
              <select
                value={config.area || ""}
                onChange={(e) => onChange({ ...config, area: e.target.value })}
                style={styles.select}
                disabled={!config.enabled || config.scope !== "by_area"}
              >
                <option value="">-- Chọn khu vực --</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Right: test + save */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Kiểm tra & Lưu</div>

          <label style={styles.label}>
            <span>Email nhận thử</span>
            <input
              type="email"
              value={config.test_email || ""}
              onChange={(e) => onChange({ ...config, test_email: e.target.value })}
              placeholder="test@email.com"
              style={styles.input}
              disabled={!config.enabled}
            />
          </label>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
            <button
              type="button"
              style={styles.buttonSecondary}
              onClick={onSendTest}
              disabled={!config.enabled || saving}
              title="Gửi email thử để kiểm tra cấu hình"
            >
              Gửi test
            </button>

            <button
              type="button"
              style={styles.buttonPrimary}
              onClick={onSave}
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu cấu hình"}
            </button>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
            Gợi ý:
            <ul style={{ margin: "6px 0 0 16px" }}>
              <li>Chọn 5 hoặc 10 ngày để nhắc trước.</li>
              <li>Giờ gửi nên đặt buổi sáng (08:00–09:00).</li>
              <li>Email chỉ gửi cho vé có email hợp lệ.</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
