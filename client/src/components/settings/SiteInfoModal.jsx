import React, { useEffect, useMemo, useState } from "react";
import ModalShell from "../common/ModalShell";
import commonStyles from "../../styles/commonStyles";
import { getSiteInfo, updateSiteInfo } from "../../api/siteInfo";

/**
 * Modal này chuẩn hoá key theo DB:
 * - site_name, site_phone, site_address, invoice_note
 *
 * Vẫn tương thích dữ liệu cũ nếu API trả phone/address (fallback).
 */
export default function SiteInfoModal({ open, onClose, value, onChange, onSave }) {
  const fallback = useMemo(
    () => ({
      site_name: "",
      site_phone: "",
      site_address: "",
      invoice_note: "",
    }),
    []
  );

  // normalize input value từ cha (nếu cha vẫn còn phone/address)
  const v = useMemo(() => {
    const raw = value || {};
    return {
      ...fallback,
      ...raw,
      site_phone: raw.site_phone ?? raw.phone ?? "",
      site_address: raw.site_address ?? raw.address ?? "",
    };
  }, [value, fallback]);

  const set = (patch) => onChange?.({ ...v, ...patch });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load DB khi mở modal
  useEffect(() => {
    if (!open) return;

    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const res = await getSiteInfo();

        const data = res?.data || {};

        // ✅ normalize dữ liệu từ API về đúng key site_*
        const nextVal = {
          ...fallback,
          ...data,
          site_phone: data.site_phone ?? data.phone ?? "",
          site_address: data.site_address ?? data.address ?? "",
        };

        if (mounted) onChange?.(nextVal);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [open, onChange, fallback]);

  const handleSave = async () => {
    try {
      setSaving(true);

      // ✅ CHỈ LƯU 1 CHUẨN KEY DUY NHẤT
      const payload = {
        site_name: String(v.site_name || "").trim(),
        site_phone: String(v.site_phone || "").trim(),
        site_address: String(v.site_address || "").trim(),
        invoice_note: String(v.invoice_note || "").trim(),
      };

      await updateSiteInfo(payload);

      onSave?.(payload);
      onClose?.();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || "Lưu thông tin bãi xe thất bại.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <ModalShell
      title="Thông tin bãi xe"
      subtitle="Cấu hình thông tin hiển thị trên hệ thống và hóa đơn."
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            style={commonStyles.buttonSecondary}
            onClick={onClose}
            disabled={saving}
          >
            Hủy
          </button>
          <button
            type="button"
            style={{
              ...commonStyles.buttonPrimary,
              opacity: saving ? 0.8 : 1,
              pointerEvents: saving ? "none" : "auto",
            }}
            onClick={handleSave}
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </>
      }
    >
      {loading ? (
        <div style={{ fontSize: 13, color: "#6b7280" }}>Đang tải thông tin...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={commonStyles.label}>
              Tên bãi xe
              <input
                style={commonStyles.input}
                value={v.site_name || ""}
                onChange={(e) => set({ site_name: e.target.value })}
              />
            </label>

            <label style={commonStyles.label}>
              Số điện thoại liên hệ
              <input
                style={commonStyles.input}
                value={v.site_phone || ""}
                onChange={(e) => set({ site_phone: e.target.value })}
              />
            </label>

            <label style={{ ...commonStyles.label, gridColumn: "1 / -1" }}>
              Địa chỉ
              <input
                style={commonStyles.input}
                value={v.site_address || ""}
                onChange={(e) => set({ site_address: e.target.value })}
              />
            </label>

            <label style={{ ...commonStyles.label, gridColumn: "1 / -1" }}>
              Ghi chú trên hóa đơn
              <textarea
                style={{ ...commonStyles.input, minHeight: 90 }}
                value={v.invoice_note || ""}
                onChange={(e) => set({ invoice_note: e.target.value })}
              />
            </label>
          </div>

          <div style={{ marginTop: 14, borderTop: "1px solid #eef2f7", paddingTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>
              Xem trước (demo)
            </div>
            <div
              style={{
                marginTop: 8,
                border: "1px dashed #e5e7eb",
                borderRadius: 12,
                padding: 12,
                background: "#fafafa",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800 }}>{v.site_name || "—"}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                {v.site_address || "—"}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                {v.site_phone || "—"}
              </div>
              <div style={{ marginTop: 10, fontSize: 12 }}>
                <b>Ghi chú:</b> {v.invoice_note || "—"}
              </div>
            </div>
          </div>
        </>
      )}
    </ModalShell>
  );
}
