import { createContext, useContext, useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { identify, resetAnalytics, trackLogIn, trackLogOut, trackSignUp } from "../utils/analytics";
import ConnectionError from "../components/ConnectionError";

// How long the startup session check may take before we stop waiting on it.
const BOOT_TIMEOUT_MS = 12000;

const readSavedUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readSavedUser);
  const [loading, setLoading] = useState(true);
  // Startup check failed for a network reason and there's no saved profile to
  // fall back on — show "can't connect" with Retry instead of a stuck loader.
  const [bootError, setBootError] = useState(false);
  const [bootAttempt, setBootAttempt] = useState(0);
  // Bumped on login/register/logout so a slow startup check can't overwrite a
  // session that changed while it was in flight.
  const authEpoch = useRef(0);

  useEffect(() => {
    // Hand the splash screen over to the app once bootstrap completes
    const done = () => {
      setLoading(false);
      window.finishSplash?.();
    };
    const token = localStorage.getItem("token");
    if (!token) {
      done();
      return;
    }
    // With a saved profile, open the app straight away and refresh the session
    // in the background — a slow or dead network must not hold up the splash.
    const saved = readSavedUser();
    if (saved) done();
    const epoch = authEpoch.current;
    api
      .get("/auth/me", { timeout: BOOT_TIMEOUT_MS, skipLoader: !!saved })
      .then((r) => {
        if (authEpoch.current !== epoch) return;
        setUser(r.data.user);
        localStorage.setItem("user", JSON.stringify(r.data.user));
        identify(r.data.user);
      })
      .catch((err) => {
        if (authEpoch.current !== epoch) return;
        if (err.response?.status === 401) {
          // The server rejected the session — this is the only case that logs out.
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        } else if (!saved) {
          setBootError(true);
        }
        // Otherwise (timeout / offline / server error) keep the saved profile.
      })
      .finally(() => {
        if (!saved) done();
      });
  }, [bootAttempt]);

  const retryBoot = () => {
    setBootError(false);
    setLoading(true);
    setBootAttempt((n) => n + 1);
  };

  const login = async (identifier, password, remember = true) => {
    const { data } = await api.post("/auth/login", { identifier, password, remember });
    authEpoch.current += 1;
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    identify(data.user);
    trackLogIn(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    authEpoch.current += 1;
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    identify(data.user);
    trackSignUp(data.user);
    return data.user;
  };

  const updateUser = (u) => {
    setUser(u);
    localStorage.setItem("user", JSON.stringify(u));
  };

  const logout = () => {
    authEpoch.current += 1;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    trackLogOut();
    resetAnalytics();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {bootError ? <ConnectionError onRetry={retryBoot} /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
