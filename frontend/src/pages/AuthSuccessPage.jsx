/**
 * AuthSuccessPage.jsx — React port of authSuccess.html + authSuccess.js.
 * Google OAuth redirects here with ?token=... in the query string; we fetch
 * the profile, store the session via AuthContext, then redirect home.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../api/authService';

export default function AuthSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setError('No se recibió token de Google OAuth');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
      return;
    }

    // Temporarily stash the token so authService.getProfile() (which reads it
    // from localStorage via the shared api client) can use it immediately.
    localStorage.setItem('user_token', token);
    localStorage.setItem('token', token);

    authService
      .getProfile()
      .then((user) => {
        login(token, user);
        navigate('/', { replace: true });
      })
      .catch((err) => {
        setError('Error al obtener información del usuario: ' + err.message);
        setTimeout(() => navigate('/login', { replace: true }), 1500);
      });
  }, [searchParams, login, navigate]);

  return (
    <section className="auth-hero d-flex align-items-center justify-content-center">
      <div className="container text-center">
        {error ? (
          <p className="text-danger" data-testid="text-auth-error">
            {error}
          </p>
        ) : (
          <>
            <div className="spinner-border text-primary mb-3" role="status" />
            <p className="text-muted" data-testid="text-auth-loading">
              Completando inicio de sesión...
            </p>
          </>
        )}
      </div>
    </section>
  );
}
