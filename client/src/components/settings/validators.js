// src/components/settings/validators.js
export const isValidEmail = (email) => {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim());
};

export const ensureNonEmpty = (value) => !!String(value || "").trim();
