import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../../../style/style.css";
import "../../../style/navigation.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export default function AuthSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  
  // Guard ref to prevent double-execution in React StrictMode
  const hasFetched = useRef(false);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      console.error("No token received from Google OAuth");
      setError("Error al iniciar sesión con Google: no se recibió el token.");
      navigate("/login?error=oauthFailed", { replace: true });
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchProfile = async () => {
      try {
        localStorage.setItem("token", token);
        localStorage.setItem("userToken", token);

        const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch user profile: ${res.status}`);
        }

        const user = await res.json();

        const userObj = {
          id: user.id,
          fullName: user.fullName || user.name || "Usuario",
          email: user.email,
          phone: user.phone || "",
          role: user.role || "user",
          authProvider: user.authProvider || "google",
          isVerified: Boolean(user.isVerified),
        };

        localStorage.setItem("userId", String(userObj.id));
        localStorage.setItem("userName", userObj.fullName);
        localStorage.setItem("userEmail", userObj.email);
        localStorage.setItem("userPhone", userObj.phone);
        localStorage.setItem("userRole", userObj.role);
        localStorage.setItem("user", JSON.stringify(userObj));

        if (
          window.authManager &&
          typeof window.authManager.login === "function"
        ) {
          window.authManager.login(token, userObj);
        }

        // Notify components in the current tab that authentication succeeded
        window.dispatchEvent(new Event("authChange"));

        // Force a small timeout or immediate replacement to ensure storage is committed
        setTimeout(() => {
          navigate("/", {
            replace: true,
            state: { justLoggedIn: true },
          });
        }, 50);

      } catch (err) {
        console.error("Error fetching user profile:", err);

        localStorage.removeItem("token");
        localStorage.removeItem("userToken");
        localStorage.removeItem("user");
        localStorage.removeItem("userId");
        localStorage.removeItem("userName");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userPhone");
        localStorage.removeItem("userRole");

        setError("Error al obtener información de tu cuenta. Inténtalo de nuevo.");
        navigate("/login?error=oauthFailed", { replace: true });
      }
    };

    fetchProfile();
  }, [navigate, searchParams]);

  return (
    <section className="hero d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
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

                {error && <p className="text-danger mb-3">{error}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}