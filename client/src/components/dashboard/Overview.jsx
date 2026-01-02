import React from "react";
import StatCard from "../common/StatCard";

export default function Overview({currentOccupied,logsToday,exitToday,revenueToday}){
    return (
        <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: "14px",
                  marginBottom: "18px",
                }}
              >
                <StatCard
                  value={currentOccupied.toLocaleString("en-US")}
                  label="Xe đang đỗ"
                  bg="#2563eb"
                />
                <StatCard
                  value={logsToday.toLocaleString("en-US")}
                  label="Xe vào bãi hôm nay"
                  bg="#16a34a"
                />
                <StatCard
                  value={exitToday.toLocaleString("en-US")}
                  label="Xe ra hôm nay"
                  bg="#38bdf8"
                />
                <StatCard
                  value={revenueToday.toLocaleString("en-US")}
                  label="Doanh thu"
                  bg="#0ea5e9"
                />
              </div>

    );
}