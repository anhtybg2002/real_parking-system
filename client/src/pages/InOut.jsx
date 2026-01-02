// src/pages/InOut.jsx

import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import ParkingAreasOverview from "../components/inout/ParkingAreasOverview";
import AppLayout from "../components/layout/AppLayout";
import Card from "../components/common/Card";
import DataTable from "../components/common/DataTable";
import AlertMessages from "../components/inout/AlertMessages";

import EntryForm from "../components/inout/EntryForm";
import ExitForm from "../components/inout/ExitForm";
import { formatTime } from "../components/common/deps";

// URL backend FastAPI
const BACKEND_URL = "http://localhost:8000";

// URL livestream
const STREAM_URL = `${BACKEND_URL}/streaming/capture_in`;

export default function InOut() {
  const [areas, setAreas] = useState([]);
  const [activeLogs, setActiveLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Entry form
  const [entryPlate, setEntryPlate] = useState("");
  const [entryVehicleType, setEntryVehicleType] = useState("car");
 const [entryAreaId, setEntryAreaId] = useState(null);


  // Exit form
  const [exitPlate, setExitPlate] = useState("");

  // Ảnh + trạng thái quét cho ENTRY / EXIT (tách riêng)
  const [entryCapturedPlateImage, setEntryCapturedPlateImage] = useState(null);
  const [exitCapturedPlateImage, setExitCapturedPlateImage] = useState(null);
  const [entryScanning, setEntryScanning] = useState(false);
  const [exitScanning, setExitScanning] = useState(false);

  const [alert, setAlert] = useState({ type: "", message: "" });

  // ==================== FETCH DATA ====================
  const fetchData = async () => {
    try {
      setLoading(true);
      setAlert((prev) =>
        prev.type === "error" ? prev : { type: "", message: "" }
      );

      const [areasRes, logsRes] = await Promise.all([
        axiosClient.get("/parking/areas"),
        axiosClient.get("/inout/logs/active"),
      ]);

      const areasData = areasRes?.data ?? areasRes ?? [];
      const logsData = logsRes?.data ?? logsRes ?? [];

      setAreas(areasData);
      setActiveLogs(logsData);

      // auto chọn khu đầu tiên nếu chưa chọn
      if (!entryAreaId && areasData.length > 0) {
        setEntryAreaId(areasData[0].id);
      }
    } catch (err) {
      console.error(err);
      setAlert({
        type: "error",
        message: "Không tải được dữ liệu. Kiểm tra server FastAPI.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================== HÀM QUÉT BIỂN SỐ DÙNG CHUNG ====================
  const scanPlate = async (target = "entry") => {
    // target: "entry" hoặc "exit"
    setAlert({ type: "", message: "" });
    if (target === "exit") setExitScanning(true);
    else setEntryScanning(true);

    try {
      const res = await axiosClient.post("/streaming/capture_in_snap");
      const data = res?.data ?? res;

      const plate = (data.plate_number || "").trim();
      const imageBase64 = data.image_base64 || null;

      if (target === "exit") {
        if (plate) setExitPlate(plate);
        setExitCapturedPlateImage(imageBase64);
      } else {
        if (plate) setEntryPlate(plate);
        setEntryCapturedPlateImage(imageBase64);
      }

      setAlert({
        type: "info",
        message: plate
          ? `Đã quét biển số: ${plate}`
          : "Đã chụp hình nhưng không đọc được biển số.",
      });
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        "Không thể quét biển số từ camera. Vui lòng kiểm tra lại.";
      setAlert({ type: "error", message: msg });
    } finally {
      if (target === "exit") setExitScanning(false);
      else setEntryScanning(false);
    }
  };

  const handleScanEntryPlate = () => scanPlate("entry");
  const handleScanExitPlate = () => scanPlate("exit");

  // ==================== ENTRY ====================
  const handleEntry = async () => {
    setAlert({ type: "", message: "" });

    const plate = entryPlate.trim();
    if (!plate) {
      setAlert({ type: "error", message: "Vui lòng nhập biển số xe." });
      return;
    }

    if (!entryAreaId) {
      setAlert({ type: "error", message: "Vui lòng chọn khu vực gửi xe." });
      return;
    }

    try {
      const payload = {
        license_plate_number: plate.toUpperCase(),
        vehicle_type: entryVehicleType || "car",
        parking_area_id: Number(entryAreaId),                 // ✅ ID (int)
        preferred_slot_id: null,                              // ✅ hiện chưa chọn slot từ UI
        entry_plate_image_base64: entryCapturedPlateImage || null, // ✅ đúng tên
      };

      const res = await axiosClient.post("/inout/entry", payload);
      const data = res?.data ?? res;
      const message = data?.message || "Đã ghi nhận xe vào bãi.";

      setEntryPlate("");
      setEntryCapturedPlateImage(null);

      await fetchData();

      setAlert({ type: "entry", message });
    } catch (err) {
      console.error(err);
      console.log("ENTRY ERROR DETAIL:", err?.response?.data); // ✅ xem lỗi validate

      const msg =
        err?.response?.data?.detail ||
        "Không thể ghi nhận xe vào. Vui lòng kiểm tra lại.";

      setAlert({ type: "error", message: msg });
    }
  };


  // ==================== EXIT ====================
  const handleExit = async () => {
    setAlert({ type: "", message: "" });

    const trimmed = exitPlate.trim();
    if (!trimmed) {
      setAlert({
        type: "error",
        message: "Vui lòng nhập biển số xe cần cho ra.",
      });
      return;
    }

    const plate = trimmed.toUpperCase();

    const payload = {
      license_plate_number: plate,
      exit_plate_image_base64: exitCapturedPlateImage || null, // ✅ đúng tên
    };

    try {
      const res = await axiosClient.post("/inout/exit", payload);
      const data = res?.data ?? res;

      // backend mới trả: { ok, message, data: {...} }
      const exitData = data?.data ?? data ?? {};

      const isMonthly = exitData.is_monthly_ticket;
      const hours = exitData.duration_hours ?? exitData.hours ?? null;
      const amount = exitData.amount;

      let message = data?.message || `Xe ${plate} đã rời bãi.`;

      if (isMonthly) {
        message += `\nVé tháng đang còn hiệu lực, lượt này không thu phí.`;
        if (hours != null) {
          message += `\nThời gian gửi khoảng: ${hours} giờ.`;
        }
      } else if (amount == null) {
        if (hours != null) {
          message += `\nThời gian gửi khoảng: ${hours} giờ.`;
        }
        message += `\nChưa cấu hình bảng giá phù hợp, chưa tính được số tiền cần thu.`;
      } else {
        if (hours != null) {
          message += `\nThời gian gửi khoảng: ${hours} giờ.`;
        }
        message += `\nSố tiền cần thu: ${amount.toLocaleString("vi-VN")} đ.`;
      }

      setExitPlate("");
      setExitCapturedPlateImage(null);
      await fetchData();

      setAlert({
        type: "exit",
        message,
      });
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        "Không thể ghi nhận xe ra hoặc tính tiền. Vui lòng kiểm tra lại.";

      setAlert({
        type: "error",
        message: msg,
      });
    }
  };

  // ==================== STATS & TABLE ====================
  const totalCapacity = areas.reduce(
    (sum, a) => sum + (a.capacity || 0),
    0
  );
  const totalCurrent = areas.reduce(
    (sum, a) => sum + (a.current_count || 0),
    0
  );
  const occupancy =
    totalCapacity > 0
      ? Math.round((totalCurrent / totalCapacity) * 100)
      : 0;

  const tableColumns = [
    { key: "index", label: "#" },
    { key: "plate", label: "Biển Số Xe" },
    { key: "type", label: "Loại Xe" },
    { key: "area", label: "Khu Vực Đỗ" },
    { key: "entryTime", label: "Giờ Vào" },
  ];

  const convertVehicleType = (t) => {
    switch (t) {
      case "car":
        return "Ô tô";
      case "motorbike":
        return "Xe máy";
      default:
        return "Khác";
    }
  };

  const tableData = activeLogs.map((log, index) => ({
    index: index + 1,
    plate:
      log.vehicle?.license_plate_number ||
      log.license_plate_number ||
      "-",
    type: convertVehicleType(
      log.vehicle?.vehicle_type || log.vehicle_type || "-"
    ),
    area:
      log.parking_area?.name ||
      log.parking_area_name ||
      log.parking_area_id ||
      "-",
    entryTime: formatTime(log.entry_time),
  }));

  // ==================== RENDER ====================
  return (
    <AppLayout title="Vehicle Entry / Exit">
      <AlertMessages alert={alert} />

      {/* Hàng trên: LIVESTREAM (trái) + Entry/Exit (phải) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1.4fr",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <Card title="Camera - Quét biển số (livestream)">
          <div
            style={{
              width: "100%",
              aspectRatio: "1 / 1",
              borderRadius: 12,
              overflow: "hidden",
              backgroundColor: "#000",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <img
              id="livestream_img"
              // src={STREAM_URL}
              alt="Camera livestream"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>

          <p
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "#6b7280",
            }}
          >
          </p>
        </Card>

        {/* Entry + Exit forms */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <EntryForm
            onSubmit={handleEntry}
            onScanPlate={handleScanEntryPlate}
            scanning={entryScanning}
            entryPlate={entryPlate}
            setEntryPlate={setEntryPlate}
            entryVehicleType={entryVehicleType}
            setEntryVehicleType={setEntryVehicleType}
            entryArea={entryAreaId}
            setEntryArea={setEntryAreaId}

            areas={areas}
            inputStyle={inputStyle}
            primaryBtnStyle={primaryBtnStyle}
            scanBtnStyle={secondaryBtnStyle}
            capturedPlateImage={entryCapturedPlateImage}
          />

          <ExitForm
            onSubmit={handleExit}
            onScanPlate={handleScanExitPlate}
            scanning={exitScanning}
            exitPlate={exitPlate}
            setExitPlate={setExitPlate}
            inputStyle={inputStyle}
            primaryBtnStyle={primaryBtnStyle}
            scanBtnStyle={secondaryBtnStyle}
            capturedPlateImage={exitCapturedPlateImage}
          />
        </div>
      </div>

      {/* Parking overview */}
      <ParkingAreasOverview areas={areas} />

      {/* Active logs table */}
      <Card title="Danh sách xe đang đỗ">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
            fontSize: 12,
            color: "#6b7280",
          }}
        >
          <span>
            {loading
              ? "Đang tải dữ liệu..."
              : `${activeLogs.length} lượt gửi xe đang hoạt động`}
          </span>
          <button
            onClick={fetchData}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Làm mới
          </button>
        </div>

        <DataTable columns={tableColumns} data={tableData} />
      </Card>
    </AppLayout>
  );
}

/* ====== styles nhỏ ====== */

const inputStyle = {
  width: "90%",
  marginTop: 4,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  backgroundColor: "#ffffff",
  color: "#111827",
  fontSize: 13,
  outline: "none",
};

const primaryBtnStyle = {
  marginTop: 4,
  padding: "9px 12px",
  borderRadius: 999,
  border: "none",
  background: "linear-gradient(to right,#4f46e5,#6366f1)",
  color: "#f9fafb",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryBtnStyle = {
  marginTop: 8,
  padding: "9px 12px",
  borderRadius: 999,
  border: "1px solid #3b82f6",
  backgroundColor: "#ffffff",
  color: "#1d4ed8",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};
