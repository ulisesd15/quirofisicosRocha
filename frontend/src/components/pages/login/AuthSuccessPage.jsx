// frontend/src/components/pages/AuthSuccessPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../../../style/style.css";
import "../../../style/navigation.css";

export default function AuthSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      console.error("No token received from Google OAuth");
      setError("Error al iniciar sesión con Google - No se recibió token");
      navigate("/login?error=oauthFailed", { replace: true });
      return;
    }

    // Store token for session persistence
    localStorage.setItem("user_token", token);
    localStorage.setItem("token", token);

    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/auth/profile", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch user profile: ${res.status}`);
        }

        const user = await res.json(); // { id, fullName, email, phone, role, ... }[file:1]

        const userObj = {
          id: user.id,
          full_name: user.fullName,  // map backend fullName -> full_name for existing code
          email: user.email,
          role: user.role || "user",
        };

        if (window.authManager) {
          window.authManager.login(token, userObj);
        } else {
          localStorage.setItem("user_id", user.id);
          localStorage.setItem("user_name", user.fullName);
          localStorage.setItem("user_role", user.role || "user");
        }

        // Redirect into the app (appointments page)
        navigate("/appointments/new", { replace: true });
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError("Error al obtener información del usuario. Inténtalo de nuevo más tarde.");
        navigate("/login?error=oauthFailed", { replace: true });
      }
    };

    fetchProfile();
  }, [searchParams, navigate]);

  return (
    <section className="hero d-flex align-items-center justify-content-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-8">
            <div className="card border-0 shadow-lg">
              <div className="card-body p-5 text-center">
                <div className="mb-4">
                  <div
                    className="spinner-border text-primary"
                    role="status"
                    style={{ width: "3rem", height: "3rem" }}
                  >
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>

                <h2 className="text-primary mb-3">
                  <i className="fab fa-google me-2" />
                  Autenticando con Google
                </h2>

                <p className="text-muted mb-4">
                  Por favor espera mientras procesamos tu inicio de sesión...
                </p>

                {error && (
                  <p className="text-danger mb-3">
                    {error}
                  </p>
                )}

                <div className="d-flex justify-content-center">
                  <div
                    className="progress"
                    style={{ width: 200, height: 6 }}
                  >
                    <div
                      className="progress-bar progress-bar-striped progress-bar-animated"
                      role="progressbar"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}