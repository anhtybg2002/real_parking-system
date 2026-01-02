// src/components/common/Avatar.jsx
import React from "react";

const Avatar = ({ name = "Admin" }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "#e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        color: "#4b5563",
      }}
    >
      {initials}
    </div>
  );
};

export default Avatar;
