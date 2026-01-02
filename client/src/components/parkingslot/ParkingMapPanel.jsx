import React from "react";
import commonStyles from "../../styles/commonStyles";
import Legend from "./Legend";
import MapGrid from "./MapGrid";

export default function ParkingMapPanel({
  mapCfg,
  slots,
  selectedId,
  onSelect,
  editMode,
  setEditMode,
  zoom,
  setZoom,
}) {
  const card = {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#fff",
    padding: 16,
  };

  const headerRow = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  };

  const row = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
  const divider = { height: 1, background: "#f3f4f6", margin: "12px 0" };

  const toggleWrap = {
    display: "inline-flex",
    gap: 8,
    alignItems: "center",
    border: "1px solid #e5e7eb",
    borderRadius: 9999,
    padding: "7px 12px",
    background: "#fff",
    fontSize: 13,
    color: "#4b5563",
    fontWeight: 600,
  };

  const safeCfg = {
    map_rows: mapCfg?.map_rows ?? 10,
    map_cols: mapCfg?.map_cols ?? 12,
    cell_size: mapCfg?.cell_size ?? 36,
    cells: mapCfg?.cells ?? {},
  };

  return (
    <div style={card}>
      <div style={{ ...headerRow, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Bản đồ bãi</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
            Grid: {safeCfg.map_rows}×{safeCfg.map_cols} • Cell: {safeCfg.cell_size}px
          </div>
        </div>

        <div style={row}>
          

          <button
            type="button"
            style={commonStyles.buttonSmall}
            onClick={() => setZoom?.((z) => Math.max(0.6, +(z - 0.1).toFixed(1)))}
          >
            Zoom -
          </button>
          <button
            type="button"
            style={commonStyles.buttonSmall}
            onClick={() => setZoom?.((z) => Math.min(1.8, +(z + 0.1).toFixed(1)))}
          >
            Zoom +
          </button>
          <button type="button" style={commonStyles.buttonSmall} onClick={() => setZoom?.(1)}>
            Reset
          </button>
        </div>
      </div>

      <div style={divider} />

      <div style={{ ...row, justifyContent: "space-between" }}>
        <Legend />
        <div style={{ fontSize: 12, color: "#6b7280" }}>Zoom: {Math.round((zoom ?? 1) * 100)}%</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <MapGrid
          rows={safeCfg.map_rows}
          cols={safeCfg.map_cols}
          cellSize={safeCfg.cell_size}
          slots={slots || []}
          cells={safeCfg.cells}
          selectedId={selectedId}
          onSelect={onSelect}
          zoom={zoom ?? 1}
        />
      </div>
    </div>
  );
}
