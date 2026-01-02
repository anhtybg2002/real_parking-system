// src/api/axiosClient.js
import axios from "axios";
import { getAuthHeader, logout } from "../services/auth";

const axiosClient = axios.create({
  baseURL: "http://127.0.0.1:8000",
  timeout: 15000,
});

axiosClient.interceptors.request.use((config) => {
  const auth = getAuthHeader();
  if (auth) {
    config.headers = config.headers || {};
    config.headers.Authorization = auth;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (res) => res,
  (err) => {
    // Nếu token hết hạn / sai token => logout để về login
    const status = err?.response?.status;
    if (status === 401) {
      logout();
    }
    return Promise.reject(err);
  }
);

export default axiosClient;
