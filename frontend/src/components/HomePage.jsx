// frontend/src/pages/HomePage.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../style/style.css";

const defaultAddress =
  "Plaza Johnson, Av. Josefa Ortiz de Domínguez 1993, Independencia, 22055 Tijuana, B.C., México";

const STATIC_FALLBACK_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3366.2155419434!2d-117.04064468536147!3d32.51311678103924";

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const dayNames = {
  'Monday': 'Lunes',
  'Tuesday': 'Martes', 
  'Wednesday': 'Miércoles',
  'Thursday': 'Jueves',
  'Friday': 'Viernes',
  'Saturday': 'Sábado',
  'Sunday': 'Domingo'
};

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatBusinessHoursForInfo(businessHours) {
  if (!Array.isArray(businessHours) || businessHours.length === 0) {
    return 'Lunes a Viernes<br>9:00 AM - 6:00 PM';
  }
  const openDays = businessHours.filter(day => day.is_open);
  if (openDays.length === 0) {
    return 'Actualmente cerrado';
  }

  const groups = [];
  let currentGroup = null;

  dayOrder.forEach(day => {
    const dayData = businessHours.find(h => h.day_of_week === day);
    if (dayData && dayData.is_open) {
      const timeString = `${dayData.open_time} - ${dayData.close_time}`;
      if (currentGroup && currentGroup.time === timeString) {
        currentGroup.days.push(dayNames[day]);
      } else {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = {
          days: [dayNames[day]],
          time: timeString
        };
      }
    } else {
      if (currentGroup) {
        groups.push(currentGroup);
        currentGroup = null;
      }
    }
  });

  if (currentGroup) groups.push(currentGroup);

  const lines = groups.map(group => {
    const daysText = group.days.length === 1 ? 
      group.days[0] : 
      group.days.length === 2 ? 
        group.days.join(' y ') :
        `${group.days.slice(0, -1).join(', ')} y ${group.days[group.days.length - 1]}`;
    return `${daysText}<br>${group.time}`;
  });

  return lines.join('<br><br>');
}

function formatBusinessHoursForFooter(businessHours) {
  if (!Array.isArray(businessHours) || businessHours.length === 0) {
    return (
      <>
        <p className="text-white-50 mb-1">Lunes - Viernes: 9:00 AM - 6:00 PM</p>
        <p className="text-white-50 mb-1">Sábados: 9:00 AM - 2:00 PM</p>
        <p className="text-white-50">Domingos: Cerrado</p>
      </>
    );
  }
  return businessHours.map((day, idx) => {
    const dayName = dayNames[day.day_of_week] || day.day_of_week;
    const formatTime = t => t ? t.replace(/:00$/, '') : '';
    if (day.is_open) {
      return <p key={idx} className="text-white-50 mb-1">{dayName}: {formatTime(day.open_time)} - {formatTime(day.close_time)}</p>;
    } else {
      return <p key={idx} className="text-white-50 mb-1">{dayName}: Cerrado</p>;
    }
  });
}

