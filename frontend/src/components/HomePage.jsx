// frontend/src/pages/HomePage.jsx
import React, { useEffect, useState } from "react";
import "../style/style.css";

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
        localStorage.getItem("token") || localStorage.getItem("user_token");
      setIsLoggedIn(!!token);
    };
    checkAuth();

    const onStorageChange = () => checkAuth();
    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, []);

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

  const handleRegister = () => {
    window.location.href = "/register";
  };

  const handleLogin = () => {
    window.location.href = "/login";
  };

  const handleGuest = () => {
    window.location.href = "/appointments/new";
  };

  const handleBookAppointment = () => {
    window.location.href = "/appointments/new";
  };

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
                <h1 className="display-4 fw-bold">Quirofísicos Rocha</h1>
                <p className="lead">
                  Recupera tu bienestar físico con cuidado quiropráctico de
                  confianza en Tijuana
                </p>
                <div className="mt-4 d-flex justify-content-center flex-wrap gap-3">
                  {!isLoggedIn && (
                    <>
                      <button
                        onClick={handleRegister}
                        className="btn btn-success"
                      >
                        <i className="fas fa-user-plus me-2" />
                        Registrarse
                      </button>
                      <button
                        onClick={handleGuest}
                        className="btn btn-outline-light"
                      >
                        <i className="fas fa-user me-2" />
                        Continuar como Invitado
                      </button>
                      <button
                        onClick={handleLogin}
                        className="btn btn-outline-light"
                      >
                        <i className="fas fa-sign-in-alt me-2" />
                        Iniciar Sesión
                      </button>
                    </>
                  )}
                  <button
                    id="bABtn"
                    onClick={handleBookAppointment}
                    className="btn btn-warning"
                    style={{
                      display: isLoggedIn ? "inline-flex" : "none",
                    }}
                  >
                    <i className="fas fa-calendar-plus me-2" />
                    Agendar Cita
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Announcements Banner */}
      {announcements.length > 0 && (
        <div
          id="announcements-banner"
          className="announcements-container"
        >
          {announcements.map((announcement) => {
            const typeClass = getAnnouncementTypeClass(
              announcement.announcement_type
            );
            const icon = getAnnouncementIcon(
              announcement.announcement_type
            );
            const priorityClass =
              announcement.priority === "high" ||
              announcement.priority === "urgent"
                ? "announcement-priority-high"
                : "";

            return (
              <div
                key={announcement.id}
                className={`announcement-banner ${typeClass} ${priorityClass}`}
                data-id={announcement.id}
              >
                <div className="announcement-content">
                  <div className="announcement-text">
                    <i
                      className={`fas ${icon} announcement-icon`}
                    />
                    <div>
                      <div className="announcement-title">
                        {announcement.title}
                      </div>
                      <div className="announcement-message">
                        {announcement.message}
                      </div>
                      {announcement.end_date && (
                        <div className="announcement-dates">
                          Válido hasta:{" "}
                          {formatDate(announcement.end_date)}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    className="announcement-close"
                    aria-label="Cerrar anuncio"
                    onClick={() =>
                      handleDismissAnnouncement(announcement.id)
                    }
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Services Section */}
      <section
        id="servicios"
        className="services-section"
      >
        <div className="container">
          <div className="text-center mb-5">
            <p className="section-subtitle">Nuestros Servicios</p>
            <h2>
              Tratamientos Quiroprácticos Especializados
            </h2>
            <p className="lead">
              Ofrecemos una amplia gama de servicios para mejorar tu salud y
              bienestar
            </p>
          </div>
          <div className="row g-4">
            <ServiceCard
              icon="fa-spine"
              title="Ajustes Quiroprácticos"
              text="Realineación de la columna vertebral para mejorar la función del sistema nervioso y reducir el dolor."
            />
            <ServiceCard
              icon="fa-user-md"
              title="Terapia de Tejidos Blandos"
              text="Técnicas especializadas para tratar músculos, ligamentos y tendones, promoviendo la curación natural."
            />
            <ServiceCard
              icon="fa-running"
              title="Rehabilitación Deportiva"
              text="Tratamiento especializado para lesiones deportivas y programas de prevención para atletas."
            />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="about-image" />
            </div>
            <div className="col-lg-6">
              <div className="ps-lg-4">
                <p className="section-subtitle">Acerca de Nosotros</p>
                <h2>
                  Experiencia y Dedicación en Quiropráctica
                </h2>
                <p className="lead">
                  Con más de 10 años de experiencia, el Dr. Rocha se especializa
                  en tratamientos quiroprácticos innovadores que combinan
                  técnicas tradicionales con métodos modernos.
                </p>
                <div className="row g-3 mt-4">
                  <AboutFeature
                    icon="fa-check-circle"
                    text="Más de 1000 pacientes tratados"
                  />
                  <AboutFeature
                    icon="fa-award"
                    text="Certificaciones internacionales"
                  />
                  <AboutFeature
                    icon="fa-heart"
                    text="Atención personalizada"
                  />
                  <AboutFeature
                    icon="fa-clock"
                    text="Horarios flexibles"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <LocationSection
        businessHours={businessHours}
        clinicSettings={clinicSettings}
      />

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="container">
          <div className="text-center mb-5">
            <p className="section-subtitle text-white">Testimonios</p>
            <h2 className="text-white">
              Lo que dicen nuestros pacientes
            </h2>
            <p className="lead text-white-50">
              La satisfacción de nuestros pacientes es nuestra mayor recompensa
            </p>
          </div>
          <div className="row g-4">
            <TestimonialCard
              text="Excelente servicio y atención personalizada. El Dr. Rocha realmente se preocupa por sus pacientes."
              author="Juan P."
            />
            <TestimonialCard
              text="Mi espalda mejoró muchísimo en solo 2 sesiones. Técnicas modernas y efectivas."
              author="Mariana L."
            />
            <TestimonialCard
              text="¡Muy recomendable! Profesionalismo y calidez humana en cada consulta."
              author="Carlos R."
            />
          </div>
        </div>
      </section>

      {/* Image Gallery – Installations */}
      <section className="container py-5">
        <div className="text-center mb-5">
          <p className="section-subtitle">Instalaciones</p>
          <h2>Nuestro Centro Quiropráctico</h2>
          <p className="lead">
            Espacios diseñados para tu comodidad y bienestar
          </p>
        </div>
        <div className="row g-4 gallery">
          <GalleryCard
            src="https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            title="Sala de Consulta"
            text="Espacios modernos y cómodos para evaluaciones personalizadas."
          />
          <GalleryCard
            src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            title="Sala de Tratamiento"
            text="Equipos de última generación para tratamientos efectivos."
          />
          <GalleryCard
            src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            title="Área de Recepción"
            text="Ambiente cálido y profesional desde tu llegada."
          />
        </div>
      </section>

      {/* Additional Gallery */}
      <section className="container my-5">
        <h2 className="text-center mb-4">Galería</h2>
        <div className="row g-3 gallery">
          <div className="col-md-4">
            <img
              src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
              alt="Consulta"
              className="img-fluid rounded"
            />
          </div>
          <div className="col-md-4">
            <img
              src="/img/photo2.jpg"
              alt="Tratamiento"
              className="img-fluid rounded"
            />
          </div>
          <div className="col-md-4">
            <img
              src="/img/photo3.jpg"
              alt="Recepción"
              className="img-fluid rounded"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer
        clinicSettings={clinicSettings}
        businessHours={businessHours}
      />
    </>
  );
}

/* =========================
   Helper sub-components
   ========================= */

function AboutFeature({ icon, text }) {
  return (
    <div className="col-sm-6">
      <div className="d-flex align-items-center">
        <i className={`fas ${icon} medical-icon`} />
        <span>{text}</span>
      </div>
    </div>
  );
}

function ServiceCard({ icon, title, text }) {
  return (
    <div className="col-md-4">
      <div className="service-card text-center">
        <div className="service-icon">
          <i className={`fas ${icon}`} />
        </div>
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
    </div>
  );
}

function LocationSection({ businessHours, clinicSettings }) {
  const address =
    clinicSettings?.clinic_address ||
    "Plaza Johnson, Av. Josefa Ortiz de Domínguez 1993, Independencia, 22055 Tijuana, B.C., México";
  const phone = clinicSettings?.clinic_phone || "664-123-4567";

  const mapsSrc =
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3366.2!2d-117.04!3d32.513!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80d948af9b3f9b3f%3A0x123456789abcdef0!2sPlaza%20Johnson%2C%20Tijuana%2C%20Mexico!5e0!3m2!1sen!2sus!4v1642089600000!5m2!1sen!2sus";

  return (
    <section id="contacto-section" className="location-section">
      <div className="container">
        <div className="text-center mb-5">
          <p className="section-subtitle">Ubicación</p>
          <h2>Visítanos en Tijuana</h2>
          <p className="lead">
            Estamos ubicados en Plaza Johnson, fácil acceso y estacionamiento
            disponible
          </p>
        </div>
        <div className="row align-items-center">
          <div className="col-lg-8">
            <div className="map-container">
              <div className="ratio ratio-16x9">
                <div id="map-container">
                  <iframe
                    id="google-map"
                    src={mapsSrc}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Google Map"
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
                    <i
                      className="fas fa-map-marker-alt medical-icon"
                      id="contacto"
                    />
                    Información de Contacto
                  </h4>
                  <div className="mb-3">
                    <h6>
                      <i className="fas fa-location-dot me-2" />
                      Dirección:
                    </h6>
                    <p
                      className="mb-0"
                      style={{ whiteSpace: "pre-line" }}
                    >
                      {address}
                    </p>
                  </div>
                  <div className="mb-3">
                    <h6>
                      <i className="fas fa-phone me-2" />
                      Teléfono:
                    </h6>
                    <p className="mb-0">{phone}</p>
                  </div>
                  <div className="mb-4">
                    <h6>
                      <i className="fas fa-clock me-2" />
                      Horarios:
                    </h6>
                    <div id="business-hours-info">
                      <BusinessHoursInfo
                        businessHours={businessHours}
                      />
                    </div>
                  </div>
                  <div className="d-grid">
                    <a
                      href="https://www.google.com/maps/dir//Plaza+Johnson,+Av.+Josefa+Ortiz+de+Dom%C3%ADnguez+1993,+Independencia,+22055+Tijuana,+B.C.,+Mexico"
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-success"
                    >
                      <i className="fas fa-directions me-2" />
                      Cómo llegar
                    </a>
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

function BusinessHoursInfo({ businessHours }) {
  if (
    !Array.isArray(businessHours) ||
    businessHours.length === 0
  ) {
    return <p className="mb-0">Cargando horarios...</p>;
  }

  const openDays = businessHours.filter((d) => d.is_open);
  if (openDays.length === 0) {
    return <p className="mb-0">Actualmente cerrado</p>;
  }

  const grouped = formatBusinessHoursForInfo(businessHours);
  return (
    <p
      className="mb-0"
      dangerouslySetInnerHTML={{ __html: grouped }}
    />
  );
}

function Footer({ clinicSettings, businessHours }) {
  const name = clinicSettings?.clinic_name || "Quirofísicos Rocha";
  const address =
    clinicSettings?.clinic_address || "Plaza Johnson, Tijuana, B.C.";
  const phone = clinicSettings?.clinic_phone || "664-123-4567";
  const email =
    clinicSettings?.clinic_email || "info@quirofisicosrocha.com";
  const description = clinicSettings?.clinic_description || "";

  return (
    <footer>
      <div className="container">
        <div className="row">
          <div className="col-md-4 mb-3">
            <h5 className="text-white">{name}</h5>
            <p className="text-white-50" id="clinic-description">
              {description}
            </p>
          </div>
          <div className="col-md-4 mb-3">
            <h6 className="text-white">Contacto</h6>
            <p className="text-white-50 mb-1">
              <i className="fas fa-map-marker-alt me-2" />
              {address}
            </p>
            <p className="text-white-50 mb-1">
              <i className="fas fa-phone me-2" />
              {phone}
            </p>
            <p className="text-white-50">
              <i className="fas fa-envelope me-2" />
              <a
                href={`mailto:${email}`}
                className="text-white-50"
              >
                {email}
              </a>
            </p>
          </div>
          <div className="col-md-4 mb-3">
            <h6 className="text-white">Horarios</h6>
            <div id="business-hours-footer">
              <BusinessHoursFooter
                businessHours={businessHours}
              />
            </div>
          </div>
        </div>
        <hr
          className="my-4"
          style={{ borderColor: "rgba(255,255,255,0.1)" }}
        />
        <div className="text-center">
          <small className="text-white-50">
            &copy; {new Date().getFullYear()} Quirofísicos Rocha. Todos los
            derechos reservados.
          </small>
        </div>
      </div>
    </footer>
  );
}

function BusinessHoursFooter({ businessHours }) {
  if (
    !Array.isArray(businessHours) ||
    businessHours.length === 0
  ) {
    return <p className="text-white-50">Cargando horarios...</p>;
  }

  const html = formatBusinessHoursForFooter(businessHours);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function TestimonialCard({ text, author }) {
  return (
    <div className="col-md-4">
      <div className="testimonial-card text-center">
        <div className="mb-3">
          <i className="fas fa-quote-left fa-2x text-white-50" />
        </div>
        <p className="text-white mb-3">{text}</p>
        <div className="d-flex justify-content-center mb-2">
          {[...Array(5)].map((_, i) => (
            <i key={i} className="fas fa-star text-warning" />
          ))}
        </div>
        <strong className="text-white">– {author}</strong>
      </div>
    </div>
  );
}

function GalleryCard({ src, title, text }) {
  return (
    <div className="col-md-4">
      <div className="card h-100 border-0 shadow">
        <img
          src={src}
          alt={title}
          className="card-img-top"
          style={{ height: 250, objectFit: "cover" }}
        />
        <div className="card-body">
          <h5 className="card-title">{title}</h5>
          <p className="card-text">{text}</p>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Utility functions
   ========================= */

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getAnnouncementTypeClass(type) {
  const classes = {
    info: "info",
    warning: "warning",
    success: "success",
    danger: "danger",
  };
  return classes[type] || "info";
}

function getAnnouncementIcon(type) {
  const icons = {
    info: "fa-info-circle",
    warning: "fa-exclamation-triangle",
    success: "fa-check-circle",
    danger: "fa-exclamation-circle",
  };
  return icons[type] || "fa-info-circle";
}

function formatBusinessHoursForInfo(businessHours) {
  if (!Array.isArray(businessHours)) {
    console.error(
      "formatBusinessHoursForInfo: businessHours is not an array",
      businessHours
    );
    return "<p class='mb-0'>Actualmente cerrado</p>";
  }

  const openDays = businessHours.filter((day) => day.is_open);
  if (openDays.length === 0) {
    return "<p class='mb-0'>Actualmente cerrado</p>";
  }

  const groups = [];
  let currentGroup = null;

  const dayOrder = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const dayNames = {
    Monday: "Lunes",
    Tuesday: "Martes",
    Wednesday: "Miércoles",
    Thursday: "Jueves",
    Friday: "Viernes",
    Saturday: "Sábado",
    Sunday: "Domingo",
  };

  dayOrder.forEach((day) => {
    const dayData = businessHours.find((h) => h.day_of_week === day);

    if (dayData && dayData.is_open) {
      const timeString = `${dayData.open_time} - ${dayData.close_time}`;

      if (currentGroup && currentGroup.time === timeString) {
        currentGroup.days.push(dayNames[day]);
      } else {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = {
          days: [dayNames[day]],
          time: timeString,
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

  const lines = groups.map((group) => {
    const daysText =
      group.days.length === 1
        ? group.days[0]
        : group.days.length === 2
        ? group.days.join(" y ")
        : `${group.days.slice(0, -1).join(", ")} y ${
            group.days[group.days.length - 1]
          }`;

    return `${daysText}<br>${group.time}`;
  });

  return `<p class='mb-0'>${lines.join("<br><br>")}</p>`;
}

function formatBusinessHoursForFooter(businessHours) {
  const dayNames = {
    Monday: "Lunes",
    Tuesday: "Martes",
    Wednesday: "Miércoles",
    Thursday: "Jueves",
    Friday: "Viernes",
    Saturday: "Sábado",
    Sunday: "Domingo",
  };

  if (!Array.isArray(businessHours)) {
    console.error(
      "formatBusinessHoursForFooter: businessHours is not an array",
      businessHours
    );
    return "";
  }

  const formatTime = (t) => (t ? t.replace(/:00$/, "") : "");

  const lines = businessHours.map((day) => {
    const dayName = dayNames[day.day_of_week];
    if (day.is_open) {
      return `<p class="text-white-50 mb-1">${dayName}: ${formatTime(
        day.open_time
      )} - ${formatTime(day.close_time)}</p>`;
    } else {
      return `<p class="text-white-50 mb-1">${dayName}: Cerrado</p>`;
    }
  });

  return lines.join("");
}