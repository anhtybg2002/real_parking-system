// src/api/monthlyTickets.js
import axiosClient from "./axiosClient";

export function getEmailReminderSettings() {
  return axiosClient.get("/monthly-tickets/settings/email-reminder");
}

export function updateEmailReminderSettings(payload) {
  return axiosClient.put("/monthly-tickets/settings/email-reminder", payload);
}
