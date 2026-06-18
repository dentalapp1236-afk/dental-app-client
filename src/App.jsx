import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";
import ProfileMenu from "./components/ProfileMenu";
import NotificationBell from "./components/NotificationBell";
import Icon from "./components/Icon";
import GlobalLoader from "./components/GlobalLoader";
import FullScreenLoader from "./components/FullScreenLoader";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DentistDashboard from "./pages/DentistDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import Clients from "./pages/Clients";
import ClientLedger from "./pages/ClientLedger";
import Appointments from "./pages/Appointments";
import Treatments from "./pages/Treatments";
import FindDentist from "./pages/FindDentist";
import DentistProfile from "./pages/DentistProfile";
import VendorDashboard from "./pages/VendorDashboard";
import Marketplace from "./pages/Marketplace";
import Finances from "./pages/Finances";
import Maintenance from "./pages/Maintenance";
import Profile from "./pages/Profile";

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  const home =
    user.role === "dentist"
      ? "/dentist"
      : user.role === "vendor"
      ? "/vendor"
      : "/client";
  return <Navigate to={home} replace />;
}

// App chrome: fixed sidebar on desktop; top bar (brand + profile) and a
// bottom tab bar on mobile. Auth pages (no user) render full-screen, no chrome.
function Shell({ children }) {
  const { user } = useAuth();
  if (!user) return children;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <header className="topbar">
          <Link to="/" className="topbar-brand icon">
            <Icon name="dentistry" /> MyDentalBooking
          </Link>
          <div className="row gap">
            <NotificationBell />
            <ProfileMenu />
          </div>
        </header>
        {children}
      </div>
      <MobileNav role={user.role} />
    </div>
  );
}

export default function App() {
  return (
    <>
      <GlobalLoader />
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
          path="/clients/:id"
          element={
            <ProtectedRoute role="dentist">
              <ClientLedger />
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
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
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
        <Route
          path="/expenses"
          element={
            <ProtectedRoute role="dentist">
              <Maintenance />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </>
  );
}
