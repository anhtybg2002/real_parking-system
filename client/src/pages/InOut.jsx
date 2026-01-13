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
import { VEHICLE_TYPES } from "../constants/vehicleTypes";
import { formatTime } from "../components/common/deps";
import { renderTemplate } from "../api/settingsTemplates";

// Helper: Mở cửa sổ in (từ InvoicesPage)
const openPrintWindow = (textOrHtml) => {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) {
    alert("Trình duyệt đang chặn popup. Hãy cho phép pop-up để in.");
    return;
  }

  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(String(textOrHtml || ""));

  const body = looksLikeHtml
    ? String(textOrHtml || "")
    : `<pre style="white-space:pre-wrap;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;font-size:13px;line-height:1.6;margin:0;">${String(
        textOrHtml || "—"
      )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</pre>`;

  w.document.open();
  w.document.write(`
    <html>
      <head>
        <title>In hóa đơn</title>
        <meta charset="utf-8" />
        <style>
          @media print { body { margin: 0; } }
          body { padding: 16px; color: #111827; }
        </style>
      </head>
      <body>
        ${body}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  w.document.close();
};

const formatDuration = (entryIso, exitIso) => {
  if (!entryIso || !exitIso) return "—";
  const a = new Date(entryIso);
  const b = new Date(exitIso);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return "—";
  const ms = Math.max(0, b.getTime() - a.getTime());
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m} phút`;
  return `${h} giờ ${m} phút`;
};

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
        axiosClient.get("/inout/parking-areas"),
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
  }, []);

  // Hàm in vé vào
  const handlePrintEntryTicket = async (entryData) => {
    try {
      const siteInfo = {
        site_name: "Bãi Đỗ Xe ABC",
        site_address: "123 Đường XYZ, Quận 1, TP.HCM",
        site_phone: "0123 456 789"
      };

      const templateData = {
        license_plate: entryData?.license_plate_number || "—",
        vehicle_type: VEHICLE_TYPES[entryData?.vehicle_type]?.label || entryData?.vehicle_type || "—",
        entry_time: entryData?.entry_time ? formatTime(entryData.entry_time) : "—",
        ticket_id: `VE${String(entryData?.log_id || entryData?.id || "").padStart(6, "0")}`,
        parking_area: entryData?.parking_area_name || `Khu ${entryData?.parking_area_id}` || "—",
        parking_slot: entryData?.parking_slot_code || "—",
        ...siteInfo
      };

      const res = await renderTemplate("entry_ticket_print", templateData);
      const r = res?.data ?? res;
      const d = r?.data?.data ?? r?.data ?? r;
      const body = d?.body ?? d?.rendered ?? d ?? "";

      if (!body) {
        alert("Không thể tạo vé in.");
        return;
      }

      openPrintWindow(body);
    } catch (err) {
      console.error("Print error:", err);
      alert(err?.response?.data?.detail || "Lỗi khi in vé.");
    }
  };

  // Hàm in hóa đơn (từ InvoicesPage)
  const handlePrintInvoice = async (exitData) => {
    try {
      const siteInfo = {
        site_name: "Bãi Đỗ Xe ABC",
        site_address: "123 Đường XYZ, Quận 1, TP.HCM",
        site_phone: "0123 456 789",
        invoice_note: "Giữ vé cẩn thận – mất vé phạt theo quy định"
      };

      const templateData = {
        log_type: exitData?.is_monthly_ticket ? "Vé tháng" : "Vé gửi xe",
        license_plate: exitData?.license_plate || "—",
        vehicle_type: VEHICLE_TYPES[exitData?.vehicle_type]?.label || exitData?.vehicle_type || "—",
        entry_time: exitData?.entry_time ? formatTime(exitData.entry_time) : "—",
        exit_time: exitData?.exit_time ? formatTime(exitData.exit_time) : "—",
        amount: exitData?.amount ? exitData.amount.toLocaleString("vi-VN") : "0",
        ...siteInfo
      };

      const res = await renderTemplate("invoice_print", templateData);
      const r = res?.data ?? res;
      const d = r?.data?.data ?? r?.data ?? r;
      const body = d?.body ?? d?.rendered ?? d ?? "";

      if (!body) {
        alert("Không thể tạo hóa đơn in.");
        return;
      }

      openPrintWindow(body);
    } catch (err) {
      console.error("Print invoice error:", err);
      alert(err?.response?.data?.detail || "Lỗi khi in hóa đơn.");
    }
  };

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
        parking_area_id: Number(entryAreaId),                 
        preferred_slot_id: null,                              
        entry_plate_image_base64: entryCapturedPlateImage || null, 
      };

      const res = await axiosClient.post("/inout/entry", payload);
      const data = res?.data ?? res;
      const message = data?.message || "Đã ghi nhận xe vào bãi.";
      
      // Lưu dữ liệu entry để in vé
      const entryData = data?.data || data;

      setEntryPlate("");
      setEntryCapturedPlateImage(null);

      await fetchData();

      setAlert({ type: "entry", message, entryData });
    } catch (err) {
      console.error(err);
      console.log("ENTRY ERROR DETAIL:", err?.response?.data); 

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
      exit_plate_image_base64: exitCapturedPlateImage || null, 
    };

    try {
      const res = await axiosClient.post("/inout/exit", payload);
      const data = res?.data ?? res;

      // backend trả: { ok, message, data: {...} }
      const exitData = data?.data ?? data ?? {};

      const isMonthly = exitData.is_monthly_ticket;
      const hours = exitData.duration_hours ?? null;
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
        exitData: exitData, // Lưu dữ liệu để in hóa đơn
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

 

  const tableColumns = [
    { key: "index", label: "#" },
    { key: "plate", label: "Biển Số Xe" },
    { key: "type", label: "Loại Xe" },
    { key: "area", label: "Khu Vực Đỗ" },
    { key: "entryTime", label: "Giờ Vào" },
  ];

  const convertVehicleType = (t) => {
    if (!t) return "—";
    return (VEHICLE_TYPES[t] && VEHICLE_TYPES[t].label) || (t === "car" ? "Ô tô" : t === "motorbike" ? "Xe máy" : t);
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
    <AppLayout title="Nhập / Xuất xe">
      <AlertMessages alert={alert} onPrintTicket={handlePrintEntryTicket} onPrintInvoice={handlePrintInvoice} />

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
