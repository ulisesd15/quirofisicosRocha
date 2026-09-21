// frontend/src/components/admin/AdminLayout.jsx
//
// Shell for every /admin page: verifies the session is an admin,
// renders the top navbar + sidebar navigation, and provides the
// outlet where section pages render.

import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import AdminToasts from "./toast";
import "../../style/admin.css";

const NAV_ITEMS = [
  { to: "/admin", end: true, icon: "fa-tachometer-alt", label: "Dashboard" },
  { to: "/admin/appointments", icon: "fa-calendar-check", label: "Citas" },
  { to: "/admin/users", icon: "fa-users", label: "Usuarios" },
  { to: "/admin/horarios", icon: "fa-calendar-alt", label: "Gestión de Horarios" },
  { to: "/admin/configuracion", icon: "fa-cogs", label: "Configuración" },
  { to: "/admin/verificacion", icon: "fa-user-check", label: "Verificación de Usuarios" },
  { to: "/admin/servidor", icon: "fa-server", label: "Estado del Servidor" },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [adminName, setAdminName] = useState("Administrador");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Verify the token and the admin role before rendering any admin page.
  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const token =
        localStorage.getItem("token") || localStorage.getItem("userToken");

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const response = await fetch("/api/auth/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        // A dev server without an /api proxy answers with the SPA's
        // index.html (status 200), so verify we actually got JSON before
        // parsing — otherwise response.json() throws and looks like an
        // auth failure.
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || !contentType.includes("application/json")) {
          // 401/403 means the token is expired or invalid: clear the stale
          // session so the login page does not keep bouncing the user.
          if (response.status === 401 || response.status === 403) {
            window.authManager?.logout?.();
          }
          throw new Error("Sesión inválida");
        }

        const user = await response.json();

        if (cancelled) return;

        if (user.role !== "admin") {
          navigate("/", { replace: true });
          return;
        }

        localStorage.setItem("userName", user.fullName || user.email || "");

        localStorage.setItem("userRole", user.role);
        setAdminName(user.fullName || user.email || "Administrador");
      } catch (error) {
        console.error("Admin access verification failed:", error);
        if (!cancelled) navigate("/login", { replace: true });
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleLogout = () => {
    if (window.authManager?.logout) {
      window.authManager.logout();
    } else {
      [
        "token",
        "userToken",
        "user",
        "userId",
        "userName",
        "userEmail",
        "userPhone",
        "userRole",
      ].forEach((key) => localStorage.removeItem(key));
      window.dispatchEvent(new Event("authChange"));
    }
    navigate("/login", { replace: true });
  };

  if (checking) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: "100vh" }}
      >
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="text-muted mb-0">Verificando acceso de administrador...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-root">
      <AdminToasts />

      {/* Top Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container-fluid position-relative">
          <button
            className="btn btn-outline-light d-lg-none position-absolute"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Alternar menú"
          >
            <i className="fas fa-bars" />
          </button>
          <Link className="navbar-brand" to="/">
            <i className="fas fa-spine me-2" />
            Quirofísicos Rocha
          </Link>
          <div className="d-flex justify-content-between align-items-center w-100">
            <div className="d-flex align-items-center">
              <span className="badge bg-warning text-dark me-3">Admin Panel</span>
              <span className="navbar-text me-3 d-none d-md-inline">
                {adminName}
              </span>
            </div>
            <div className="d-flex align-items-center">
              <Link to="/" className="btn btn-outline-light btn-sm me-2">
                <i className="fas fa-home" /> Sitio Principal
              </Link>
              <button
                className="btn btn-outline-light btn-sm"
                onClick={handleLogout}
              >
                <i className="fas fa-sign-out-alt" /> Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container-fluid">
        <div className="row">
          {/* Sidebar Navigation */}
          <nav
            className={`col-md-3 col-lg-2 d-md-block bg-light sidebar admin-sidebar ${
              sidebarOpen ? "show" : ""
            }`}
            id="admin-sidebar"
          >
            <div className="position-sticky pt-3">
              <ul className="nav flex-column">
                {NAV_ITEMS.map((item) => (
                  <li className="nav-item" key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `nav-link ${isActive ? "active" : ""}`
                      }
                      onClick={() => setSidebarOpen(false)}
                    >
                      <i className={`fas ${item.icon}`} /> {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
