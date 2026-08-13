/**
 * LoginPage.jsx — React port of login.html + login.js.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../api/authService';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isLoggedIn, login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Old login.js redirected already-authenticated users straight to booking.
  useEffect(() => {
    if (isLoggedIn) navigate('/appointment', { replace: true });
  }, [isLoggedIn, navigate]);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await authService.login(form.email, form.password);
      login(data.token, data.user);
      navigate(data.user.role === 'admin' ? '/admin' : '/appointment');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = authService.googleLoginUrl();
  };

  return (
    <section className="auth-hero d-flex align-items-center justify-content-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-5 col-md-7">
            <div className="card auth-card border-0">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <h2 className="text-primary mb-2">
                    <i className="fas fa-user-circle me-2" />
                    Iniciar Sesión
                  </h2>
                  <p className="text-muted">Accede a tu cuenta para gestionar tus citas</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                      <i className="fas fa-envelope me-2" />
                      Correo Electrónico
                    </label>
                    <input
                      name="email"
                      id="email"
                      type="email"
                      className="form-control"
                      placeholder="tu@email.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                      data-testid="input-email"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">
                      <i className="fas fa-lock me-2" />
                      Contraseña
                    </label>
                    <input
                      name="password"
                      id="password"
                      type="password"
                      className="form-control"
                      placeholder="Tu contraseña"
                      value={form.password}
                      onChange={handleChange}
                      required
                      data-testid="input-password"
                    />
                  </div>

                  <button className="btn btn-primary w-100 mb-3" type="submit" disabled={submitting} data-testid="button-submit-login">
                    <i className="fas fa-sign-in-alt me-2" />
                    {submitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </button>

                  {error && (
                    <div className="text-danger text-center mb-3" data-testid="text-login-error">
                      {error}
                    </div>
                  )}
                </form>

                <div className="d-grid mb-3">
                  <button className="btn btn-outline-danger" onClick={handleGoogleLogin} data-testid="button-google-login">
                    <img
                      src="https://developers.google.com/identity/images/g-logo.png"
                      style={{ width: 20, marginRight: 8 }}
                      alt=""
                    />
                    Continuar con Google
                  </button>
                </div>

                <div className="text-center mt-4">
                  <p className="mb-2">
                    <Link to="/register" className="text-decoration-none">
                      <i className="fas fa-user-plus me-1" />
                      ¿No tienes cuenta? Regístrate
                    </Link>
                  </p>
                  <p className="mb-0">
                    <Link to="/" className="text-decoration-none">
                      <i className="fas fa-home me-1" />
                      Volver al inicio
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
