import axios from "axios";

// API base: use REACT_APP_API_URL if set; otherwise use current page origin + /api
// so it works through Cloudflare Tunnel (and any host) without each client calling localhost:5000.
function getApiBase() {
  const envBase = (process.env.REACT_APP_API_URL || "").trim();
  if (envBase.startsWith("http://") || envBase.startsWith("https://")) return envBase;
  if (typeof window !== "undefined") {
    // If it's a relative path, append to window.location.origin
    if (envBase) return `${window.location.origin}${envBase.startsWith("/") ? "" : "/"}${envBase}`;
    return window.location.origin + "/api";
  }
  return envBase ? `http://localhost:5000${envBase.startsWith("/") ? "" : "/"}${envBase}` : "/api";
}

const api = axios.create({
  baseURL: getApiBase(),
});

// Automatically attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers["x-auth-token"] = token;
  }
  return config;
});

// Handle authentication errors and network errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network error - backend not reachable
    if (!error.response) {
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        error.networkError = true;
        error.message = 'Cannot connect to server. Check your connection and that the app is reachable.';
      }
    }
    
    // Authentication error
    if (error.response?.status === 401) {
      const path = window.location.pathname || "";
      const isAuthPage = path.includes("/login") || path.includes("/register") || path.includes("/admin/login");
      if (!isAuthPage) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
