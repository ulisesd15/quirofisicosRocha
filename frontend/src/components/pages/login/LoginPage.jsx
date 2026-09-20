import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../../style/style.css";      
import "../../../style/navigation.css"; 

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("userToken");
    if (token) {
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
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || "Respuesta inesperada del servidor");
      }

      if (response.ok) {
        if (window.authManager) {
          window.authManager.login(data.token, data.user);
        } else {
          localStorage.setItem("userToken", data.token);
          localStorage.setItem("token", data.token);
          localStorage.setItem("userId", data.user.id);
          localStorage.setItem("userName", data.user.fullName);
          localStorage.setItem("userEmail", data.user.email);
          localStorage.setItem("userPhone", data.user.phone);
          localStorage.setItem("userRole", data.user.role || "user");
        }

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
      setMessage(error.message || "Error al conectar con el servidor");
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  return (
    <section className="hero d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
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