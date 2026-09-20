import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../../style/style.css"; 
import "../../../style/navigation.css"; 

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");

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

  const isPasswordStrong = (password) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!\%*?&]{6,}$/.test(
      password
    );

  const isValidPhone = (phone) => /^\d{10}$/.test(phone);
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("error");

    const {
      fullName,
      phone,
      email,
      password,
      confirmPassword,
    } = form;

    if (!fullName || !phone || !email || !password || !confirmPassword) {
      setMessage("Faltan campos requeridos");
      return;
    }

    if (password !== confirmPassword) {
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
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, email, password }),
      });

      const contentType = res.headers.get("content-type");
      let result;
      if (contentType && contentType.includes("application/json")) {
        result = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || "Respuesta inesperada del servidor");
      }

      if (res.ok) {
        if (window.authManager) {
          window.authManager.login(result.token, result.user);
        } else {
          localStorage.setItem("userToken", result.token);
          localStorage.setItem("token", result.token);
          localStorage.setItem("userId", result.user.id);
          localStorage.setItem("userName", result.user.fullName);
          localStorage.setItem("userEmail", result.user.email);
          localStorage.setItem("userPhone", result.user.phone);
          localStorage.setItem("userRole", result.user.role || "user");

          // Keep the navbar in sync even without authManager
          window.dispatchEvent(new Event("authChange"));
        }

        setMessageType("success");
        setMessage(result.message || "Registro exitoso");

        setTimeout(() => {
          navigate("/appointments/new");
        }, 1500);
      } else {
        // Backend auth routes return { success, message }
        setMessage(result.message || result.error || "No se pudo registrar");
      }
    } catch (error) {
      console.error("Error al registrar:", error);
      setMessage(
        error.message || "Error al registrar. Inténtalo de nuevo más tarde."
      );
    }
  };

  const handleGoogleRegister = () => {
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  return (
    <section className="hero d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
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

                <form id="register-form" onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="fullName" className="form-label">
                        <i className="fas fa-user me-2" />
                        Nombre Completo
                      </label>
                      <input
                        className="form-control"
                        name="fullName"
                        id="fullName"
                        placeholder="Tu nombre completo"
                        value={form.fullName}
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
                        placeholder="Mín. 6 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 especial"
                        value={form.password}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label
                        htmlFor="confirmPassword"
                        className="form-label"
                      >
                        <i className="fas fa-lock me-2" />
                        Confirmar Contraseña
                      </label>
                      <input
                        className="form-control"
                        name="confirmPassword"
                        id="confirmPassword"
                        type="password"
                        placeholder="Repite la contraseña"
                        value={form.confirmPassword}
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