// frontend/src/components/Navbar.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "../style/navigation.css";

export default function Navbar() {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [navVisible, setNavVisible] = useState(false); // NEW

  const currentPage = (() => {
    const path = location.pathname;
    if (path === "/" || path === "/home") return "home";
    if (path.includes("/login")) return "login";
    if (path.includes("/register")) return "register";
    if (path.includes("/appointment") || path.includes("/appointments"))
      return "appointment";
    return "other";
  })();

  useEffect(() => {
    const checkAuth = () => {
      const token =
        localStorage.getItem("token") || localStorage.getItem("user_token");
      const isLogged = !!token;
      setIsLoggedIn(isLogged);

      if (
        isLogged &&
        window.authManager &&
        typeof window.authManager.getCurrentUser === "function"
      ) {
        const currentUser = window.authManager.getCurrentUser();
        setUser(currentUser);
        setIsAdmin(
          !!(window.authManager.isAdmin && window.authManager.isAdmin())
        );
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    };

    checkAuth();

    const onStorageChange = () => checkAuth();
    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, []);

  // Show navbar only after scrolling past the hero section
  useEffect(() => {
    const handleScroll = () => {
      const hero = document.querySelector(".hero");
      if (!hero) {
        // If there's no hero (other pages), always show navbar
        setNavVisible(true);
        return;
      }

      const heroBottom = hero.getBoundingClientRect().bottom;
      // When the bottom of hero is above a small threshold, show navbar
      const threshold = 80; // px from top; adjust to taste
      setNavVisible(heroBottom <= threshold);
    };

    // Run once on mount, then on scroll
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    if (window.authManager && typeof window.authManager.logout === "function") {
      window.authManager.logout();
      window.location.reload();
    }
  };

  const handleScrollToContacto = (e) => {
    e.preventDefault();
    const el = document.getElementById("contacto-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      className={
        [
          "navbar",
          "navbar-expand-lg",
          "main-navbar",
          "custom-navbar",
          "shadow-sm",
          "py-3",
          "custom-navbar-slide", // slide-in base class
          navVisible ? "visible" : "" // toggled on scroll
        ].join(" ")
      }
    >
      <div className="container">
        <Link
          className="navbar-brand d-flex align-items-center gap-2 fw-bold fs-3"
          to="/"
        >
          <span
            className="brand-logo bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2"
            style={{ width: 48, height: 48 }}
          >
            <i className="fas fa-spine fa-lg" />
          </span>
          <span className="brand-title">Quiroprácticos Rocha</span>
        </Link>

        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-controls="mainNavbar"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="mainNavbar">
          <ul className="navbar-nav ms-auto align-items-center gap-3">
            <li className="nav-item">
              <Link
                className={`nav-link main-nav-link ${
                  currentPage === "home" ? "active" : ""
                }`}
                to="/"
              >
                <i className="fas fa-home me-1" />
                Inicio
              </Link>
            </li>

            <li className="nav-item">
              <Link
                className={`nav-link main-nav-link ${
                  currentPage === "appointment" ? "active" : ""
                }`}
                to="/appointments/new"
              >
                <i className="fas fa-calendar-plus me-1" />
                Agendar Cita
              </Link>
            </li>

            <li className="nav-item">
              <a
                className="nav-link main-nav-link"
                href="#contacto-section"
                onClick={handleScrollToContacto}
              >
                <i className="fas fa-map-marker-alt me-1" />
                Ubicación
              </a>
            </li>

            <li className="nav-item">
              <a
                className="nav-link main-nav-link"
                href="#contacto-section"
                onClick={handleScrollToContacto}
              >
                <i className="fas fa-phone me-1" />
                Contacto
              </a>
            </li>

            <li className="nav-item" id="authNavItem">
              {isLoggedIn ? (
                <div className="dropdown">
                  <a
                    className="nav-link main-nav-link dropdown-toggle user-name-display"
                    href="#"
                    role="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <i className="fas fa-user me-1" />
                    {user?.fullName || "Usuario"}
                  </a>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li>
                      <Link className="dropdown-item" to="/mis-citas">
                        <i className="fas fa-calendar-check me-2" />
                        Mis Citas
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/user-settings">
                        <i className="fas fa-user-cog me-2" />
                        Configuración
                      </Link>
                    </li>

                    {isAdmin && (
                      <>
                        <li>
                          <hr className="dropdown-divider" />
                        </li>
                        <li>
                          <Link
                            className="dropdown-item"
                            to="/admin/adminOptions"
                          >
                            <i className="fas fa-cog me-2" />
                            Panel Admin
                          </Link>
                        </li>
                      </>
                    )}

                    <li>
                      <a
                        className="dropdown-item"
                        href="#"
                        onClick={handleLogout}
                      >
                        <i className="fas fa-sign-out-alt me-2" />
                        Cerrar Sesión
                      </a>
                    </li>
                  </ul>
                </div>
              ) : (
                <Link
                  className={`nav-link main-nav-link ${
                    currentPage === "login" ? "active" : ""
                  }`}
                  to="/login"
                >
                  <i className="fas fa-sign-in-alt me-1" />
                  Iniciar Sesión
                </Link>
              )}
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}