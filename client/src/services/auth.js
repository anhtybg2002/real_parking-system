// src/services/authService.js
import axiosClient from "../api/axiosClient";


export async function login(username, password) {
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  try {
    // axios trả về response: { data, status, headers, ... }
    const res = await axiosClient.post("/auth/login", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 10000,
    });

    const token = res.data?.access_token;
    const tokenType = res.data?.token_type || "bearer";
    const userData = res.data?.user || {};

    if (!token) {
      throw new Error("Login failed: no access_token returned");
    }

    localStorage.setItem("TOKEN_KEY", token);
    localStorage.setItem("TOKEN_TYPE_KEY", tokenType);
    localStorage.setItem("USER_DATA", JSON.stringify(userData));

    return true;
  } catch (error) {
    console.error("Login error:", error);
    return false;
  }
}

export function logout() {
  localStorage.removeItem("TOKEN_KEY");
  localStorage.removeItem("TOKEN_TYPE_KEY");
  localStorage.removeItem("USER_DATA");
  
  
}

export function getToken() {
  return localStorage.getItem("TOKEN_KEY") || "";
}

export function getAuthHeader() {
  const token = getToken();
  const tokenType = localStorage.getItem("TOKEN_TYPE_KEY") || "bearer";
  return token ? `${tokenType} ${token}` : "";
}

export function isAuthenticated() {
  return !!getToken();
}

export function useRole() {
  return JSON.parse(localStorage.getItem("USER_DATA")).role;
}
