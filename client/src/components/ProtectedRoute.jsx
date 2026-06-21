import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { token, user, logout } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !user.isAdmin) {
    logout();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
