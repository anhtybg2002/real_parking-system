import React from "react";
import Card from "../common/Card";

export default function ParkingAreasOverview({areas}){
    return(
            <Card title="Parking Areas Overview">
            {areas.length === 0  && (
                <div
                style={{
                    fontSize: 13,
                    color: "#9ca3af",
                }}
                >
                Chưa có khu vực bãi xe. Hãy tạo dữ liệu ở backend.
                </div>
            )}

            {areas.map((a) => {
                const used = a.current_count || 0;
                const percent =
                a.slot_count > 0
                    ? Math.round((used / a.slot_count) * 100)
                    : 0;

                return (
                <div
                    key={a.id}
                    style={{ marginBottom: 10 }}
                >
                    <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        marginBottom: 4,
                        color: "#4b5563",
                    }}
                    >
                    <span
                        style={{ fontWeight: 500 }}
                    >
                        {a.name}
                    </span>
                    <span>
                        {used}/{a.slot_count} ({percent}%)
                    </span>
                    </div>
                    <div
                    style={{
                        width: "100%",
                        height: 6,
                        borderRadius: 999,
                        backgroundColor: "#e5e7eb",
                        overflow: "hidden",
                    }}
                    >
                    <div
                        style={{
                        width: `${Math.min(percent, 100)}%`,
                        height: "100%",
                        background:
                            "linear-gradient(to right,#4f46e5,#22c55e)",
                        }}
                    />
                    </div>
                </div>
                );
            })}
            </Card>
    )
}
      