import React from "react";
import ModalShell from "../common/ModalShell";
import commonStyles from "../../styles/commonStyles";

export default function VehicleTypeModal({ open, onClose, value, onChange, onSave }) {
  if (!open) return null;

  const list = Array.isArray(value) ? value : [];

  return (
    <ModalShell
      title="Cài đặt loại xe"
      subtitle="Bật/tắt loại xe và tên hiển thị trên hệ thống."
      onClose={onClose}
      footer={
        <>
          <button type="button" style={commonStyles.buttonSecondary} onClick={onClose}>
            Hủy
          </button>
          <button type="button" style={commonStyles.buttonPrimary} onClick={() => onSave?.(list)}>
            Lưu thay đổi
          </button>
        </>
      }
    >
      <table style={commonStyles.table}>
        <thead>
          <tr>
            <th style={commonStyles.th}>Mã</th>
            <th style={commonStyles.th}>Tên hiển thị</th>
            <th style={commonStyles.th}>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {list.map((v, idx) => (
            <tr key={v.key || idx}>
              <td style={commonStyles.td}>( {v.key} )</td>
              <td style={commonStyles.td}>
                <input
                  style={{ ...commonStyles.input, width: "100%" }}
                  value={v.label}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange?.(list.map((x, i) => (i === idx ? { ...x, label: val } : x)));
                  }}
                />
              </td>
              <td style={commonStyles.td}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!v.enabled}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      onChange?.(list.map((x, i) => (i === idx ? { ...x, enabled: checked } : x)));
                    }}
                  />
                  {v.enabled ? "Hoạt động" : "Tắt"}
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
        Gợi ý: giữ key cố định để mapping dữ liệu backend (motorbike/car/other).
      </div>
    </ModalShell>
  );
}
