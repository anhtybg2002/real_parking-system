import React from "react";
import Card from "../common/Card";

export default function AlertMessages({ alert, onPrintTicket, onPrintInvoice }) {
  if (!alert || !alert.message) return null;

  const styles = {
    error: {
      backgroundColor: "#fef2f2",
      border: "1px solid #fecaca",
      color: "#b91c1c",
    },
    entry: {
      backgroundColor: "#ecfdf3",
      border: "1px solid #bbf7d0",
      color: "#166534",
    },
    exit: {
      backgroundColor: "#eff6ff",
      border: "1px solid #bfdbfe",
      color: "#1d4ed8",
    },
  };

  const style = styles[alert.type] || styles.entry;

  return (
    <div style={{ marginBottom: 16 }}>
      <Card style={{ ...style, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: 1, whiteSpace: "pre-line" }}>{alert.message}</div>
          {alert.type === "entry" && onPrintTicket && alert.entryData && (
            <button
              onClick={() => onPrintTicket(alert.entryData)}
              style={{
                marginLeft: 16,
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid #166534",
                backgroundColor: "#ffffff",
                color: "#166534",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              🖨️ In vé vào
            </button>
          )}
          {alert.type === "exit" && onPrintInvoice && alert.exitData && (
            <button
              onClick={() => onPrintInvoice(alert.exitData)}
              style={{
                marginLeft: 16,
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid #1d4ed8",
                backgroundColor: "#ffffff",
                color: "#1d4ed8",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              🖨️ In hóa đơn
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
