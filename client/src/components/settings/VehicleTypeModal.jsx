import React, { useEffect, useMemo, useState } from "react";
import ModalShell from "../common/ModalShell";
import commonStyles from "../../styles/commonStyles";
import { getVehicleTypes, updateVehicleTypes } from "../../api/vehicleTypes";

export default function VehicleTypeModal({ open, onClose, value, onChange, onSave }) {
  const genUid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const initial = useMemo(() => {
    if (!Array.isArray(value)) return [];
    return value.map((it) => ({ ...it, icons: it.icons ?? "", _uid: it.key || genUid() }));
  }, [value]);

  const [list, setList] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setList(initial);
  }, [initial, open]);

  // load from DB when opened (similar behavior to SiteInfoModal)
  useEffect(() => {
    if (!open) return;

    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const res = await getVehicleTypes();
        const data = res?.data || res || [];
        // API returns array of {id,key,label,enabled}
        const vt = Array.isArray(data) ? data : [];
        const mapped = vt.map((x) => ({ key: x.key, label: x.label, enabled: !!x.enabled, icons: x.icons ?? "", _uid: x.key || genUid() }));
        if (mounted) setList(mapped.length ? mapped : initial);
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
  }, [open, initial]);

  const updateItem = (idx, patch) => {
    setList((l) => l.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  };

  const validateAndNormalize = (items) => {
    const seen = new Set();
    const normalized = [];

    for (let i = 0; i < items.length; i++) {
      const raw = items[i] || {};
      const key = String(raw.key || "").trim().toLowerCase();
      const label = String(raw.label || "").trim();
      const enabled = !!raw.enabled;
      const icons = raw.icons ?? null;

      if (!key) {
        return { ok: false, reason: `Dòng ${i + 1}: Mã (key) không được để trống.` };
      }

      if (!/^[a-z0-9_-]+$/.test(key)) {
        return { ok: false, reason: `Dòng ${i + 1}: Mã chỉ cho phép chữ thường, số, '-', '_'` };
      }

      if (seen.has(key)) {
        return { ok: false, reason: `Dòng ${i + 1}: Mã bị trùng (${key}).` };
      }

      seen.add(key);
      normalized.push({ key, label: label || key, enabled, icons });
    }

    return { ok: true, data: normalized };
  };

  const handleSave = async () => {
    const v = validateAndNormalize(list);
    if (!v.ok) return alert(v.reason || "Dữ liệu không hợp lệ.");

    try {
      setSaving(true);
      // send normalized array payload to /vehicle-types
      await updateVehicleTypes(v.data);
      setList(v.data.map((x) => ({ ...x, _uid: x.key || genUid() })));
      onSave?.(v.data);
      onClose?.();
    } catch (e) {
      console.error(e);
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : "Lưu loại phương tiện thất bại.";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <ModalShell
      title="Cài đặt loại xe"
      subtitle="Bật/tắt loại xe và tên hiển thị trên hệ thống."
      onClose={onClose}
      footer={
        <>
          <button type="button" style={commonStyles.buttonSecondary} onClick={onClose} disabled={saving}>
            Hủy
          </button>
          <button
            type="button"
            style={{ ...commonStyles.buttonPrimary, opacity: saving ? 0.8 : 1 }}
            onClick={handleSave}
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </>
      }
    >
      {loading ? (
        <div style={{ fontSize: 13, color: "#6b7280" }}>Đang tải danh sách...</div>
      ) : (
        <>
          <table style={commonStyles.table}>
            <thead>
              <tr>
                <th style={commonStyles.th}>Mã</th>
                <th style={commonStyles.th}>Tên hiển thị</th>
                <th style={commonStyles.th}>Icon</th>
                <th style={commonStyles.th}>Trạng thái</th>
                <th style={commonStyles.th}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {list.map((v, idx) => (
                <tr key={v._uid}>
                  <td style={commonStyles.td}>
                            <input
                      style={{ ...commonStyles.input }}
                      value={v.key}
                      onChange={(e) => updateItem(idx, { key: e.target.value })}
                      placeholder="key (ví dụ: motorbike)"
                    />
                  </td>
                  <td style={commonStyles.td}>
                    <input
                      style={{ ...commonStyles.input, width: "100%" }}
                      value={v.label}
                      onChange={(e) => updateItem(idx, { label: e.target.value })}
                      placeholder="Tên hiển thị"
                    />
                  </td>
                          <td style={commonStyles.td}>
                            <input
                              style={{ ...commonStyles.input, width: "100%" }}
                              value={v.icons ?? ""}
                              onChange={(e) => updateItem(idx, { icons: e.target.value })}
                              placeholder="Icon (unicode / tên / URL)"
                            />
                          </td>
                  <td style={commonStyles.td}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={!!v.enabled}
                        onChange={(e) => updateItem(idx, { enabled: e.target.checked })}
                      />
                      {v.enabled ? "Hoạt động" : "Tắt"}
                    </label>
                  </td>
                  <td style={commonStyles.td}>
                    <button
                      type="button"
                      style={{ ...commonStyles.buttonDanger, padding: "6px 8px" }}
                      onClick={() => {
                        if (!window.confirm(`Xóa loại phương tiện "${v.label || v.key}"?`)) return;
                        setList((l) => l.filter((_, i) => i !== idx));
                      }}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button
              type="button"
              style={commonStyles.buttonSecondary}
              onClick={() => setList((l) => [...l, { key: "", label: "", enabled: true, icons: "", _uid: genUid() }])}
            >
              Thêm loại
            </button>

            <div style={{ marginTop: 2, fontSize: 12, color: "#6b7280" }}>
              Gợi ý: giữ key cố định để mapping dữ liệu backend (motorbike/car/other).
            </div>
          </div>
        </>
      )}
    </ModalShell>
  );
}
