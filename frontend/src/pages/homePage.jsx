// src/pages/HomePage.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatBusinessHoursForInfo(businessHours) {
  if (!Array.isArray(businessHours)) {
    return 'Actualmente cerrado';
  }

  const openDays = businessHours.filter((day) => day.is_open);
  if (openDays.length === 0) return 'Actualmente cerrado';

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayNames = {
    Monday: 'Lunes',
    Tuesday: 'Martes',
    Wednesday: 'Miércoles',
    Thursday: 'Jueves',
    Friday: 'Viernes',
    Saturday: 'Sábado',
    Sunday: 'Domingo',
  };

  const groups = [];
  let currentGroup = null;

  dayOrder.forEach((day) => {
    const dayData = businessHours.find((h) => h.day_of_week === day);

    if (dayData && dayData.is_open) {
      const timeString = `${dayData.open_time} - ${dayData.close_time}`;

      if (currentGroup && currentGroup.time === timeString) {
        currentGroup.days.push(dayNames[day]);
      } else {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { days: [dayNames[day]], time: timeString };
      }
    } else if (currentGroup) {
      groups.push(currentGroup);
      currentGroup = null;
    }
  });

  if (currentGroup) groups.push(currentGroup);

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

function formatBusinessHoursForFooter(businessHours) {
  const dayNames = {
    Monday: 'Lunes',
    Tuesday: 'Martes',
    Wednesday: 'Miércoles',
    Thursday: 'Jueves',
    Friday: 'Viernes',
    Saturday: 'Sábado',
    Sunday: 'Domingo',
  };

  if (!Array.isArray(businessHours)) return [];

  return businessHours.map((day) => ({
    dayName: dayNames[day.day_of_week],
    text: day.is_open
      ? `${(day.open_time || '').replace(/:00$/, '')} - ${(day.close_time || '').replace(/:00$/, '')}`
      : 'Cerrado',
  }));
}

