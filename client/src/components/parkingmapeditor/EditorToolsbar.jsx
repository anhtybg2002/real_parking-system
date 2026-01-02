import React from "react";
import commonStyles from "../../styles/commonStyles";
import { TOOL } from "../../utils/parkingmapeditor/editorMeta";

export default function EditorToolbar({
  areas,
  areaId,
  setAreaId,
  tool,
  setTool,
  onSave,
  saving,
  loading,
  buildingPath,

  
  onResetDraft,      // Huỷ thay đổi => draft = origin
  canResetDraft,     // boolean để enable/disable
}) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <select
        value={areaId || ""}
        onChange={(e) => setAreaId(Number(e.target.value))}
        style={{ ...commonStyles.select, borderRadius: 9999 }}
      >
        {areas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>

      <select
        value={tool}
        onChange={(e) => setTool(e.target.value)}
        style={{ ...commonStyles.select, borderRadius: 9999 }}
      >
        <option value={TOOL.PARKING_CAR}>Vùng chỗ đỗ xe Ô TÔ (kéo để vẽ)</option>
        <option value={TOOL.PARKING_BIKE}>Vùng chỗ đỗ XE MÁY (kéo để vẽ)</option>
        <option value={TOOL.ROAD_PATH}>Đường đi (kéo tạo chuỗi liền nhau)</option>
        <option value={TOOL.BLOCKED}>Vật cản (kéo để vẽ)</option>
        <option value={TOOL.ENTRANCE}>Cổng vào (kéo để vẽ)</option>
        <option value={TOOL.EXIT}>Cổng ra (kéo để vẽ)</option>
        <option value={TOOL.ERASER}>Tẩy (kéo để xoá)</option>
      </select>

      <button
        type="button"
        style={{ ...commonStyles.buttonPrimary, opacity: saving ? 0.7 : 1 }}
        onClick={onSave}
        disabled={saving}
      >
        {saving ? "Đang lưu..." : "Lưu bản đồ"}
      </button>

      {/* ✅ NEW: Huỷ thay đổi */}
      <button
        type="button"
        style={{
          ...commonStyles.button,
          borderRadius: 9999,
          opacity: canResetDraft && !saving ? 1 : 0.6,
        }}
        onClick={onResetDraft}
        disabled={!canResetDraft || saving}
        title="Khôi phục bản đồ về trạng thái đang lưu trên DB"
      >
        Huỷ thay đổi
      </button>

      {loading && <div style={{ fontSize: 13, color: "#6b7280" }}>Đang tải...</div>}

      {tool === TOOL.ROAD_PATH && (
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          Chỉ nhận ô kề 4 hướng. {buildingPath ? "Đang vẽ đường..." : ""}
        </div>
      )}
    </div>
  );
}
