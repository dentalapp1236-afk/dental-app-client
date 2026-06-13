import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Icon from "./components/Icon";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DentistDashboard from "./pages/DentistDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import Clients from "./pages/Clients";
import Appointments from "./pages/Appointments";
import Treatments from "./pages/Treatments";
import FindDentist from "./pages/FindDentist";
import DentistProfile from "./pages/DentistProfile";
import VendorDashboard from "./pages/VendorDashboard";
import Marketplace from "./pages/Marketplace";
import Finances from "./pages/Finances";

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const home =
    user.role === "dentist"
      ? "/dentist"
      : user.role === "vendor"
      ? "/vendor"
      : "/client";
  return <Navigate to={home} replace />;
}

// App chrome: fixed sidebar on desktop, slide-in drawer + top bar on mobile.
// Auth pages (no user) render full-screen without chrome.
function Shell({ children }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes
  useEffect(() => setOpen(false), [location.pathname]);

  if (!user) return children;

  return (
    <div className="app-shell">
      <Sidebar open={open} onNavigate={() => setOpen(false)} />
      <div
        className={`sidebar-backdrop ${open ? "show" : ""}`}
        onClick={() => setOpen(false)}
      />
      <div className="app-main">
        <header className="topbar">
          <button
            className="nav-toggle"
            aria-label="Toggle menu"
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name="menu" />
          </button>
          <Link to="/" className="topbar-brand icon">
            <Icon name="dentistry" /> MyDentalBooking
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<Home />} />
        <Route
          path="/dentist"
          element={
            <ProtectedRoute role="dentist">
              <DentistDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client"
          element={
            <ProtectedRoute role="client">
              <ClientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute role="dentist">
              <Clients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <ProtectedRoute role="dentist">
              <Appointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/treatments"
          element={
            <ProtectedRoute role="dentist">
              <Treatments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/find-dentist"
          element={
            <ProtectedRoute role="client">
              <FindDentist />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dentists/:id"
          element={
            <ProtectedRoute>
              <DentistProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor"
          element={
            <ProtectedRoute role="vendor">
              <VendorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/supplies"
          element={
            <ProtectedRoute role="dentist">
              <Marketplace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finances"
          element={
            <ProtectedRoute role="dentist">
              <Finances />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
