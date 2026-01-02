
import React from "react";


const iconsMap = {
  dashboard: "📊",
  entry: "🚗",
  pricing: "💲",
  invoices: "📄",
  staff: "👥",
  reports: "📈",
  settings: "⚙️",
  monthly_ticket: "🎫",
};

const Icon = ({ name }) => {
  const symbol = iconsMap[name] || "•";
  return (
    <span
      style={{
        display: "inline-flex",
        width: 20,
        justifyContent: "center",
        marginRight: 10,
      }}
    >
      {symbol}
    </span>
  );
};

export default Icon;
