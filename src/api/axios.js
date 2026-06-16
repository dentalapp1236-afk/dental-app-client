import axios from "axios";
import { loadingStore } from "./loading";

// Local dev defaults to the local server. For production, set VITE_API_URL
// (e.g. https://dentalappserver.onrender.com/api) in the build environment.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use(
  (config) => {
    if (!config.skipLoader) loadingStore.start();
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
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
