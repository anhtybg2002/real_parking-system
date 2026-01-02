
// src/api/parking.js
import axiosClient from "./axiosClient";

/**
 * =========================
 * Parking Areas
 * =========================
 */

// Lấy danh sách bãi xe
export const getParkingAreas = ({ includeInactive } = {}) => {
  const params = includeInactive ? {} : { is_active: true };
  return axiosClient.get("/parking/areas", { params });
};

// Tạo bãi xe mới
export const createParkingArea = (payload) =>
  axiosClient.post("/parking/areas", payload);

// Bật / tắt bãi xe
export const toggleParkingArea = (areaId, isActive) =>
  axiosClient.patch(`/parking/areas/${areaId}`, { is_active: isActive });

/**
 * =========================
 * Parking Map
 * =========================
 */

// Lấy bản đồ bãi xe
export const getParkingMap = (areaId) =>
  axiosClient.get(`/parking/areas/${areaId}/map`);

// Cập nhật bản đồ bãi xe
export const updateParkingMap = (areaId, payload) =>
  axiosClient.put(`/parking/areas/${areaId}/map`, payload);

// Kiểm tra có được sửa map không
export const canEditParkingMap = (areaId) =>
  axiosClient.get(`/parking/areas/${areaId}/can-edit-map`);

/**
 * =========================
 * Parking Slots
 * =========================
 */

// Lấy danh sách slot theo bãi
export const getParkingSlots = (areaId, params = {}) =>
  axiosClient.get("/parking/slots", {
    params: { parking_area_id: areaId, ...params },
  });

// Cập nhật trạng thái slot
export const updateParkingSlot = (slotId, payload) =>
  axiosClient.patch(`/parking/slots/${slotId}`, payload);

// Nhả slot
export const releaseParkingSlot = (slotId) =>
  axiosClient.post(`/parking/slots/${slotId}/release`);

// Hoán đổi slot
export const swapParkingSlots = (slotIdA, slotIdB) =>
  axiosClient.post("/parking/slots/swap", {
    slot_id_a: slotIdA,
    slot_id_b: slotIdB,
  });

/**
 * =========================
 * Assign / Unassigned
 * =========================
 */

// Xe chưa gán slot
export const getUnassignedVehicles = (parkingAreaId) =>
  axiosClient.get("/parking/unassigned", {
    params: { parking_area_id: parkingAreaId },
  });

// Gán xe vào slot
export const assignVehicleToSlot = (slotId, logId) =>
  axiosClient.post(`/parking/slots/${slotId}/assign`, {
    log_id: logId,
  });
