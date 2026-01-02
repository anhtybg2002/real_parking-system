// src/api/siteInfo.js
import axiosClient from "./axiosClient";

export function getSiteInfo() {
  return axiosClient.get("/site-info");
}

export function updateSiteInfo(payload) {
  return axiosClient.put("/site-info", payload);
}
