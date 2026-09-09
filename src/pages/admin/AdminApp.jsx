import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import FullScreenLoader from "../../components/FullScreenLoader";
import AdminDashboard from "./AdminDashboard";

// Route entry for /admin. Admins sign in through the shared /login page (the
// backend already accepts admins); here we just gate: dashboard for admins,
// the shared login for signed-out visitors, home for any other role.
export default function AdminApp() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return <AdminDashboard />;
}
