/**
 * RegisterPage.jsx — React port of register.html + register.js.
 * Keeps the same client-side validation rules as the original (password
 * strength regex, 10-digit phone, basic email shape).
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../api/authService';

const isPasswordStrong = (password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(password);
const isValidPhone = (phone) => /^\d{10}$/.test(phone);
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const initialForm = { full_name: '', phone: '', email: '', password: '', confirm_password: '' };

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isLoggedIn, login } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isLoggedIn) navigate('/appointment', { replace: true });
  }, [isLoggedIn, navigate]);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setSuccess(false);

    const { full_name, phone, email, password, confirm_password } = form;

    if (!full_name || !phone || !email || !password || !confirm_password) {
      setMessage('Faltan campos requeridos');
      return;
    }
    if (password !== confirm_password) {
      setMessage('Las contraseñas no coinciden');
      return;
    }
    if (!isPasswordStrong(password)) {
      setMessage('La contraseña debe tener al menos 6 caracteres, incluyendo 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial');
      return;
    }
    if (!isValidPhone(phone)) {
      setMessage('El teléfono debe tener 10 dígitos');
      return;
    }
    if (!isValidEmail(email)) {
      setMessage('Correo electrónico inválido');
      return;
    }

    setSubmitting(true);
    try {
      const result = await authService.register({ full_name, phone, email, password });
      login(result.token, result.user);
      setSuccess(true);
      setMessage(result.message || 'Registro exitoso');
      setTimeout(() => navigate('/appointment'), 1500);
    } catch (err) {
      setSuccess(false);
      setMessage(err.message || 'No se pudo registrar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleRegister = () => {
    window.location.href = authService.googleLoginUrl();
  };

  return (
    <section className="auth-hero d-flex align-items-center justify-content-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-8">
            <div className="card auth-card border-0">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <h2 className="text-primary mb-2">
                    <i className="fas fa-user-plus me-2" />
                    Crear Cuenta
                  </h2>
                  <p className="text-muted">Únete a nosotros para acceder a nuestros servicios</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="full_name" className="form-label">
                        <i className="fas fa-user me-2" />
                        Nombre Completo
                      </label>
                      <input
                        className="form-control"
                        name="full_name"
                        id="full_name"
                        placeholder="Tu nombre completo"
                        value={form.full_name}
                        onChange={handleChange}
                        required
                        data-testid="input-full-name"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="phone" className="form-label">
                        <i className="fas fa-phone me-2" />
                        Teléfono
                      </label>
                      <input
                        className="form-control"
                        name="phone"
                        id="phone"
                        placeholder="664-123-4567"
                        value={form.phone}
                        onChange={handleChange}
                        required
                        data-testid="input-phone"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                      <i className="fas fa-envelope me-2" />
                      Correo Electrónico
                    </label>
                    <input
                      className="form-control"
                      name="email"
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                      data-testid="input-email"
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="password" className="form-label">
                        <i className="fas fa-lock me-2" />
                        Contraseña
                      </label>
                      <input
                        className="form-control"
                        name="password"
                        id="password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={form.password}
                        onChange={handleChange}
                        required
                        data-testid="input-password"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="confirm_password" className="form-label">
                        <i className="fas fa-lock me-2" />
                        Confirmar Contraseña
                      </label>
                      <input
                        className="form-control"
                        name="confirm_password"
                        id="confirm_password"
                        type="password"
                        placeholder="Repite la contraseña"
                        value={form.confirm_password}
                        onChange={handleChange}
                        required
                        data-testid="input-confirm-password"
                      />
                    </div>
                  </div>

                  <button className="btn btn-success w-100 mb-3" type="submit" disabled={submitting} data-testid="button-submit-register">
                    <i className="fas fa-user-plus me-2" />
                    {submitting ? 'Creando cuenta...' : 'Crear Cuenta'}
                  </button>

                  {message && (
                    <div className={`text-center mb-3 ${success ? 'text-success' : 'text-danger'}`} data-testid="text-register-message">
                      {message}
                    </div>
                  )}
                </form>

                <div className="d-grid mb-3">
                  <button className="btn btn-outline-danger" onClick={handleGoogleRegister} data-testid="button-google-register">
                    <img
                      src="https://developers.google.com/identity/images/g-logo.png"
                      style={{ width: 20, marginRight: 8 }}
                      alt=""
                    />
                    Registrarse con Google
                  </button>
                </div>

                <div className="text-center mt-4">
                  <p className="mb-2">
                    <Link to="/login" className="text-decoration-none">
                      <i className="fas fa-sign-in-alt me-1" />
                      ¿Ya tienes cuenta? Inicia sesión
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
