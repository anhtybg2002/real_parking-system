// src/api/settingsTemplates.js
import axiosClient from "./axiosClient";

const BASE = "/settings/templates";

export function listTemplates() {
  return axiosClient.get(`${BASE}`);
}

export function getTemplate(key) {
  return axiosClient.get(`${BASE}/${key}`);
}

export function updateTemplate(key, payload) {
  // payload: { subject?: string|null, body: string, description?: string|null }
  return axiosClient.put(`${BASE}/${key}`, payload);
}

export function resetTemplate(key) {
  return axiosClient.post(`${BASE}/${key}/reset`);
}

export function renderTemplate(key, data = {}, overrides = {}) {
  return axiosClient.post(`${BASE}/${key}/render`, {
    data,
    ...overrides, // { template_subject, template_body }
  });
}

export function sendTestMonthlyExpiryEmail(to_email, data = {}) {
  return axiosClient.post(`${BASE}/monthly_expiry_email/send-test`, { to_email, data });
}
