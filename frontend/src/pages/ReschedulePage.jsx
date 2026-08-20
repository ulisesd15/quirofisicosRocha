/**
 * ReschedulePage.jsx — React port of reschedule.html + reschedule.js.
 * Protected route. Loads the appointment from the :id route param, reuses
 * CalendarPicker for the new date/time, and blocks re-selecting the same
 * date+time as the current appointment before submitting the reschedule.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { appointmentService } from '../api/appointmentService';
import CalendarPicker from '../components/CalendarPicker';

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const time = new Date();
  time.setHours(Number(hours), Number(minutes), 0, 0);
  return time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(dateStr) {
  const dateOnly = dateStr.split('T')[0];
  const date = new Date(`${dateOnly}T00:00:00`);
  return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// Normalize a time value to HH:MM so "09:00" and "09:00:00" compare equal.
function normalizeTime(timeStr) {
  return (timeStr || '').slice(0, 5);
}

export default function ReschedulePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // { type, text }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await appointmentService.getById(id);
        if (!mounted) return;
        setAppointment(data);
        setNote(data.note || '');
      } catch (err) {
        if (!mounted) return;
        setLoadError(err.message || 'No se pudo cargar la cita actual.');
        setTimeout(() => navigate('/mis-citas'), 2500);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, navigate]);

  const currentDateISO = useMemo(() => (appointment ? appointment.date.split('T')[0] : null), [appointment]);
  const currentTimeNormalized = useMemo(() => (appointment ? normalizeTime(appointment.time) : null), [appointment]);

  const isSameAsCurrent = useMemo(() => {
    if (!selectedDate || !selectedTime || !currentDateISO) return false;
    return selectedDate === currentDateISO && normalizeTime(selectedTime) === currentTimeNormalized;
  }, [selectedDate, selectedTime, currentDateISO, currentTimeNormalized]);

  const handleSelect = (dateStr, time) => {
    setMessage(null);
    setSelectedDate(dateStr);
    setSelectedTime(time || null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (!selectedDate || !selectedTime) {
      setMessage({ type: 'danger', text: 'Por favor, selecciona una nueva fecha y hora.' });
      return;
    }
    if (isSameAsCurrent) {
      setMessage({ type: 'warning', text: 'Selecciona una fecha u hora diferente a tu cita actual.' });
      return;
    }

    setSubmitting(true);
    try {
      await appointmentService.reschedule(id, { newDate: selectedDate, newTime: selectedTime, note });
      setMessage({ type: 'success', text: '¡Cita reagendada exitosamente! Serás redirigido.' });
      setTimeout(() => navigate('/mis-citas'), 2000);
    } catch (err) {
      setMessage({ type: 'danger', text: err.message || 'Error al reagendar la cita.' });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="services-section">
        <div className="container text-center py-5" data-testid="status-loading-reschedule">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3">Cargando tu cita...</p>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="services-section">
        <div className="container text-center py-5">
          <div className="alert alert-danger d-inline-block" data-testid="text-reschedule-load-error">
            {loadError}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="services-section">
      <div className="container">
        <div className="text-center mb-5">
          <p className="section-subtitle">Reagenda tu cita</p>
          <h2>Reagendar Consulta Quiropráctica</h2>
          <p className="lead">Selecciona una nueva fecha y hora para tu cita</p>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-8">
            {appointment && (
              <div className="alert alert-warning border-0 shadow-sm mb-4" data-testid="text-current-appointment">
                <div className="d-flex align-items-start">
                  <i className="fas fa-calendar-times fa-2x text-warning me-3" />
                  <div>
                    <h5 className="alert-heading mb-2">
                      <i className="fas fa-info-circle me-2" />
                      Cita Actual
                    </h5>
                    <p className="mb-2">
                      {formatDate(appointment.date)} &middot; {formatTime(appointment.time)}
                    </p>
                    <small className="text-muted">
                      <i className="fas fa-exclamation-triangle me-1" />
                      Tu cita actual será cancelada automáticamente cuando confirmes la nueva fecha y hora. Evita
                      seleccionar la misma fecha y hora.
                    </small>
                  </div>
                </div>
              </div>
            )}

            {message && (
              <div className={`alert alert-${message.type} mb-4`} data-testid="text-reschedule-message">
                {message.text}
              </div>
            )}

            <div className="card border-0 shadow-lg">
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <h3 className="mb-2">
                    <i className="fas fa-calendar-alt me-2" />
                    Nueva Cita
                  </h3>
                  <p className="lead">Selecciona tu nueva fecha y hora preferida</p>
                  <div className="alert alert-info d-flex align-items-center text-start mb-3">
                    <i className="fas fa-info-circle me-2" />
                    <small>
                      <strong>Nota:</strong> Las citas deben reagendarse con al menos 30 minutos de anticipación.
                    </small>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <CalendarPicker selectedDate={selectedDate} selectedTime={selectedTime} onSelect={handleSelect} />
                  </div>

                  {isSameAsCurrent && (
                    <div className="alert alert-warning" data-testid="text-same-slot-warning">
                      No puedes seleccionar la misma fecha y hora de tu cita actual. Por favor elige otra.
                    </div>
                  )}

                  <div className="mb-4">
                    <label htmlFor="note" className="form-label">
                      <i className="fas fa-comment me-2" />
                      Notas Adicionales (Opcional)
                    </label>
                    <textarea
                      className="form-control"
                      id="note"
                      rows={3}
                      placeholder="Actualiza el motivo de tu consulta o cualquier información relevante..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      data-testid="input-reschedule-note"
                    />
                  </div>

                  <button
                    className="btn btn-primary w-100"
                    type="submit"
                    disabled={submitting || !selectedDate || !selectedTime || isSameAsCurrent}
                    data-testid="button-confirm-reschedule"
                  >
                    <i className="fas fa-calendar-check me-2" />
                    {submitting ? 'Reagendando...' : 'Confirmar Reagendamiento'}
                  </button>
                </form>

                <div className="text-center mt-4">
                  <p className="mb-0">
                    <Link to="/mis-citas" className="text-decoration-none">
                      <i className="fas fa-arrow-left me-1" />
                      Volver a Mis Citas
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
