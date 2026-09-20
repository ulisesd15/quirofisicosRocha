import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import "../style/navigation.css";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, user, isAdmin, logout } = useAuth();

  const [navVisible, setNavVisible] = useState(false);
  const [subDropdownOpen, setSubDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navbarCollapseRef = useRef(null);

  // Determine current active page for styling
  const currentPage = (() => {
    const path = location.pathname;
    if (path === "/" || path === "/home") return "home";
    if (path.includes("/login")) return "login";
    if (path.includes("/register")) return "register";
    if (path.includes("/appointment")) return "appointment";
    if (path.includes("/mis-citas")) return "my-appointments";
    if (path.includes("/userSettings")) return "settings";
    if (path.includes("/admin")) return "admin";
    return "other";
  })();

  // Sticky / Slide navbar behavior on scroll relative to hero section
  useEffect(() => {
    const handleScroll = () => {
      const hero = document.querySelector(".hero");
      if (!hero) {
        setNavVisible(true);
        return;
      }
      const heroBottom = hero.getBoundingClientRect().bottom;
      setNavVisible(heroBottom <= 80);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  // Handle hash scrolling when arriving at home page from another route
  useEffect(() => {
    if (location.pathname === "/" && location.hash) {
      const sectionId = location.hash.substring(1);
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
    }
  }, [location]);

  // Close dropdowns and mobile menu on outside clicks
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSubDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper to close mobile collapse menu after clicking a link
  const closeMobileMenu = () => {
    const collapseElement = navbarCollapseRef.current;
    if (collapseElement && collapseElement.classList.contains("show")) {
      // If Bootstrap JS is loaded globally, use it or toggle class safely
      const bsCollapse = window.bootstrap?.Collapse?.getInstance(collapseElement);
      if (bsCollapse) {
        bsCollapse.hide();
      } else {
        collapseElement.classList.remove("show");
      }
    }
  };

  const handleLogoutClick = (e) => {
    e.preventDefault();
    closeMobileMenu();
    logout();
    navigate("/", { replace: true });
  };

  const handleScrollToSection = (e, sectionId) => {
    e.preventDefault();
    closeMobileMenu();
    if (location.pathname !== "/") {
      navigate(`/#${sectionId}`);
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const displayName = user?.fullName || user?.name || "Usuario";

  return (
    <nav
      className={[
        "navbar",
        "navbar-expand-lg",
        "main-navbar",
        "custom-navbar",
        "shadow-lg",
        "py-3",
        "custom-navbar-slide",
        navVisible ? "visible" : "",
      ].join(" ")}
      id="main-navigation"
    >
      <div className="container">
        {/* Brand Logo & Name */}
        <Link className="navbar-brand d-flex align-items-center gap-2 fw-bold fs-3" to="/">
          <span className="brand-logo text-white rounded-circle d-flex align-items-center justify-content-center me-2 shadow-sm">
            <i className="fas fa-spine fa-lg" />
          </span>
          <span className="brand-title">
            Quiroprácticos <span className="text-highlight">Rocha</span>
          </span>
        </Link>

        {/* Mobile Toggler */}
        <button
          className="navbar-toggler border-0 shadow-none"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-controls="mainNavbar"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        {/* Navigation Content Matrix */}
        <div className="collapse navbar-collapse" id="mainNavbar" ref={navbarCollapseRef}>
          <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-2 gap-2 mt-3 mt-lg-0">
            
            {/* 1. Public Links */}
            <li className="nav-item">
              <Link 
                className={`nav-link main-nav-link px-3 py-2 rounded-pill ${currentPage === "home" ? "active" : ""}`} 
                to="/"
                onClick={closeMobileMenu}
              >
                <i className="fas fa-home me-2 text-primary" />
                Inicio
              </Link>
            </li>

            {!isAdmin && (
              <li className="nav-item">
                <Link 
                  className={`nav-link main-nav-link px-3 py-2 rounded-pill ${currentPage === "appointment" ? "active" : ""}`} 
                  to="/appointments/new"
                  onClick={closeMobileMenu}
                >
                  <i className="fas fa-calendar-plus me-2 text-success" />
                  Agendar Cita
                </Link>
              </li>
            )}

            {isAdmin && (
              <li className="nav-item">
                <Link 
                  className={`nav-link main-nav-link px-3 py-2 rounded-pill ${currentPage === "admin" ? "active" : ""}`} 
                  to="/admin/adminOptions"
                  onClick={closeMobileMenu}
                >
                  <i className="fas fa-chart-line me-2 text-danger" />
                  Panel Admin
                </Link>
              </li>
            )}

            <li className="nav-item">
              <a 
                className="nav-link main-nav-link px-3 py-2 rounded-pill" 
                href="#contacto-section" 
                onClick={(e) => handleScrollToSection(e, "contacto-section")}
              >
                <i className="fas fa-map-marker-alt me-2 text-warning" />
                Ubicación
              </a>
            </li>

            <li className="nav-item">
              <a 
                className="nav-link main-nav-link px-3 py-2 rounded-pill" 
                href="#contacto-section" 
                onClick={(e) => handleScrollToSection(e, "contacto-section")}
              >
                <i className="fas fa-phone me-2 text-info" />
                Contacto
              </a>
            </li>

            {/* 2. Authenticated State & Dropdown */}
            {isLoggedIn ? (
              <li className="nav-item dropdown position-relative" ref={dropdownRef}>
                <a
                  className="nav-link main-nav-link dropdown-toggle user-pill-badge d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm"
                  href="#"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <span className="user-avatar-circle">
                    <i className="fas fa-user text-white" />
                  </span>
                  <span className="fw-semibold">{displayName}</span>
                  <span className={`badge ${isAdmin ? 'bg-danger' : 'bg-primary'} ms-1 text-uppercase fs-xs`}>
                    {isAdmin ? 'Admin' : 'Paciente'}
                  </span>
                </a>

                {/* Main Profile Dropdown */}
                <ul className="dropdown-menu dropdown-menu-end custom-dropdown-menu shadow-lg p-2 border-0 animate-fade-in">
                  <li className="dropdown-header text-muted small px-3 py-1">
                    Conectado como <strong className="text-dark">{user?.email || "Usuario"}</strong>
                  </li>
                  <li><hr className="dropdown-divider my-2" /></li>

                  {!isAdmin ? (
                    <>
                      <li>
                        <Link className="dropdown-item rounded py-2 px-3 d-flex align-items-center gap-2" to="/mis-citas" onClick={closeMobileMenu}>
                          <i className="fas fa-calendar-check text-primary" />
                          <span>Mis Citas Registradas</span>
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item rounded py-2 px-3 d-flex align-items-center gap-2" to="/userSettings" onClick={closeMobileMenu}>
                          <i className="fas fa-user-cog text-secondary" />
                          <span>Configuración de Cuenta</span>
                        </Link>
                      </li>

                      {/* SECONDARY NESTED SPECIFICS DROPDOWN (User) */}
                      <li className="dropdown-submenu position-relative">
                        <a
                          className="dropdown-item rounded py-2 px-3 d-flex align-items-center justify-content-between"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setSubDropdownOpen(!subDropdownOpen);
                          }}
                        >
                          <span className="d-flex align-items-center gap-2">
                            <i className="fas fa-sliders-h text-info" />
                            <span>Preferencias y Salud</span>
                          </span>
                          <i className={`fas fa-chevron-right small transition-icon ${subDropdownOpen ? 'rotate-90' : ''}`} />
                        </a>

                        <ul className={`dropdown-sub-menu shadow-sm p-2 border-0 bg-light rounded ${subDropdownOpen ? 'd-block' : 'd-none'}`}>
                          <li>
                            <Link className="dropdown-item rounded py-1 px-3 small d-flex align-items-center gap-2" to="/userSettings#medical-history" onClick={closeMobileMenu}>
                              <i className="fas fa-file-medical text-danger" />
                              <span>Historial Médico</span>
                            </Link>
                          </li>
                          <li>
                            <Link className="dropdown-item rounded py-1 px-3 small d-flex align-items-center gap-2" to="/userSettings#notifications" onClick={closeMobileMenu}>
                              <i className="fas fa-bell text-warning" />
                              <span>Notificaciones & Alertas</span>
                            </Link>
                          </li>
                        </ul>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <Link className="dropdown-item rounded py-2 px-3 d-flex align-items-center gap-2" to="/admin/adminOptions" onClick={closeMobileMenu}>
                          <i className="fas fa-tachometer-alt text-danger" />
                          <span>Panel General Admin</span>
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item rounded py-2 px-3 d-flex align-items-center gap-2" to="/admin/users" onClick={closeMobileMenu}>
                          <i className="fas fa-users-cog text-primary" />
                          <span>Gestión de Pacientes</span>
                        </Link>
                      </li>

                      {/* SECONDARY NESTED SPECIFICS DROPDOWN (Admin) */}
                      <li className="dropdown-submenu position-relative">
                        <a
                          className="dropdown-item rounded py-2 px-3 d-flex align-items-center justify-content-between"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setSubDropdownOpen(!subDropdownOpen);
                          }}
                        >
                          <span className="d-flex align-items-center gap-2">
                            <i className="fas fa-tools text-dark" />
                            <span>Herramientas Avanzadas</span>
                          </span>
                          <i className={`fas fa-chevron-right small transition-icon ${subDropdownOpen ? 'rotate-90' : ''}`} />
                        </a>

                        <ul className={`dropdown-sub-menu shadow-sm p-2 border-0 bg-light rounded ${subDropdownOpen ? 'd-block' : 'd-none'}`}>
                          <li>
                            <Link className="dropdown-item rounded py-1 px-3 small d-flex align-items-center gap-2" to="/admin/reports" onClick={closeMobileMenu}>
                              <i className="fas fa-chart-bar text-info" />
                              <span>Reportes & Estadísticas</span>
                            </Link>
                          </li>
                          <li>
                            <Link className="dropdown-item rounded py-1 px-3 small d-flex align-items-center gap-2" to="/admin/audit-logs" onClick={closeMobileMenu}>
                              <i className="fas fa-history text-secondary" />
                              <span>Auditoría del Sistema</span>
                            </Link>
                          </li>
                        </ul>
                      </li>
                    </>
                  )}

                  <li><hr className="dropdown-divider my-2" /></li>

                  <li>
                    <button
                      type="button"
                      className="dropdown-item rounded py-2 px-3 d-flex align-items-center gap-2 text-danger fw-semibold logout-dropdown-item"
                      onClick={handleLogoutClick}
                    >
                      <i className="fas fa-sign-out-alt" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </li>
                </ul>
              </li>
            ) : (
              /* 3. Guest Actions */
              <div className="d-flex align-items-center gap-2 ms-lg-3 flex-column flex-lg-row w-100 w-lg-auto my-2 my-lg-0">
                <li className="nav-item list-unstyled w-100">
                  <Link 
                    className={`btn btn-outline-primary px-4 py-2 rounded-pill fw-semibold auth-btn-login w-100 ${currentPage === "login" ? "active" : ""}`} 
                    to="/login"
                    onClick={closeMobileMenu}
                  >
                    <i className="fas fa-sign-in-alt me-2" />
                    Iniciar Sesión
                  </Link>
                </li>
                <li className="nav-item list-unstyled w-100">
                  <Link 
                    className={`btn btn-primary px-4 py-2 rounded-pill fw-semibold auth-btn-register shadow-sm w-100 ${currentPage === "register" ? "active" : ""}`} 
                    to="/register"
                    onClick={closeMobileMenu}
                  >
                    <i className="fas fa-user-plus me-2" />
                    Registrarse
                  </Link>
                </li>
              </div>
            )}

          </ul>
        </div>
      </div>
    </nav>
  );
}