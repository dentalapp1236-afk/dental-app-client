import axios from "axios";
import { loadingStore } from "./loading";

// Local dev defaults to the local server. For production, set VITE_API_URL
// (e.g. https://dentalappserver.onrender.com/api) in the build environment.
const api = axios.create({
  baseURL: "https://dental-app-server-three.vercel.app/api",
});

// True when the app is running as an installed PWA (standalone), not a browser tab.
const isStandalone = () =>
  (typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
      window.matchMedia?.("(display-mode: minimal-ui)")?.matches ||
      window.navigator?.standalone === true)) ||
  false;

api.interceptors.request.use(
  (config) => {
    if (!config.skipLoader) loadingStore.start();
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    // Tell the server how the app is being used (installed PWA vs browser).
    config.headers["X-Display-Mode"] = isStandalone() ? "standalone" : "browser";
    return config;
  },
  (err) => {
    if (!err.config?.skipLoader) loadingStore.done();
    return Promise.reject(err);
  }
);

api.interceptors.response.use(
  (res) => {
    if (!res.config.skipLoader) loadingStore.done();
    return res;
  },
  (err) => {
    if (!err.config?.skipLoader) loadingStore.done();
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    return Promise.reject(err);
  }
);

export default api;