export default function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  const [announcements, setAnnouncements] = useState([]);
  const [businessHours, setBusinessHours] = useState([]);
  const [clinicSettings, setClinicSettings] = useState(null);

  const [dismissedAnnouncements, setDismissedAnnouncements] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("dismissedAnnouncements") || "[]"
      );
    } catch {
      return [];
    }
  });

  // Check auth on mount and when storage changes
  useEffect(() => {
    const checkAuth = () => {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("userToken") ||
        localStorage.getItem("user_token");

      const storedUser = localStorage.getItem("user");

      setIsLoggedIn(Boolean(token));

      if (token && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (error) {
          console.error("Error parsing stored user:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    checkAuth();

    window.addEventListener("authChange", checkAuth);
    window.addEventListener("storage", checkAuth);

    return () => {
      window.removeEventListener("authChange", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, [location.key]);

  // Load announcements
  useEffect(() => {
    let cancelled = false;

    async function loadAnnouncements() {
      try {
        const res = await fetch("/api/announcements/active");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          const filtered = data.filter(
            (a) => !dismissedAnnouncements.includes(a.id)
          );
          setAnnouncements(filtered);
        }
      } catch {
        // silently fail
      }
    }

    loadAnnouncements();
    return () => {
      cancelled = true;
    };
  }, [dismissedAnnouncements]);

  // Load business hours
  useEffect(() => {
    let cancelled = false;

    async function loadBusinessHours() {
      try {
        const headers = {};
        if (
          window.authManager &&
          typeof window.authManager.getAuthHeaders === "function"
        ) {
          Object.assign(headers, window.authManager.getAuthHeaders());
        }

        const res = await fetch("/api/business-hours", { headers });
        if (!res.ok) throw new Error("Failed to load business hours");
        const data = await res.json();

        const rawHours = Array.isArray(data.business_hours)
          ? data.business_hours
          : Array.isArray(data.businessHours)
          ? data.businessHours
          : [];

        if (!cancelled) {
          setBusinessHours(rawHours);
        }
      } catch (err) {
        console.error("Error loading business hours:", err);
      }
    }

    loadBusinessHours();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load clinic settings
  useEffect(() => {
    let cancelled = false;

    async function loadClinicSettings() {
      try {
        const res = await fetch("/api/clinic-settings");
        if (!res.ok)
          throw new Error("No se pudo cargar la información de la clínica");
        const settings = await res.json();
        if (!cancelled) {
          setClinicSettings(settings);
        }
      } catch (err) {
        console.error("Error loading clinic settings:", err);
      }
    }

    loadClinicSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDismissAnnouncement = (id) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    const updated = [...dismissedAnnouncements, id];
    setDismissedAnnouncements(updated);
    localStorage.setItem(
      "dismissedAnnouncements",
      JSON.stringify(updated)
    );
  };

  const clinicName = clinicSettings?.clinic_name || 'Quirofísicos Rocha';
  const clinicAddress = clinicSettings?.clinic_address || defaultAddress;
  const clinicPhone = clinicSettings?.clinic_phone || '664-123-4567';
  const clinicEmail = clinicSettings?.clinic_email || 'info@quirofisicosrocha.com';
  const clinicDescription = clinicSettings?.clinic_description || 'Centro Quiropráctico Profesional enfocado en recuperar tu bienestar físico.';

  return (
    <>
      {/* Hero Section */}
      <header className="hero text-center">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-8 mx-auto">
              <div className="fade-in">
                <p className="section-subtitle">
                  Centro Quiropráctico Profesional
                </p>
                <h1 className="display-4 fw-bold">{clinicName}</h1>
                <p className="lead">
                  Recupera tu bienestar físico con cuidado quiropráctico de confianza en Tijuana
                </p>
                <div className="mt-4 d-flex justify-content-center flex-wrap gap-3">
                  {!isLoggedIn ? (
                    <>
                      <button onClick={() => navigate("/register")} className="btn btn-success">
                        <i className="fas fa-user-plus me-2"></i>Registrarse
                      </button>
                      <button onClick={() => navigate("/appointment")} className="btn btn-outline-light">
                        <i className="fas fa-user me-2"></i>Continuar como Invitado
                      </button>
                      <button onClick={() => navigate("/login")} className="btn btn-outline-light">
                        <i className="fas fa-sign-in-alt me-2"></i>Iniciar Sesión
                      </button>
                    </>
                  ) : (
                    <button onClick={() => navigate("/appointment")} className="btn btn-warning">
                      <i className="fas fa-calendar-plus me-2"></i>Agendar Cita
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Announcements Banner */}
      {announcements.length > 0 && (
        <div id="announcements-banner" className="announcements-container">
          {announcements.map((announcement) => {
            const type = announcement.announcement_type || 'info';
            const icon = type === 'warning' ? 'fa-exclamation-triangle' : type === 'success' ? 'fa-check-circle' : type === 'danger' ? 'fa-exclamation-circle' : 'fa-info-circle';
            const isHighPriority = announcement.priority === 'high' || announcement.priority === 'urgent';

            return (
              <div 
                key={announcement.id} 
                className={`announcement-banner ${type} ${isHighPriority ? 'announcement-priority-high' : ''}`} 
                data-id={announcement.id}
              >
                <div className="announcement-content">
                  <div className="announcement-text">
                    <i className={`fas ${icon} announcement-icon`}></i>
                    <div>
                      <div className="announcement-title">{announcement.title}</div>
                      <div className="announcement-message">{announcement.message}</div>
                      {announcement.end_date && (
                        <div className="announcement-dates">Válido hasta: {formatDate(announcement.end_date)}</div>
                      )}
                    </div>
                  </div>
                  <button className="announcement-close" onClick={() => handleDismissAnnouncement(announcement.id)} aria-label="Cerrar anuncio">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Services Section */}
      <section id="servicios" className="services-section">
        <div className="container">
          <div className="text-center mb-5">
            <p className="section-subtitle">Nuestros Servicios</p>
            <h2>Tratamientos Quiroprácticos Especializados</h2>
            <p className="lead">Ofrecemos una amplia gama de servicios para mejorar tu salud y bienestar</p>
          </div>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="service-card text-center">
                <div className="service-icon">
                  <i className="fas fa-spine"></i>
                </div>
                <h4>Ajustes Quiroprácticos</h4>
                <p>Realineación de la columna vertebral para mejorar la función del sistema nervioso y reducir el dolor.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="service-card text-center">
                <div className="service-icon">
                  <i className="fas fa-user-md"></i>
                </div>
                <h4>Terapia de Tejidos Blandos</h4>
                <p>Técnicas especializadas para tratar músculos, ligamentos y tendones, promoviendo la curación natural.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="service-card text-center">
                <div className="service-icon">
                  <i className="fas fa-running"></i>
                </div>
                <h4>Rehabilitación Deportiva</h4>
                <p>Tratamiento especializado para lesiones deportivas y programas de prevención para atletas.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="about-image"></div>
            </div>
            <div className="col-lg-6">
              <div className="ps-lg-4">
                <p className="section-subtitle">Acerca de Nosotros</p>
                <h2>Experiencia y Dedicación en Quiropráctica</h2>
                <p className="lead">Con más de 10 años de experiencia, el Dr. Rocha se especializa en tratamientos quiroprácticos innovadores que combinan técnicas tradicionales con métodos modernos.</p>
                <div className="row g-3 mt-4">
                  <div className="col-sm-6">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-check-circle medical-icon me-2"></i>
                      <span>Más de 1000 pacientes tratados</span>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-award medical-icon me-2"></i>
                      <span>Certificaciones internacionales</span>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-heart medical-icon me-2"></i>
                      <span>Atención personalizada</span>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-clock medical-icon me-2"></i>
                      <span>Horarios flexibles</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section id="contacto-section" className="location-section">
        <div className="container">
          <div className="text-center mb-5">
            <p className="section-subtitle">Ubicación</p>
            <h2>Visítanos en Tijuana</h2>
            <p className="lead">Estamos ubicados en Plaza Johnson, fácil acceso y estacionamiento disponible</p>
          </div>
          <div className="row align-items-center">
            <div className="col-lg-8">
              <div className="map-container">
                <div className="ratio ratio-16x9">
                  <div id="map-container">
                    <iframe 
                      id="google-map" 
                      src={STATIC_FALLBACK_URL}
                      width="100%" 
                      height="100%" 
                      style={{ border: 0 }} 
                      allowFullScreen="" 
                      loading="lazy" 
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Mapa de Ubicación"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="ps-lg-4">
                <div className="card border-0 shadow-lg">
                  <div className="card-body p-4">
                    <h4 className="card-title mb-4">
                      <i className="fas fa-map-marker-alt medical-icon me-2" id="contacto"></i>
                      Información de Contacto
                    </h4>
                    <div className="mb-3">
                      <h6><i className="fas fa-location-dot me-2"></i>Dirección:</h6>
                      <p className="mb-0">{clinicAddress}</p>
                    </div>
                    <div className="mb-3">
                      <h6><i className="fas fa-phone me-2"></i>Teléfono:</h6>
                      <p className="mb-0">{clinicPhone}</p>
                    </div>
                    <div className="mb-4">
                      <h6><i className="fas fa-clock me-2"></i>Horarios:</h6>
                      <div 
                        id="business-hours-info"
                        dangerouslySetInnerHTML={{ __html: formatBusinessHoursForInfo(businessHours) }}
                      />
                    </div>
                    <div className="d-grid">
                      <a 
                        href="https://www.google.com/maps/dir//Plaza+Johnson,+Av.+Josefa+Ortiz+de+Dom%C3%ADnguez+1993,+Independencia,+22055+Tijuana,+B.C.,+Mexico" 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn btn-success"
                      >
                        <i className="fas fa-directions me-2"></i>Cómo llegar
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="container">
          <div className="text-center mb-5">
            <p className="section-subtitle text-white">Testimonios</p>
            <h2 className="text-white">Lo que dicen nuestros pacientes</h2>
            <p className="lead text-white-50">La satisfacción de nuestros pacientes es nuestra mayor recompensa</p>
          </div>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="testimonial-card text-center">
                <div className="mb-3">
                  <i className="fas fa-quote-left fa-2x text-white-50"></i>
                </div>
                <p className="text-white mb-3">"Excelente servicio y atención personalizada. El Dr. Rocha realmente se preocupa por sus pacientes."</p>
                <div className="d-flex justify-content-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <i key={i} className="fas fa-star text-warning"></i>
                  ))}
                </div>
                <strong className="text-white">– Juan P.</strong>
              </div>
            </div>
            <div className="col-md-4">
              <div className="testimonial-card text-center">
                <div className="mb-3">
                  <i className="fas fa-quote-left fa-2x text-white-50"></i>
                </div>
                <p className="text-white mb-3">"Mi espalda mejoró muchísimo en solo 2 sesiones. Técnicas modernas y efectivas."</p>
                <div className="d-flex justify-content-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <i key={i} className="fas fa-star text-warning"></i>
                  ))}
                </div>
                <strong className="text-white">– Mariana L.</strong>
              </div>
            </div>
            <div className="col-md-4">
              <div className="testimonial-card text-center">
                <div className="mb-3">
                  <i className="fas fa-quote-left fa-2x text-white-50"></i>
                </div>
                <p className="text-white mb-3">"¡Muy recomendable! Profesionalismo y calidez humana en cada consulta."</p>
                <div className="d-flex justify-content-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <i key={i} className="fas fa-star text-warning"></i>
                  ))}
                </div>
                <strong className="text-white">– Carlos R.</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Image Gallery */}
      <section className="container py-5">
        <div className="text-center mb-5">
          <p className="section-subtitle">Instalaciones</p>
          <h2>Nuestro Centro Quiropráctico</h2>
          <p className="lead">Espacios diseñados para tu comodidad y bienestar</p>
        </div>
        <div className="row g-4 gallery">
          <div className="col-md-4">
            <div className="card h-100 border-0 shadow">
              <img src="https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Sala de Consulta" className="card-img-top" style={{ height: "250px", objectFit: "cover" }} />
              <div className="card-body">
                <h5 className="card-title">Sala de Consulta</h5>
                <p className="card-text">Espacios modernos y cómodos para evaluaciones personalizadas.</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100 border-0 shadow">
              <img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Sala de Tratamiento" className="card-img-top" style={{ height: "250px", objectFit: "cover" }} />
              <div className="card-body">
                <h5 className="card-title">Sala de Tratamiento</h5>
                <p className="card-text">Equipos de última generación para tratamientos efectivos.</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100 border-0 shadow">
              <img src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Área de Recepción" className="card-img-top" style={{ height: "250px", objectFit: "cover" }} />
              <div className="card-body">
                <h5 className="card-title">Área de Recepción</h5>
                <p className="card-text">Ambiente cálido y profesional desde tu llegada.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="container">
          <div className="row">
            <div className="col-md-4 mb-3">
              <h5 className="text-white">{clinicName}</h5>
              <p className="text-white-50" id="clinic-description">
                {clinicDescription}
              </p>
            </div>
            <div className="col-md-4 mb-3">
              <h6 className="text-white">Contacto</h6>
              <p className="text-white-50 mb-1">
                <i className="fas fa-map-marker-alt me-2"></i>
                {clinicAddress}
              </p>
              <p className="text-white-50 mb-1">
                <i className="fas fa-phone me-2"></i>
                {clinicPhone}
              </p>
              <p className="text-white-50">
                <i className="fas fa-envelope me-2"></i>
                {clinicEmail}
              </p>
            </div>
            <div className="col-md-4 mb-3">
              <h6 className="text-white">Horarios</h6>
              <div id="business-hours-footer">
                {formatBusinessHoursForFooter(businessHours)}
              </div>
            </div>
          </div>
          <hr className="my-4" style={{ borderColor: "rgba(255,255,255,0.1)" }} />
          <div className="text-center">
            <small className="text-white-50">&copy; 2025 {clinicName}. Todos los derechos reservados.</small>
          </div>
        </div>
      </footer>
    </>
  );
}