import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export default function ProtectedRoute({ children, role, loginPath }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (!user) {
    const to = loginPath || "/login";
    return <Navigate to={to} state={{ from: location }} replace />;
  }

  if (role && user.role !== role) return <Navigate to="/" replace />;

  return children;
}
