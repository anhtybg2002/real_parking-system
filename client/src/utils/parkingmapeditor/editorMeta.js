
import { STATUS_META,CELL_KIND_META } from "../../components/parkingslot/constants";
export const TOOL = {
  PARKING_CAR: "PARKING_CAR",
  PARKING_BIKE:"PARKING_BIKE",
  ROAD_PATH: "ROAD_PATH",
  BLOCKED: "BLOCKED",
  ENTRANCE: "ENTRANCE",
  EXIT: "EXIT",
  ERASER: "ERASER",
};

export function metaForKind(kind) {
  if (CELL_KIND_META?.[kind]) return CELL_KIND_META[kind];

  if (kind === "PARKING") {
    const m = STATUS_META.RESERVED;
    return { label: "Vùng chỗ đỗ", bg: m.bg, color: m.color, border: "rgba(0,0,0,0.12)", icon: "🅿️" };
  }
  if (kind === "ROAD") {
    const lane = CELL_KIND_META?.LANE;
    return lane
      ? { ...lane, label: lane.label || "Đường đi", border: "#92400e" }
      : { label: "Đường đi", bg: "#FACC15", color: "#713F12", border: "#92400e", icon: "⇢" };
  }

  return { label: "Trống", bg: STATUS_META.EMPTY?.bg || "#F3F4F6", color: STATUS_META.EMPTY?.color || "#374151", border: "#e5e7eb" };
}
