// frontend/src/components/pages/login/LoginPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../../style/style.css";      // hero + global styles
import "../../../style/navigation.css"; // optional, for nav-related styles
const API_BASE_URL = import.meta.env.VITE_API_URL || "";
export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");

  // Redirect if already logged in (same as login.js)
  useEffect(() => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("user_token");
    if (token) {
      // In React app, send them to appointments flow instead of /appointment.html
      navigate("/appointments/new", { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const { email, password } = form;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Use AuthManager to handle login (same as login.js)
        if (window.authManager) {
          window.authManager.login(data.token, data.user);
        } else {
          // Fallback if authManager is not available
          localStorage.setItem("user_token", data.token);
          localStorage.setItem("token", data.token);
          localStorage.setItem("user_id", data.user.id);
          localStorage.setItem("userName", data.user.fullName);
          localStorage.setItem("user_email", data.user.email);
          localStorage.setItem("user_phone", data.user.phone);
          localStorage.setItem("user_role", data.user.role || "user");
        }

        // Redirect based on role (HTML version used .html files)
        if (data.user.role === "admin") {
          navigate("/admin/adminOptions");
        } else {
          navigate("/appointments/new");
        }
      } else {
        setMessage(data.error || "Error al iniciar sesión");
      }
    } catch (error) {
      console.error("Login error:", error);
      setMessage("Error al iniciar sesión");
    }
  };

  const handleGoogleLogin = () => {
    // Same behavior as login.js
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  return (
    <section className="hero d-flex align-items-center justify-content-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-5 col-md-7">
            <div className="card border-0 shadow-lg">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <h2 className="text-primary mb-2">
                    <i className="fas fa-user-circle me-2" />
                    Iniciar Sesión
                  </h2>
                  <p className="text-muted">
                    Accede a tu cuenta para gestionar tus citas
                  </p>
                </div>

                {/* Login Form */}
                <form id="loginForm" onSubmit={handleSubmit}>
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
                    />
                  </div>

                  <button
                    className="btn btn-primary w-100 mb-3"
                    type="submit"
                  >
                    <i className="fas fa-sign-in-alt me-2" />
                    Iniciar Sesión
                  </button>

                  {message && (
                    <div
                      id="loginMessage"
                      className="text-danger text-center mb-3"
                    >
                      {message}
                    </div>
                  )}
                </form>

                {/* Google Login */}
                <div className="d-grid mb-3">
                  <button
                    id="google-login"
                    className="btn btn-outline-danger"
                    type="button"
                    onClick={handleGoogleLogin}
                  >
                    <img
                      src="https://developers.google.com/identity/images/g-logo.png"
                      style={{ width: 20, marginRight: 8 }}
                      alt="Google logo"
                    />
                    Continuar con Google
                  </button>
                </div>

                {/* Navigation Links */}
                <div className="text-center mt-4">
                  <p className="mb-2">
                    <Link
                      to="/register"
                      className="text-decoration-none"
                    >
                      <i className="fas fa-user-plus me-1" />
                      ¿No tienes cuenta? Regístrate
                    </Link>
                  </p>
                  <p className="mb-0">
                    <Link
                      to="/"
                      className="text-decoration-none"
                    >
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