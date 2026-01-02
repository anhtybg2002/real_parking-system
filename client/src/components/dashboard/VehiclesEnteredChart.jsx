import React, { useEffect, useState } from "react";
import Card from "../common/Card";
import axiosClient from "../../api/axiosClient";

const VehiclesEnteredChart = () => {
  const width = 700;
  const height = 180;

  const paddingLeft = 40;  // chừa chỗ cho trục Y
  const paddingRight = 24;
  const paddingTop = 20;
  const paddingBottom = 24;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axiosClient.get("/dashboard/vehicles-by-hour");
      

      const arr = res.data || res;
      setData(arr);
    } catch (err) {
      console.error(err);
      setError("Không tải được dữ liệu. Kiểm tra server FastAPI.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const max = data.length ? Math.max(...data.map((d) => d.value)) : 0;
  const safeMax = max || 1;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (i) => {
    const denominator = data.length > 1 ? data.length - 1 : 1;
    return paddingLeft + (i / denominator) * chartWidth;
  };

  const getY = (value) => {
    return (
      height -
      paddingBottom -
      (value / safeMax) * chartHeight
    );
  };

  const points = data
    .map((d, i) => `${getX(i)},${getY(d.value)}`)
    .join(" ");

  const areaPath = data.length
    ? `
    M ${paddingLeft},${height - paddingBottom}
    L ${points}
    L ${paddingLeft + chartWidth},${height - paddingBottom}
    Z
  `
    : "";

  // ==== TÍNH CÁC VẠCH TRỤC Y (KHÔNG BỊ TRÙNG SỐ) ====
  let yTicks = [];
  if (safeMax <= 6) {
    // max nhỏ -> hiển thị 0,1,2,...,max
    for (let v = 0; v <= safeMax; v++) {
      yTicks.push({ value: v, y: getY(v) });
    }
  } else {
    // max lớn -> chia 4 mức
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const value = (safeMax / steps) * i;
      yTicks.push({ value: Math.round(value), y: getY(value) });
    }
  }

  if (loading) {
    return <Card title="Vehicles Entered (Last 24 Hours)">Đang tải...</Card>;
  }

  if (error) {
    return (
      <Card title="Vehicles Entered (Last 24 Hours)">
        {error}
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card title="Vehicles Entered (Last 24 Hours)">
        Không có dữ liệu
      </Card>
    );
  }

  return (
    <Card
      title="Biểu đồ lượng xe vào trong ngày"
      style={{ paddingBottom: "16px" }}
    >
      <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
        {/* trục Y */}
        <line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={height - paddingBottom}
          stroke="#e5e7eb"
          strokeWidth="1"
        />

        {/* trục X */}
        <line
          x1={paddingLeft}
          y1={height - paddingBottom}
          x2={paddingLeft + chartWidth}
          y2={height - paddingBottom}
          stroke="#e5e7eb"
          strokeWidth="1"
        />

        {/* vạch + nhãn trục Y */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            {/* grid ngang */}
            <line
              x1={paddingLeft}
              y1={tick.y}
              x2={paddingLeft + chartWidth}
              y2={tick.y}
              stroke="#f3f4f6"
              strokeWidth={0.8}
            />
            {/* nhãn số */}
            <text
              x={paddingLeft - 6}
              y={tick.y + 3}
              textAnchor="end"
              fontSize="10"
              fill="#9ca3af"
            >
              {tick.value}
            </text>
          </g>
        ))}

        {/* area */}
        {areaPath && (
          <path
            d={areaPath}
            fill="#bfdbfe"
            fillOpacity="0.9"
            stroke="none"
          />
        )}

        {/* line */}
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.2"
        />

        {/* circles */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={getX(i)}
            cy={getY(d.value)}
            r={3.2}
            fill="#1d4ed8"
          />
        ))}
      </svg>

      {/* trục thời gian (nhãn X) */}
      <div
        style={{
          position: "relative",
          marginTop: "4px",
          height: 14,
          fontSize: "10px",
          color: "#9ca3af",
        }}
      >
        {data.map((d, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${(getX(i) / width) * 100}%`,
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
            }}
          >
            {d.hour}
          </span>
        ))}
      </div>

    </Card>
  );
};

export default VehiclesEnteredChart;
