// src/components/dashboard/StatCard.jsx
import React from "react";

const StatCard = ({ label, value, subLabel, bg }) => {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 140,
        padding: "18px 16px",
        borderRadius: "14px",
        background: bg || "#2563eb",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        boxShadow: "0 10px 24px rgba(37,99,235,0.25)",
      }}
    >
      <div style={{ fontSize: "22px", fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: "13px", fontWeight: 500 }}>{label}</div>
      {subLabel && (
        <div style={{ fontSize: "11px", opacity: 0.85 }}>{subLabel}</div>
      )}
    </div>
  );
};

export default StatCard;
