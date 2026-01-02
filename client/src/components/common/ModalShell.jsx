import React, { useEffect } from "react";
import commonStyles from "../../styles/commonStyles";

export default function ModalShell({ title, subtitle, onClose, children, footer }) {
  // ESC đóng modal
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onMouseDown={(e) => {
        // click nền để đóng
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 14,
      }}
    >
      <div
        style={{
          width: 760,
          maxWidth: "100%",
          maxHeight: "90vh",
          background: "#fff",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(17,24,39,0.18)",
        }}
      >
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid #eef2f7",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>
              {title}
            </div>
            {subtitle ? (
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                {subtitle}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              ...commonStyles.buttonSmall,
              borderRadius: 10,
              padding: "6px 10px",
            }}
          >
            Đóng
          </button>
        </div>

        <div style={{ padding: 16, overflowY: "auto", maxHeight: "calc(90vh - 120px)" }}>
          {children}
        </div>

        <div
          style={{
            padding: 16,
            borderTop: "1px solid #eef2f7",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            background: "#fff",
          }}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}
