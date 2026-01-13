// src/api/parkingSlotEvents.js
import axiosClient from "./axiosClient";

export function getParkingSlotEvents(params = {}) {
  return axiosClient.get("/parking-slot-events", { params });
}
