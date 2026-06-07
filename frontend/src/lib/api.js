import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API_BASE });

// Admin JWT token, in localStorage for persistence
const TOKEN_KEY = "avw_admin_token";

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setAdminToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export const adminApi = axios.create({ baseURL: API_BASE });
adminApi.interceptors.request.use((config) => {
  const t = getAdminToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
adminApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      setAdminToken(null);
      if (!window.location.pathname.startsWith("/admin/login")) {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(err);
  }
);


