// src/pages/PricingConfigPage.jsx
import React, { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import AlertMessages from "../components/inout/AlertMessages";
import axiosClient from "../api/axiosClient";
import PricingList from "../components/pricingconfig/PricingList";
import PricingForm from "../components/pricingconfig/PricingForm";
import styles from "../styles/commonStyles";
import { useRole } from "../services/auth";

export default function PricingConfigPage() {
  const [alert, setAlert] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  // IMPORTANT: luôn là mảng
  const [pricingRules, setPricingRules] = useState([]);
  const [parkingAreas, setParkingAreas] = useState([]);

  // form state
  const [vehicleType, setVehicleType] = useState("car");
  const [parkingAreaId, setParkingAreaId] = useState("");
  const [pricingType, setPricingType] = useState("hourly");

  // block pricing (xe máy)
  const [morningPrice, setMorningPrice] = useState("");
  const [nightPrice, setNightPrice] = useState("");

  // monthly cho cả ô tô & xe máy
  const [monthlyPrice, setMonthlyPrice] = useState("");

  // hourly pricing (ô tô)
  const [hourlyPriceDay, setHourlyPriceDay] = useState("");
  const [hourlyPriceNight, setHourlyPriceNight] = useState("");

  const [editingId, setEditingId] = useState(null);

  const resetForm = () => {
    setVehicleType("car");
    setParkingAreaId("");
    setMorningPrice("");
    setNightPrice("");
    setMonthlyPrice("");
    setHourlyPriceDay("");
    setHourlyPriceNight("");
    setPricingType("hourly");
    setEditingId(null);
  };

  const fetchPricingRules = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/pricing/rules");

      // axios trả về response object -> payload nằm ở res.data
      const data = Array.isArray(res?.data) ? res.data : [];
      setPricingRules(data);
    } catch (err) {
      console.error(err);
      setAlert({
        type: "error",
        message: "Không tải được cấu hình giá. Kiểm tra server FastAPI.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchParkingAreas = async () => {
    try {
      const res = await axiosClient.get("/parking/areas");

      const data = Array.isArray(res?.data) ? res.data : [];
      setParkingAreas(data);

      // set default area nếu chưa chọn
      if (!editingId && data.length > 0 && !parkingAreaId) {
        setParkingAreaId(String(data[0].id));
      }
    } catch (err) {
      console.error(err);
      setAlert((prev) => ({
        ...prev,
        type: prev.type || "error",
        message:
          prev.message || "Không tải được danh sách khu vực. Kiểm tra API /parking/areas.",
      }));
    }
  };

  useEffect(() => {
    fetchPricingRules();
    fetchParkingAreas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nếu thay đổi loại xe ở form (với form mới, khi không đang edit),
  // tự set pricingType theo business rule: car -> hourly, motorbike -> block
  useEffect(() => {
    if (!editingId) {
      if (vehicleType === "car") setPricingType("hourly");
      else if (vehicleType === "motorbike") setPricingType("block");
    }
  }, [vehicleType, editingId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: "", message: "" });

    if (!parkingAreaId) {
      setAlert({
        type: "error",
        message: "Vui lòng chọn khu vực áp dụng.",
      });
      return;
    }

    const isCar = vehicleType === "car";
    const isMotorbike = vehicleType === "motorbike";
    const isHourly = pricingType === "hourly";
    const isBlock = pricingType === "block";

    // Validate theo kiểu tính tiền được chọn
    if (isBlock) {
      if (morningPrice === "" || Number(morningPrice) < 0) {
        setAlert({ type: "error", message: "Vui lòng nhập giá ca sáng hợp lệ." });
        return;
      }

      if (nightPrice === "" || Number(nightPrice) < 0) {
        setAlert({ type: "error", message: "Vui lòng nhập giá ca đêm hợp lệ." });
        return;
      }
    }

    if (isHourly) {
      const hasDay = hourlyPriceDay !== "" && Number(hourlyPriceDay) >= 0;
      const hasNight = hourlyPriceNight !== "" && Number(hourlyPriceNight) >= 0;

      if (!hasDay && !hasNight) {
        setAlert({ type: "error", message: "Phải có ít nhất một giá theo giờ (ban ngày hoặc ban đêm)." });
        return;
      }
    }

    // Validate vé tháng cho CẢ hai loại
    if (monthlyPrice !== "" && Number(monthlyPrice) < 0) {
      setAlert({
        type: "error",
        message: "Giá vé tháng không được âm.",
      });
      return;
    }

    try {
      const payload = {
        vehicle_type: vehicleType,
        parking_area_id: Number(parkingAreaId),
        pricing_type: pricingType,

        // block pricing
        morning_price: isBlock && morningPrice !== "" ? Number(morningPrice) : 0,
        night_price: isBlock && nightPrice !== "" ? Number(nightPrice) : 0,

        // monthly
        monthly_price: monthlyPrice !== "" ? Number(monthlyPrice) : null,

        // hourly pricing
        hourly_price_day: isHourly && hourlyPriceDay !== "" ? Number(hourlyPriceDay) : null,
        hourly_price_night: isHourly && hourlyPriceNight !== "" ? Number(hourlyPriceNight) : null,

        is_active: true,
      };

      if (editingId) {
        await axiosClient.put(`/pricing/rules/${editingId}`, payload);
        setAlert({ type: "entry", message: "Đã cập nhật cấu hình giá." });
      } else {
        await axiosClient.post("/pricing/rules", payload);
        setAlert({ type: "entry", message: "Đã thêm cấu hình giá mới." });
      }

      resetForm();
      fetchPricingRules();
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.detail ||
        "Không thể lưu cấu hình giá. Vui lòng kiểm tra lại.";
      setAlert({ type: "error", message: msg });
    }
  };

  const handleEditClick = (rule) => {
    setEditingId(rule.id);
    setVehicleType(rule.vehicle_type || "car");

    setPricingType(rule.pricing_type || (rule.vehicle_type === "car" ? "hourly" : "block"));

    setParkingAreaId(
      rule.parking_area_id !== null && rule.parking_area_id !== undefined
        ? String(rule.parking_area_id)
        : ""
    );

    // block
    setMorningPrice(
      rule.morning_price !== null && rule.morning_price !== undefined
        ? rule.morning_price.toString()
        : ""
    );
    setNightPrice(
      rule.night_price !== null && rule.night_price !== undefined
        ? rule.night_price.toString()
        : ""
    );

    // monthly cho cả hai
    setMonthlyPrice(
      rule.monthly_price !== null && rule.monthly_price !== undefined
        ? rule.monthly_price.toString()
        : ""
    );

    // hourly
    setHourlyPriceDay(
      rule.hourly_price_day !== null && rule.hourly_price_day !== undefined
        ? rule.hourly_price_day.toString()
        : ""
    );
    setHourlyPriceNight(
      rule.hourly_price_night !== null && rule.hourly_price_night !== undefined
        ? rule.hourly_price_night.toString()
        : ""
    );

    setAlert({ type: "", message: "" });
  };

  const resolveAreaName = (rule) => {
    // FIX: không dùng if (!rule.parking_area_id) vì id=0 sẽ bị sai
    if (rule.parking_area_id === null || rule.parking_area_id === undefined) {
      return "Chưa gắn khu vực";
    }

    const area = parkingAreas.find((a) => a.id === rule.parking_area_id);
    return area ? area.name : `Khu #${rule.parking_area_id}`;
  };

  const handleDeleteClick = async (rule) => {
    const areaName = resolveAreaName(rule);
    const confirmText = `Xóa cấu hình giá cho ${
      rule.vehicle_type === "car"
        ? "Ô tô"
        : rule.vehicle_type === "motorbike"
        ? "Xe máy"
        : "loại khác"
    } tại khu vực "${areaName}"?`;

    if (!window.confirm(confirmText)) return;

    try {
      await axiosClient.delete(`/pricing/rules/${rule.id}`);
      setAlert({ type: "entry", message: "Đã xóa cấu hình giá." });

      if (editingId === rule.id) {
        resetForm();
      }

      fetchPricingRules();
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.detail || "Không thể xóa cấu hình giá. Thử lại sau.";
      setAlert({ type: "error", message: msg });
    }
  };

  const isAdmin = useRole() === 'admin';

  return (
    <>
    {!isAdmin && (
      <div>Not Authorized</div>
    )}
    {isAdmin && (
      <AppLayout title="Cấu hình giá">
      <AlertMessages alert={alert} />

      <div style={styles.pageGrid}>
        <PricingList
          loading={loading}
          pricingRules={pricingRules}
          resolveAreaName={resolveAreaName}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
        />

        <PricingForm
          pricingType={pricingType}
          setPricingType={setPricingType}
          vehicleType={vehicleType}
          setVehicleType={setVehicleType}
          parkingAreaId={parkingAreaId}
          setParkingAreaId={setParkingAreaId}
          parkingAreas={parkingAreas}
          // block
          morningPrice={morningPrice}
          setMorningPrice={setMorningPrice}
          nightPrice={nightPrice}
          setNightPrice={setNightPrice}
          // monthly (car + motorbike)
          monthlyPrice={monthlyPrice}
          setMonthlyPrice={setMonthlyPrice}
          // hourly
          hourlyPriceDay={hourlyPriceDay}
          setHourlyPriceDay={setHourlyPriceDay}
          hourlyPriceNight={hourlyPriceNight}
          setHourlyPriceNight={setHourlyPriceNight}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
      </div>
    </AppLayout>
    )}
    </>
  );
}
