import React from "react";

export default function Tile({ title, desc, icon, onClick, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        background: "#fff",
        padding: 16,
        cursor: "pointer",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        boxShadow: "0 10px 25px rgba(17,24,39,0.06)",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(99,102,241,0.10)",
          border: "1px solid rgba(99,102,241,0.20)",
          flex: "0 0 auto",
          fontSize: 18,
        }}
        aria-hidden
      >
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>
            {title}
          </div>

          {badge ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#b91c1c",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                padding: "2px 8px",
                borderRadius: 9999,
              }}
            >
              {badge}
            </span>
          ) : null}
        </div>

        <div
          style={{
            fontSize: 12,
            color: "#6b7280",
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {desc}
        </div>
      </div>

      <div style={{ color: "#9ca3af", fontSize: 18, paddingTop: 2 }} aria-hidden>
        ›
      </div>
    </button>
  );
}
