/**
 * HomePage.jsx — React port of frontendNew/public/index.html + script.js + maps.js.
 * Sections: hero, announcements banner, services, about, location/map, testimonials, gallery.
 * Footer now lives in components/Footer.jsx (rendered by Layout), business hours there too.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { announcementService } from '../api/announcementService';
import { clinicService } from '../api/clinicService';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_NAMES = {
  Monday: 'Lunes',
  Tuesday: 'Martes',
  Wednesday: 'Miércoles',
  Thursday: 'Jueves',
  Friday: 'Viernes',
  Saturday: 'Sábado',
  Sunday: 'Domingo',
};

function groupBusinessHours(businessHours) {
  if (!Array.isArray(businessHours) || businessHours.length === 0) return null;
  const openDays = businessHours.filter((day) => day.is_open);
  if (openDays.length === 0) return null;

  const groups = [];
  let current = null;

  DAY_ORDER.forEach((day) => {
    const dayData = businessHours.find((h) => h.day_of_week === day);
    if (dayData && dayData.is_open) {
      const timeString = `${dayData.open_time} - ${dayData.close_time}`;
      if (current && current.time === timeString) {
        current.days.push(DAY_NAMES[day]);
      } else {
        if (current) groups.push(current);
        current = { days: [DAY_NAMES[day]], time: timeString };
      }
    } else if (current) {
      groups.push(current);
      current = null;
    }
  });
  if (current) groups.push(current);

  return groups.map((group) => {
    const daysText =
      group.days.length === 1
        ? group.days[0]
        : group.days.length === 2
        ? group.days.join(' y ')
        : `${group.days.slice(0, -1).join(', ')} y ${group.days[group.days.length - 1]}`;
    return { days: daysText, time: group.time };
  });
}

const SERVICES = [
  {
    icon: 'fa-spine',
    title: 'Ajustes Quiroprácticos',
    text: 'Realineación de la columna vertebral para mejorar la función del sistema nervioso y reducir el dolor.',
  },
  {
    icon: 'fa-user-md',
    title: 'Terapia de Tejidos Blandos',
    text: 'Técnicas especializadas para tratar músculos, ligamentos y tendones, promoviendo la curación natural.',
  },
  {
    icon: 'fa-running',
    title: 'Rehabilitación Deportiva',
    text: 'Tratamiento especializado para lesiones deportivas y programas de prevención para atletas.',
  },
];

const TESTIMONIALS = [
  { text: 'Excelente servicio y atención personalizada. El Dr. Rocha realmente se preocupa por sus pacientes.', author: 'Juan P.' },
  { text: 'Mi espalda mejoró muchísimo en solo 2 sesiones. Técnicas modernas y efectivas.', author: 'Mariana L.' },
  { text: '¡Muy recomendable! Profesionalismo y calidez humana en cada consulta.', author: 'Carlos R.' },
];

const GALLERY = [
  {
    src: 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    title: 'Sala de Consulta',
    text: 'Espacios modernos y cómodos para evaluaciones personalizadas.',
  },
  {
    src: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    title: 'Sala de Tratamiento',
    text: 'Equipos de última generación para tratamientos efectivos.',
  },
  {
    src: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    title: 'Área de Recepción',
    text: 'Ambiente cálido y profesional desde tu llegada.',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [announcements, setAnnouncements] = useState([]);
  const [businessHours, setBusinessHours] = useState([]);
  const [contact, setContact] = useState({
    clinic_address: 'Plaza Johnson, Av. Josefa Ortiz de Domínguez 1993, Independencia, 22055 Tijuana, B.C., México',
    clinic_phone: '664-123-4567',
  });

  useEffect(() => {
    announcementService
      .getActive()
      .then((data) => setAnnouncements(Array.isArray(data) ? data : []))
      .catch(() => {});

    clinicService
      .getSettings()
      .then((data) => data && setContact((prev) => ({ ...prev, ...data })))
      .catch(() => {});

    clinicService
      .getBusinessHours()
      .then((data) => {
        const list = Array.isArray(data?.business_hours)
          ? data.business_hours
          : Array.isArray(data?.businessHours)
          ? data.businessHours
          : [];
        setBusinessHours(list);
      })
      .catch(() => {});
  }, []);

  const infoHours = useMemo(() => groupBusinessHours(businessHours), [businessHours]);

  const dismissAnnouncement = (id) => {
    setAnnouncements((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <>
      <header className="hero text-center">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-8 mx-auto">
              <div className="fade-in">
                <p className="section-subtitle">Centro Quiropráctico Profesional</p>
                <h1>Quirofísicos Rocha</h1>
                <p className="lead">Recupera tu bienestar físico con cuidado quiropráctico de confianza en Tijuana</p>
                <div className="mt-4 d-flex justify-content-center flex-wrap gap-3">
                  {!isLoggedIn && (
                    <>
                      <button className="btn btn-success" onClick={() => navigate('/register')} data-testid="button-register">
                        <i className="fas fa-user-plus me-2" />
                        Registrarse
                      </button>
                      <button className="btn btn-outline-light" onClick={() => navigate('/appointment')} data-testid="button-guest">
                        <i className="fas fa-user me-2" />
                        Continuar como Invitado
                      </button>
                      <button className="btn btn-outline-light" onClick={() => navigate('/login')} data-testid="button-login">
                        <i className="fas fa-sign-in-alt me-2" />
                        Iniciar Sesión
                      </button>
                    </>
                  )}
                  {isLoggedIn && (
                    <button className="btn btn-warning" onClick={() => navigate('/appointment')} data-testid="button-book-appointment">
                      <i className="fas fa-calendar-plus me-2" />
                      Agendar Cita
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {announcements.length > 0 && (
        <div className="announcements-container" data-testid="container-announcements">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`announcement-banner ${announcement.announcement_type || 'info'} ${
                announcement.priority === 'high' || announcement.priority === 'urgent' ? 'announcement-priority-high' : ''
              }`}
              data-testid={`banner-announcement-${announcement.id}`}
            >
              <div className="announcement-content">
                <div className="announcement-text">
                  <div>
                    <div className="announcement-title">{announcement.title}</div>
                    <div className="announcement-message">{announcement.message}</div>
                    {announcement.end_date && (
                      <div className="announcement-dates">Válido hasta: {formatDate(announcement.end_date)}</div>
                    )}
                  </div>
                </div>
                <button
                  className="announcement-close"
                  aria-label="Cerrar anuncio"
                  onClick={() => dismissAnnouncement(announcement.id)}
                  data-testid={`button-dismiss-announcement-${announcement.id}`}
                >
                  <i className="fas fa-times" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <section id="servicios" className="services-section">
        <div className="container">
          <div className="text-center mb-5">
            <p className="section-subtitle">Nuestros Servicios</p>
            <h2>Tratamientos Quiroprácticos Especializados</h2>
            <p className="lead text-muted">Ofrecemos una amplia gama de servicios para mejorar tu salud y bienestar</p>
          </div>
          <div className="row g-4">
            {SERVICES.map((service) => (
              <div className="col-md-4" key={service.title}>
                <div className="service-card text-center">
                  <div className="service-icon">
                    <i className={`fas ${service.icon}`} />
                  </div>
                  <h4>{service.title}</h4>
                  <p className="text-muted">{service.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="about-image" />
            </div>
            <div className="col-lg-6">
              <div className="ps-lg-4">
                <p className="section-subtitle">Acerca de Nosotros</p>
                <h2>Experiencia y Dedicación en Quiropráctica</h2>
                <p className="lead text-muted">
                  Con más de 10 años de experiencia, el Dr. Rocha se especializa en tratamientos quiroprácticos
                  innovadores que combinan técnicas tradicionales con métodos modernos.
                </p>
                <div className="row g-3 mt-4">
                  <div className="col-sm-6">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-check-circle medical-icon" />
                      <span>Más de 1000 pacientes tratados</span>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-award medical-icon" />
                      <span>Certificaciones internacionales</span>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-heart medical-icon" />
                      <span>Atención personalizada</span>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-clock medical-icon" />
                      <span>Horarios flexibles</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="contacto-section" className="location-section">
        <div className="container">
          <div className="text-center mb-5">
            <p className="section-subtitle">Ubicación</p>
            <h2>Visítanos en Tijuana</h2>
            <p className="lead text-muted">Estamos ubicados en Plaza Johnson, fácil acceso y estacionamiento disponible</p>
          </div>
          <div className="row align-items-center g-4">
            <div className="col-lg-8">
              <div className="map-container">
                <div className="ratio ratio-16x9">
                  <iframe
                    title="Ubicación Quirofísicos Rocha"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3366.2!2d-117.04!3d32.513!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80d948af9b3f9b3f%3A0x123456789abcdef0!2sPlaza%20Johnson%2C%20Tijuana%2C%20Mexico!5e0!3m2!1sen!2sus!4v1642089600000!5m2!1sen!2sus"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="card border-0 shadow-lg">
                <div className="card-body p-4">
                  <h4 className="card-title mb-4">
                    <i className="fas fa-map-marker-alt medical-icon" />
                    Información de Contacto
                  </h4>
                  <div className="mb-3">
                    <h6>
                      <i className="fas fa-location-dot me-2" />
                      Dirección:
                    </h6>
                    <p className="mb-0">{contact.clinic_address}</p>
                  </div>
                  <div className="mb-3">
                    <h6>
                      <i className="fas fa-phone me-2" />
                      Teléfono:
                    </h6>
                    <p className="mb-0">{contact.clinic_phone}</p>
                  </div>
                  <div className="mb-4">
                    <h6>
                      <i className="fas fa-clock me-2" />
                      Horarios:
                    </h6>
                    <div>
                      {infoHours ? (
                        infoHours.map((item, idx) => (
                          <p className="mb-2" key={idx}>
                            {item.days}
                            <br />
                            {item.time}
                          </p>
                        ))
                      ) : (
                        <p className="mb-0">Cargando horarios...</p>
                      )}
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
      </section>

      <section className="testimonials-section">
        <div className="container">
          <div className="text-center mb-5">
            <p className="section-subtitle text-white">Testimonios</p>
            <h2 className="text-white">Lo que dicen nuestros pacientes</h2>
            <p className="lead text-white-50">La satisfacción de nuestros pacientes es nuestra mayor recompensa</p>
          </div>
          <div className="row g-4">
            {TESTIMONIALS.map((testimonial) => (
              <div className="col-md-4" key={testimonial.author}>
                <div className="testimonial-card text-center">
                  <div className="mb-3">
                    <i className="fas fa-quote-left fa-2x text-white-50" />
                  </div>
                  <p className="text-white mb-3">&ldquo;{testimonial.text}&rdquo;</p>
                  <div className="d-flex justify-content-center mb-2">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <i className="fas fa-star text-warning" key={idx} />
                    ))}
                  </div>
                  <strong className="text-white">– {testimonial.author}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-5">
        <div className="text-center mb-5">
          <p className="section-subtitle">Instalaciones</p>
          <h2>Nuestro Centro Quiropráctico</h2>
          <p className="lead text-muted">Espacios diseñados para tu comodidad y bienestar</p>
        </div>
        <div className="row g-4">
          {GALLERY.map((item) => (
            <div className="col-md-4" key={item.title}>
              <div className="card h-100 border-0 shadow">
                <img src={item.src} alt={item.title} className="card-img-top" style={{ height: 250, objectFit: 'cover' }} />
                <div className="card-body">
                  <h5 className="card-title">{item.title}</h5>
                  <p className="card-text text-muted">{item.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
