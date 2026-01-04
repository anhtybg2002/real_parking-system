import React, { useMemo } from "react";
import { STATUS_META, CELL_KIND_META, renderVehicleIcon, renderVehicleType } from "./constants";
import useVehicleTypes from "../../hooks/useVehicleTypes";

export default function MapGrid({
  rows,
  cols,
  cellSize,
  slots,
  cells, // { "r-c": { kind: "ENTRANCE"|"LANE"|"EXIT"|"BLOCKED"|..., name? } }
  selectedId,
  onSelect,
  zoom,
  onCellPointerDown, // (key, event) => void  (Editor dùng)
  onCellPointerEnter, // (key, event) => void (Editor dùng)
}) {
  const cell = Math.round(cellSize * zoom);

  const slotMap = useMemo(() => {
    const m = new Map();
    (slots || []).forEach((s) => m.set(`${s.row}-${s.col}`, s));
    return m;
  }, [slots]);

  const vehicleTypes = useVehicleTypes();

  const baseCell = {
    width: cell,
    height: cell,
    borderRadius: 10,
    border: "1px dashed #e5e7eb",
    background: "#f8fafc",
    boxSizing: "border-box",
  };

  const slotStyle = (status, selected) => {
    const meta = STATUS_META[status] || { bg: "#f3f4f6", color: "#111827" };
    return {
      width: cell,
      height: cell,
      borderRadius: 10,
      border: "1px solid #e5e7eb",
      background: meta.bg,
      color: meta.color,
      cursor: "pointer",
      padding: 6,
      boxSizing: "border-box",
      textAlign: "left",
      outline: selected ? "2px solid #4f46e5" : "none",
      boxShadow: selected ? "0 0 0 4px rgba(79,70,229,0.12)" : "none",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    };
  };

  const kindStyle = (kind) => {
    const meta = CELL_KIND_META[kind] || { bg: "#e5e7eb", color: "#111827", label: kind, icon: "■" };
    const isLane = kind === "LANE";
    return {
      width: cell,
      height: cell,
      borderRadius: isLane ? 8 : 10,
      border: isLane ? "2px dashed rgba(146,64,14,0.9)" : "1px solid rgba(0,0,0,0.15)",
      background: meta.bg,
      color: meta.color,
      padding: 6,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      userSelect: "none",
    };
  };

  const kindShort = (kind) => {
    if (kind === "ENTRANCE") return "IN";
    if (kind === "EXIT") return "OUT";
    if (kind === "LANE") return "WAY";
    if (kind === "BLOCKED") return "X";
    if (kind === "PARKING") return "P";
    if (kind === "PARKING_CAR") return "CAR";
    if (kind === "PARKING_BIKE") return "BIKE";
    return kind;
  };

  const gridWrap = {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#fff",
    padding: 12,
    overflow: "auto",
  };

  const grid = {
    display: "grid",
    gap: 8,
    gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
    padding: 8,
    width: cols * (cell + 8) + 16,
    height: rows * (cell + 8) + 16,
  };

  return (
    <div style={gridWrap}>
      <div style={grid}>
        {Array.from({ length: rows * cols }).map((_, idx) => {
          const r = Math.floor(idx / cols);
          const c = idx % cols;
          const key = `${r}-${c}`;

          const handleDown = (e) => onCellPointerDown?.(key, e);
          const handleEnter = (e) => onCellPointerEnter?.(key, e);

          const cellInfo = cells?.[key];

          // 1) Infra cell (kind)
          if (cellInfo?.kind) {
            const kind = cellInfo.kind;
            const meta = CELL_KIND_META[kind] || { label: kind, icon: "■" };

            const tip = [
              `${meta.label || kind}`,
              cellInfo?.name ? `Tên: ${cellInfo.name}` : null,
              `Pos: ${key}`,
            ]
              .filter(Boolean)
              .join("\n");

            return (
              <div
                key={key}
                title={tip}
                style={kindStyle(kind)}
                onMouseDown={handleDown}
                onMouseEnter={handleEnter}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                  <div style={{ fontSize: Math.max(13, Math.round(cell * 0.26)), lineHeight: 1 }}>
                    {meta.icon || "■"}
                  </div>
                  <div style={{ fontSize: Math.max(9, Math.round(cell * 0.18)), fontWeight: 900, opacity: 0.95 }}>
                    {kindShort(kind)}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: Math.max(10, Math.round(cell * 0.2)),
                    fontWeight: 800,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cellInfo?.name || meta.label || kind}
                </div>
              </div>
            );
          }

          // 2) Slot cell
          const slot = slotMap.get(key);

          // 2.1 Empty cell
          if (!slot) {
            return (
              <div
                key={key}
                style={baseCell}
                onMouseDown={handleDown}
                onMouseEnter={handleEnter}
              />
            );
          }

          // 2.2 Slot exists
          const selected = slot.id === selectedId;
          const icon = vehicleTypes.icons?.[slot.vehicle_type_allowed] ?? renderVehicleIcon(slot.vehicle_type_allowed);

          const tip = [
            `${slot.code} • ${STATUS_META[slot.status]?.label || slot.status}`,
            `Loại: ${vehicleTypes.map[slot.vehicle_type_allowed] ?? renderVehicleType(slot.vehicle_type_allowed)}`,
            slot.current_plate ? `Biển số: ${slot.current_plate}` : null,
          ]
            .filter(Boolean)
            .join("\n");

          return (
            <button
              key={key}
              type="button"
              title={tip}
              style={slotStyle(slot.status, selected)}
              onMouseDown={handleDown}
              onMouseEnter={handleEnter}
              onClick={() => onSelect?.(slot)}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <div style={{ fontSize: Math.max(14, Math.round(cell * 0.28)), lineHeight: 1 }}>{icon}</div>
              </div>

              <div style={{ fontSize: Math.max(10, Math.round(cell * 0.22)), fontWeight: 800, color: "#111827" }}>
                {slot.code}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
