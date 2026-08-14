/**
 * Footer.jsx — React replacement for the static <footer> + script.js's
 * loadClinicSettingsFooter()/loadBusinessHours() footer-population logic.
 */
import { useEffect, useState } from 'react';
import { clinicService } from '../api/clinicService';

const DAY_NAMES = {
  Monday: 'Lunes',
  Tuesday: 'Martes',
  Wednesday: 'Miércoles',
  Thursday: 'Jueves',
  Friday: 'Viernes',
  Saturday: 'Sábado',
  Sunday: 'Domingo',
};

// Backend day-of-week casing is inconsistent across endpoints (some routes store/compare
// lowercase, others expect capitalized). Normalize before any lookup/comparison.
const normalizeDay = (d) => (typeof d === 'string' && d.length ? d[0].toUpperCase() + d.slice(1).toLowerCase() : d);
// Business hours time strings may come back as 'HH:MM' or 'HH:MM:SS' depending on data source.
const stripSeconds = (t) => (typeof t === 'string' ? t.replace(/^(\d{1,2}:\d{2}):\d{2}$/, '$1') : t || '');

function formatFooterHours(businessHours) {
  if (!Array.isArray(businessHours)) return [];
  return businessHours.map((day) => {
    const dayKey = normalizeDay(day.dayOfWeek);
    return {
      key: dayKey,
      label: DAY_NAMES[dayKey] || day.dayOfWeek,
      text: day.isOpen ? `${stripSeconds(day.openTime)} - ${stripSeconds(day.closeTime)}` : 'Cerrado',
    };
  });
}

export default function Footer() {
  const [settings, setSettings] = useState({
    clinic_name: 'Quirofísicos Rocha',
    clinic_address: 'Plaza Johnson, Tijuana, B.C.',
    clinic_phone: '664-123-4567',
    clinic_email: 'info@quirofisicosrocha.com',
    clinic_description: '',
  });
  const [hours, setHours] = useState([]);

  useEffect(() => {
    clinicService
      .getSettings()
      .then((data) => data && setSettings((prev) => ({ ...prev, ...data })))
      .catch(() => {});

    clinicService
      .getBusinessHours()
      .then((data) => {
        const list = Array.isArray(data?.businessHours)
          ? data.businessHours
          : Array.isArray(data)
          ? data
          : [];
        setHours(list);
      })
      .catch(() => {});
  }, []);

  const footerHours = formatFooterHours(hours);

  return (
    <footer>
      <div className="container">
        <div className="row">
          <div className="col-md-4 mb-3">
            <h5 className="text-white">{settings.clinic_name}</h5>
            <p className="text-white-50">{settings.clinic_description}</p>
          </div>
          <div className="col-md-4 mb-3">
            <h6 className="text-white">Contacto</h6>
            <p className="text-white-50 mb-1">
              <i className="fas fa-map-marker-alt me-2" />
              {settings.clinic_address}
            </p>
            <p className="text-white-50 mb-1">
              <i className="fas fa-phone me-2" />
              {settings.clinic_phone}
            </p>
            <p className="text-white-50">
              <i className="fas fa-envelope me-2" />
              {settings.clinic_email}
            </p>
          </div>
          <div className="col-md-4 mb-3">
            <h6 className="text-white">Horarios</h6>
            {footerHours.length > 0 ? (
              footerHours.map((day) => (
                <p className="text-white-50 mb-1" key={day.key}>
                  {day.label}: {day.text}
                </p>
              ))
            ) : (
              <>
                <p className="text-white-50 mb-1">Lunes - Viernes: 9:00 AM - 6:00 PM</p>
                <p className="text-white-50 mb-1">Sábados: 9:00 AM - 2:00 PM</p>
                <p className="text-white-50">Domingos: Cerrado</p>
              </>
            )}
          </div>
        </div>
        <hr className="my-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <div className="text-center">
          <small className="text-white-50">&copy; {new Date().getFullYear()} Quirofísicos Rocha. Todos los derechos reservados.</small>
        </div>
      </div>
    </footer>
  );
}
