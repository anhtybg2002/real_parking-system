import React from "react";
import commonStyles from "../../styles/commonStyles";

function fmtTime(dt) {
  try {
    const d = new Date(dt);
    return d.toLocaleString();
  } catch {
    return dt || "—";
  }
}

const VEHICLE_TYPE_LABEL = {
  motorbike: "Xe máy",
  car: "Ô tô",
  bicycle: "Xe đạp",
  truck: "Xe tải",
};

const renderType = (t) => VEHICLE_TYPE_LABEL[(t || "").toLowerCase()] || t || "—";

export default function UnassignedVehiclesPanel({
  items,
  loading,
  pendingAssign,
  onPick,
  onCancel,
  onRefresh,
}) {
  const card = { border: "1px solid #e5e7eb", borderRadius: 16, background: "#fff", padding: 16 };
  const divider = { height: 1, background: "#f3f4f6", margin: "12px 0" };

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>Xe chưa có chỗ</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            Log active nhưng chưa gán vào slot (parking_slot_id = null).
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={commonStyles.buttonSecondary} onClick={onRefresh}>
            Làm mới
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10, ...divider }} />

      {/* HINT: đang chọn 1 xe để gán */}
      {pendingAssign && (
        <div
          style={{
            border: "1px solid #c7d2fe",
            background: "#eef2ff",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 13, color: "#3730a3", fontWeight: 800, lineHeight: 1.4 }}>
            Đang gán xe: {pendingAssign.license_plate_number} • {renderType(pendingAssign.vehicle_type)}.
            <br />
            Hãy click 1 slot Trống (EMPTY) trên bản đồ để gán vào vị trí thực tế.
          </div>

          <button
            type="button"
            style={{
              ...commonStyles.buttonSmall,
              background: "#fff",
              border: "1px solid #c7d2fe",
              color: "#3730a3",
            }}
            onClick={onCancel}
            title="Hủy gán xe"
          >
            Hủy
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: "#6b7280" }}>Đang tải...</div>
      ) : items?.length ? (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
          <table style={commonStyles.table}>
            <thead style={{ background: "#f9fafb" }}>
              <tr>
                <th style={commonStyles.th}>Biển số</th>
                <th style={commonStyles.th}>Loại xe</th>
                <th style={commonStyles.th}>Giờ vào</th>
                <th style={{ ...commonStyles.th, textAlign: "right" }}>Chọn</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => {
                const active = pendingAssign?.log_id === x.log_id;
                return (
                  <tr key={x.log_id} style={active ? { background: "#eef2ff" } : undefined}>
                    <td style={{ ...commonStyles.td, fontWeight: 800 }}>
                      {x.license_plate_number || "—"}
                    </td>
                    <td style={commonStyles.td}>{renderType(x.vehicle_type)}</td>
                    <td style={commonStyles.td}>{fmtTime(x.entry_time)}</td>
                    <td style={{ ...commonStyles.td, textAlign: "right" }}>
                      <button
                        type="button"
                        style={commonStyles.buttonSmall}
                        onClick={() => onPick(x)}
                      >
                        {active ? "Đang chọn" : "Gán vào slot"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{
            fontSize: 13,
            color: "#6b7280",
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 12,
          }}
        >
          Không có xe nào đang “chưa có chỗ”.
        </div>
      )}
    </div>
  );
}
