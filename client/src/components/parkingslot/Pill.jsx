import React from "react";
import commonStyles from "../../styles/commonStyles";
import { STATUS_META } from "./constants";

export default function Pill({ status }) {
  const m = STATUS_META[status] || { label: status, bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      style={{
        ...commonStyles.pill,
        background: m.bg,
        color: m.color,
        border: "1px solid #e5e7eb",
      }}
    >
      {m.label}
    </span>
  );
}
