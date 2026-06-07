import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL || "";

const PORTAL_TOKEN_KEY = "portal_token";

export function getPortalToken() {
  return localStorage.getItem(PORTAL_TOKEN_KEY);
}

export function setPortalToken(token) {
  if (token) localStorage.setItem(PORTAL_TOKEN_KEY, token);
  else localStorage.removeItem(PORTAL_TOKEN_KEY);
}

export const portalApi = axios.create({ baseURL: `${API}/api/portal` });

portalApi.interceptors.request.use((cfg) => {
  const t = getPortalToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

