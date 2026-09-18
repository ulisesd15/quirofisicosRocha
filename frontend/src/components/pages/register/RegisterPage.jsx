// frontend/src/components/pages/register/RegisterPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../../style/style.css"; // hero + general styles
import "../../../style/navigation.css"; // optional if you want nav styles here too
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const [message, setMessage] = useState("");
  // "error" or "success" to control text color
  const [messageType, setMessageType] = useState("error");

  // Redirect if already logged in (same logic as register.js)
  useEffect(() => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("user_token");
    if (token) {
      // In React app, send them to the appointments flow
      navigate("/appointments/new", { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Helpers from register.js
  const isPasswordStrong = (password) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(
      password
    );

  const isValidPhone = (phone) => /^\d{10}$/.test(phone);
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("error");

    const {
      full_name,
      phone,
      email,
      password,
      confirm_password,
    } = form;

    // Validations (same messages as register.js)
    if (!full_name || !phone || !email || !password || !confirm_password) {
      setMessage("Faltan campos requeridos");
      return;
    }

    if (password !== confirm_password) {
      setMessage("Las contraseñas no coinciden");
      return;
    }

    if (!isPasswordStrong(password)) {
      setMessage(
        "La contraseña debe tener al menos 6 caracteres, incluyendo 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial"
      );
      return;
    }

    if (!isValidPhone(phone)) {
      setMessage("El teléfono debe tener 10 dígitos");
      return;
    }

    if (!isValidEmail(email)) {
      setMessage("Correo electrónico inválido");
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name, phone, email, password }),
      });

      const result = await res.json();
      console.log("Register response:", result);

      if (res.ok) {
        // AuthManager integration (same as register.js)
        if (window.authManager) {
          window.authManager.login(result.token, result.user);
        } else {
          localStorage.setItem("user_token", result.token);
          localStorage.setItem("token", result.token);
          localStorage.setItem("user_id", result.user.id);
          localStorage.setItem("user_name", result.user.full_name);
          localStorage.setItem("user_email", result.user.email);
          localStorage.setItem("user_phone", result.user.phone);
          localStorage.setItem("user_role", result.user.role || "user");
        }

        setMessageType("success");
        setMessage(result.message || "Registro exitoso");

        // In your React app, send user to appointments page
        setTimeout(() => {
          navigate("/appointments/new");
        }, 1500);
      } else {
        setMessage(result.error || "No se pudo registrar");
      }
    } catch (error) {
      console.error("Error al registrar:", error);
      setMessage(
        "Error al registrar. Inténtalo de nuevo más tarde."
      );
    }
  };

  const handleGoogleRegister = () => {
    // Same behavior as register.js
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  return (
    <section className="hero d-flex align-items-center justify-content-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-8">
            <div className="card border-0 shadow-lg">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <h2 className="text-primary mb-2">
                    <i className="fas fa-user-plus me-2" />
                    Crear Cuenta
                  </h2>
                  <p className="text-muted">
                    Únete a nosotros para acceder a nuestros servicios
                  </p>
                </div>

                {/* Register Form */}
                <form id="register-form" onSubmit={handleSubmit}>
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
                        placeholder="6641234567"
                        value={form.phone}
                        onChange={handleChange}
                        required
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
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label
                        htmlFor="confirm_password"
                        className="form-label"
                      >
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
                      />
                    </div>
                  </div>

                  <button
                    className="btn btn-success w-100 mb-3"
                    type="submit"
                  >
                    <i className="fas fa-user-plus me-2" />
                    Crear Cuenta
                  </button>

                  {message && (
                    <div
                      id="registerMessage"
                      className={
                        messageType === "success"
                          ? "text-success text-center mb-3"
                          : "text-danger text-center mb-3"
                      }
                    >
                      {message}
                    </div>
                  )}
                </form>

                {/* Google Register */}
                <div className="d-grid mb-3">
                  <button
                    id="google-login"
                    className="btn btn-outline-danger"
                    type="button"
                    onClick={handleGoogleRegister}
                  >
                    <img
                      src="https://developers.google.com/identity/images/g-logo.png"
                      style={{ width: 20, marginRight: 8 }}
                      alt="Google logo"
                    />
                    Registrarse con Google
                  </button>
                </div>

                {/* Navigation Links */}
                <div className="text-center mt-4">
                  <p className="mb-2">
                    <Link
                      to="/login"
                      className="text-decoration-none"
                    >
                      <i className="fas fa-sign-in-alt me-1" />
                      ¿Ya tienes cuenta? Inicia sesión
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