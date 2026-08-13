/**
 * ProtectedRoute.jsx — redirects to /login when there is no authenticated user.
 * Waits for the initial token-validation check (AuthContext `loading`) before deciding.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { isLoggedIn, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
