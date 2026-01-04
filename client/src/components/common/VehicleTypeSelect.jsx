import React from "react";
import useVehicleTypes from "../../hooks/useVehicleTypes";
import commonStyles from "../../styles/commonStyles";

export default function VehicleTypeSelect({ value, onChange, name = "vehicle_type" }) {
  const vt = useVehicleTypes();

  const handle = (e) => {
    const val = e.target.value;
    // if parent passed an event-like handler
    if (typeof onChange === "function") {
      // emulate original event shape for ReportsPage (they pass handleChange)
      if (onChange.length === 1) {
        onChange({ target: { name, value: val } });
      } else {
        onChange(val);
      }
    }
  };

  return (
    <select name={name} value={value} onChange={handle} style={commonStyles.select}>
      <option value="all">Tất cả</option>
      {vt.list.map((t) => (
        <option key={t.key} value={t.key}>
          {t.label}
        </option>
      ))}
    </select>
  );
}
