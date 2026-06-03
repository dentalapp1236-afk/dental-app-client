import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DentistDashboard from "./pages/DentistDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import Clients from "./pages/Clients";
import Appointments from "./pages/Appointments";
import Treatments from "./pages/Treatments";

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "dentist" ? "/dentist" : "/client"} replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
