/**
 * AdminRoute.jsx — like ProtectedRoute, but also requires the admin role.
 * Non-admin logged-in users are sent to the booking page instead of the admin panel.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute() {
  const { isLoggedIn, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/appointment" replace />;
  }

  return <Outlet />;
}
