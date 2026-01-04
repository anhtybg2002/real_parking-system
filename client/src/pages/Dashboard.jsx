 // src/pages/DashboardPage.jsx
import React, { useEffect, useState } from "react";
import useVehicleTypes from "../hooks/useVehicleTypes";
import AppLayout from "../components/layout/AppLayout";
import VehiclesEnteredChart from "../components/dashboard/VehiclesEnteredChart";
import Overview from "../components/dashboard/Overview";
import Card from "../components/common/Card";
import axiosClient from "../api/axiosClient";
import CurrentlyParkedTable from "../components/dashboard/CurrentlyParkedTable";
import commonStyles from "../styles/commonStyles";

import { formatTime } from "../components/common/deps";




const DashboardPage = () => {
  const [currentOccupied, setCurrentOccupied] = useState(0);
  const [logsToday, setLogsToday] = useState(0);
  const [activeLogs, setActiveLogs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revenueToday, setRevenueToDay] = useState(0);
  const [exitToday, setExitToDay] = useState(0);

const fetchData = async () => {
  try {
    setLoading(true);
    setError("");

    const [statsRes, activeRes, revenueRes, exitRes] = await Promise.all([
      axiosClient.get("/dashboard/stats"),
      axiosClient.get("/inout/logs/active"),
      axiosClient.get("/dashboard/today-revenue"),
      axiosClient.get("/dashboard/exit-today"),
    ]);

    const statsData = statsRes?.data ?? {};
    const activeData = Array.isArray(activeRes?.data) ? activeRes.data : [];
    const revenueData = revenueRes?.data ?? {};
    const exitData = exitRes?.data ?? 0;

    const { current_occupied = 0, logs_today = 0 } = statsData;

    // revenue
    const revenue = Number(revenueData?.total_revenue ?? revenueData ?? 0);

    // exitToday có thể là: number OR {count: n} OR {total_exit: n}...
    const exitCount = Number(
      exitData?.count ??
      exitData?.total_exit ??
      exitData?.exit_today ??
      exitData?.total ??
      exitData ??
      0
    );

    setRevenueToDay(Number.isFinite(revenue) ? revenue : 0);
    setCurrentOccupied(current_occupied);
    setLogsToday(logs_today);
    setActiveLogs(activeData);
    setExitToDay(Number.isFinite(exitCount) ? exitCount : 0);
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

 

  const { map: vtMap } = useVehicleTypes();

  const convertVehicleType = (t) => {
    if (!t) return "—";
    return vtMap[t] || (t === "car" ? "Ô tô" : t === "motorbike" ? "Xe máy" : "Khác");
  };

  const tableColumns = [
    { key: "index", label: "#" },
    { key: "plate", label: "Biển số xe" },
    { key: "type", label: "Loại xe" },
    { key: "area", label: "Khu vực đỗ" },
    { key: "entryTime", label: "Giờ vào" },
  ];

  const tableData = activeLogs.map((log, index) => ({
    index: index + 1,
    plate:
      log.vehicle?.license_plate_number || log.license_plate_number || "-",
    type: convertVehicleType(log.vehicle.vehicle_type),
    area:
      log.parking_area?.name ||
      log.parking_area_name ||
      log.parking_area_id ||
      "-",
    entryTime: formatTime(log.entry_time),
  }));

  return (
    <AppLayout title="Báo cáo ngày">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {error && (
          <Card
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
            }}
          >
            {error}
          </Card>
        )}

       
        <Overview
          currentOccupied={currentOccupied}
          logsToday={logsToday}
          exitToday={exitToday}
          revenueToday={revenueToday}
        />

        {/* Biểu đồ + bảng xe đang đỗ chia 2 cột */}
        <div style={commonStyles.pageGrid}>
          <Card title="Lượt xe vào theo khung giờ">
            <VehiclesEnteredChart />
          </Card>

          <Card title="Xe đang đỗ trong bãi">
            <CurrentlyParkedTable
              loading={loading}
              activeLogs={activeLogs}
              fetchData={fetchData}
              tableColumns={tableColumns}
              tableData={tableData}
            />
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
