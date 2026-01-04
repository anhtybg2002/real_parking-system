// src/api/vehicleTypes.js
import axiosClient from "./axiosClient";

export function getVehicleTypes() {
  return axiosClient.get("/vehicle-types");
}

export function updateVehicleTypes(payload) {
  // payload: array of { key, label, enabled }
  return axiosClient.put("/vehicle-types", payload);
}

export function createVehicleType(payload) {
  return axiosClient.post("/vehicle-types", payload);
}

export function deleteVehicleType(key) {
  return axiosClient.delete(`/vehicle-types/${encodeURIComponent(key)}`);
}
