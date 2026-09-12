import axios from "axios";
import { loadingStore } from "./loading";

// Production always talks to the deployed Render API — this is the backend the
// app has always used, and the one the Content-Security-Policy allows. We do NOT
// read VITE_API_URL in a production-mode build on purpose, so a stray build-time
// env override can't repoint a live deployment at another host.
//
// Vite's import.meta.env.PROD is true for ANY production-mode build though,
// including the staging deployment — so we also check which git branch is
// being built (VITE_GIT_BRANCH, baked in by vite.config.js from Vercel's
// VERCEL_GIT_COMMIT_REF). ONLY an actual `main`-branch build gets the real
// production URL; every other production-mode build (staging, or any other
// preview) gets the staging backend — never the reverse.
// Local dev still uses VITE_API_URL (or localhost).
const PROD_URL = "https://dentalappserver.onrender.com/api";
const STAGING_URL = "https://dental-app-server.onrender.com/api";

const baseURL = !import.meta.env.PROD
  ? import.meta.env.VITE_API_URL || "http://localhost:5000/api"
  : import.meta.env.VITE_GIT_BRANCH === "main"
  ? PROD_URL
  : STAGING_URL;

const api = axios.create({ baseURL });

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
    // For an assistant working across clinics, tell the server which one is active.
    const clinic = localStorage.getItem("activeClinic");
    if (clinic) config.headers["X-Clinic-Id"] = clinic;
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
