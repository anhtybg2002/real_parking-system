// src/components/layout/SidebarItem.jsx
import React from "react";
import Icon from "../common/Icon";

const SidebarItem = ({ label, icon, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        padding: "10px 14px",
        marginBottom: "6px",
        borderRadius: "10px",
        border: "none",
        outline: "none",
        backgroundColor: active ? "#1d4ed8" : "transparent",
        color: active ? "#ffffff" : "#e5e7eb",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: active ? 600 : 500,
        textAlign: "left",
      }}
    >
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
};

export default SidebarItem;