export default function HomePage() {
  const navigate = useNavigate();

  const [clinicSettings, setClinicSettings] = useState({
    clinic_name: 'Quirofísicos Rocha',
    clinic_address:
      'Plaza Johnson, Av. Josefa Ortiz de Domínguez 1993, Independencia, 22055 Tijuana, B.C., México',
    clinic_phone: '664-123-4567',
    clinic_email: 'info@quirofisicosrocha.com',
    clinic_description: '',
  });

  const [announcements, setAnnouncements] = useState([]);
  const [businessHours, setBusinessHours] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('user_token');
    setIsLoggedIn(Boolean(token));
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const clinicResponse = await fetch('/api/clinic-settings');
        if (clinicResponse.ok) {
          const clinicData = await clinicResponse.json();
          setClinicSettings((prev) => ({ ...prev, ...clinicData }));
        }
      } catch {}

      try {
        const announcementsResponse = await fetch('/api/announcements/active');
        if (announcementsResponse.ok) {
          const announcementsData = await announcementsResponse.json();
          setAnnouncements(announcementsData || []);
        }
      } catch {}

      try {
        const hoursResponse = await fetch('/api/business-hours');
        if (hoursResponse.ok) {
          const hoursData = await hoursResponse.json();
          const parsed =
            Array.isArray(hoursData.business_hours)
              ? hoursData.business_hours
              : Array.isArray(hoursData.businessHours)
              ? hoursData.businessHours
              : [];
          setBusinessHours(parsed);
        }
      } catch {
        setBusinessHours([
          { day_of_week: 'Monday', is_open: true, open_time: '9:00 AM', close_time: '6:00 PM' },
          { day_of_week: 'Tuesday', is_open: true, open_time: '9:00 AM', close_time: '6:00 PM' },
          { day_of_week: 'Wednesday', is_open: true, open_time: '9:00 AM', close_time: '6:00 PM' },
          { day_of_week: 'Thursday', is_open: true, open_time: '9:00 AM', close_time: '6:00 PM' },
          { day_of_week: 'Friday', is_open: true, open_time: '9:00 AM', close_time: '6:00 PM' },
          { day_of_week: 'Saturday', is_open: true, open_time: '9:00 AM', close_time: '2:00 PM' },
          { day_of_week: 'Sunday', is_open: false, open_time: '', close_time: '' },
        ]);
      }
    };

    loadData();
  }, []);

  const infoHours = useMemo(() => formatBusinessHoursForInfo(businessHours), [businessHours]);
  const footerHours = useMemo(() => formatBusinessHoursForFooter(businessHours), [businessHours]);

  const dismissAnnouncement = (id) => {
    setAnnouncements((prev) => prev.filter((item) => item.id !== id));
    const dismissed = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]');
    if (!dismissed.includes(id)) {
      localStorage.setItem('dismissedAnnouncements', JSON.stringify([...dismissed, id]));
    }
  };

  return (
    <>
      <header className="hero text-center">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-8 mx-auto">
              <div className="fade-in">
                <p className="section-subtitle">Centro Quiropráctico Profesional</p>
                <h1 className="display-4 fw-bold">Quirophisicos Rocha</h1>
                <p className="lead">
                  Recupera tu bienestar físico con cuidado quiropráctico de confianza en Tijuana
                </p>

                <div className="mt-4 d-flex justify-content-center flex-wrap gap-3">
                  {!isLoggedIn && (
                    <>
                      <button className="btn btn-success" onClick={() => navigate('/register')}>
                        Registrarse
                      </button>
                      <button className="btn btn-outline-light" onClick={() => navigate('/appointment')}>
                        Continuar como Invitado
                      </button>
                      <button className="btn btn-outline-light" onClick={() => navigate('/login')}>
                        Iniciar Sesión
                      </button>
                    </>
                  )}

                  {isLoggedIn && (
                    <button className="btn btn-warning" onClick={() => navigate('/appointment')}>
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
        <div className="announcements-container">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`announcement-banner ${announcement.announcement_type || 'info'} ${
                announcement.priority === 'high' || announcement.priority === 'urgent'
                  ? 'announcement-priority-high'
                  : ''
              }`}
            >
              <div className="announcement-content">
                <div className="announcement-text">
                  <div>
                    <div className="announcement-title">{announcement.title}</div>
                    <div className="announcement-message">{announcement.message}</div>
                    {announcement.end_date && (
                      <div className="announcement-dates">
                        Válido hasta: {formatDate(announcement.end_date)}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  className="announcement-close"
                  aria-label="Cerrar anuncio"
                  onClick={() => dismissAnnouncement(announcement.id)}
                >
                  ×
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
            <p className="lead">
              Ofrecemos una amplia gama de servicios para mejorar tu salud y bienestar
            </p>
          </div>
        </div>
      </section>

      <section id="contacto-section" className="location-section">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-4 ms-auto">
              <div className="card border-0 shadow-lg">
                <div className="card-body p-4">
                  <h4 className="card-title mb-4">Información de Contacto</h4>
                  <div className="mb-3">
                    <h6>Dirección:</h6>
                    <p className="mb-0">{clinicSettings.clinic_address}</p>
                  </div>
                  <div className="mb-3">
                    <h6>Teléfono:</h6>
                    <p className="mb-0">{clinicSettings.clinic_phone}</p>
                  </div>
                  <div className="mb-4">
                    <h6>Horarios:</h6>
                    <div>
                      {Array.isArray(infoHours) ? (
                        infoHours.map((item, idx) => (
                          <p className="mb-2" key={idx}>
                            {item.days}
                            <br />
                            {item.time}
                          </p>
                        ))
                      ) : (
                        <p className="mb-0">{infoHours}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container">
          <div className="row">
            <div className="col-md-4 mb-3">
              <h5 className="text-white">{clinicSettings.clinic_name}</h5>
              <p className="text-white-50">{clinicSettings.clinic_description}</p>
            </div>
            <div className="col-md-4 mb-3">
              <h6 className="text-white">Contacto</h6>
              <p className="text-white-50 mb-1">{clinicSettings.clinic_address}</p>
              <p className="text-white-50 mb-1">{clinicSettings.clinic_phone}</p>
              <p className="text-white-50">{clinicSettings.clinic_email}</p>
            </div>
            <div className="col-md-4 mb-3">
              <h6 className="text-white">Horarios</h6>
              {footerHours.map((item, idx) => (
                <p className="text-white-50 mb-1" key={idx}>
                  {item.dayName}: {item.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}