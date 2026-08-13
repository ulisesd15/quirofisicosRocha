/**
 * Navbar.jsx — React replacement for navigation.js's NavigationManager.
 * Renders the desktop navbar with an auth-aware right-hand item (login link vs.
 * user dropdown with Mis Citas / Configuración / Panel Admin / Cerrar Sesión).
 */
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { isLoggedIn, isAdmin, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  const scrollToSection = (sectionId) => (event) => {
    event.preventDefault();
    if (location.pathname !== '/') {
      navigate(`/#${sectionId}`);
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar navbar-expand-lg main-navbar shadow-sm bg-white py-3 custom-navbar">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2 fw-bold fs-3 text-primary" to="/">
          <span className="brand-logo bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2">
            <i className="fas fa-spine fa-lg" />
          </span>
          <span className="brand-title">Quiroprácticos Rocha</span>
        </Link>
        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-label="Abrir menú"
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="mainNavbar">
          <ul className="navbar-nav ms-auto align-items-center gap-3">
            <li className="nav-item">
              <Link className={`nav-link main-nav-link ${isActive('/') ? 'active' : ''}`} to="/">
                <i className="fas fa-home me-1" />
                Inicio
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link main-nav-link ${isActive('/appointment') ? 'active' : ''}`} to="/appointment">
                <i className="fas fa-calendar-plus me-1" />
                Agendar Cita
              </Link>
            </li>
            <li className="nav-item">
              <a className="nav-link main-nav-link" href="#contacto-section" onClick={scrollToSection('contacto-section')}>
                <i className="fas fa-map-marker-alt me-1" />
                Ubicación
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link main-nav-link" href="#contacto-section" onClick={scrollToSection('contacto-section')}>
                <i className="fas fa-phone me-1" />
                Contacto
              </a>
            </li>
            <li className="nav-item">
              {isLoggedIn ? (
                <div className="dropdown">
                  <a
                    className="nav-link main-nav-link dropdown-toggle user-name-display"
                    href="#"
                    role="button"
                    data-bs-toggle="dropdown"
                  >
                    <i className="fas fa-user me-1" />
                    {user?.full_name || 'Usuario'}
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
                          <Link className="dropdown-item" to="/admin">
                            <i className="fas fa-cog me-2" />
                            Panel Admin
                          </Link>
                        </li>
                      </>
                    )}
                    <li>
                      <button className="dropdown-item" onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt me-2" />
                        Cerrar Sesión
                      </button>
                    </li>
                  </ul>
                </div>
              ) : (
                <Link className={`nav-link main-nav-link ${isActive('/login') ? 'active' : ''}`} to="/login">
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
