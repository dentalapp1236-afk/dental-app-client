import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import FullScreenLoader from "../../components/FullScreenLoader";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";

// Route entry for /admin: sign-in when logged out, the master dashboard when
// logged in as admin, and a bounce home for any other signed-in role.
export default function AdminApp() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <AdminLogin />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return <AdminDashboard />;
}
