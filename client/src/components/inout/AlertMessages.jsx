import React from "react";
import Card from "../common/Card";

export default function AlertMessages({ alert }) {
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
        {alert.message}
      </Card>
    </div>
  );
}
