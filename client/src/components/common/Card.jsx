// src/components/common/Card.jsx
import React from "react";

const Card = ({ title, children, style }) => {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "18px 20px",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
        marginBottom: "18px",
        ...style,
      }}
    >
      {title && (
        <h3
          style={{
            fontSize: "16px",
            fontWeight: 600,
            marginBottom: "12px",
            color: "#111827",
          }}
        >
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};

export default Card;
