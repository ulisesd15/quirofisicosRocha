// frontend/src/pages/ReschedulePage.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useCalendar } from '../../../hooks/useCalendar';
import WeeklyCalendar from '../calendar/WeeklyCalendar';
import MonthlyCalendar from '../calendar/MonthlyCalendar';
import "../../../style/reschedule.css"

function ReschedulePage() {
  const { isLoggedIn, authHeaders } = useAuth() || {};
  const {
    selectedDate,
    selectDate,
    currentMonth,
    currentYear,
    prevMonth,
    nextMonth,
  } = useCalendar();

  const [appointmentId, setAppointmentId] = useState(null);
  const [currentAppointment, setCurrentAppointment] = useState(null);

  const [view, setView] = useState('week');
  const [selectedDateISO, setSelectedDateISO] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const [timeSlots, setTimeSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null); // { type: 'success'|'danger'|'warning'|'info', message: string }

  // Parse appointment ID from query string (?id=123), matching legacy behavior
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    setAppointmentId(id);

    if (!id) {
      showAlert('ID de cita no encontrado', 'danger');
      setTimeout(() => {
        window.location.href = '/mis-citas';
      }, 2000);
    }
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isLoggedIn === false) {
      window.location.href = '/login';
    }
  }, [isLoggedIn]);

  // Load current appointment when we have ID and auth
  useEffect(() => {
    if (!appointmentId || !isLoggedIn) return;
    const loadCurrentAppointment = async () => {
      try {
        const res = await fetch(`/api/appointments/${appointmentId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(authHeaders || {}),
          },
        });

        if (!res.ok) {
          throw new Error('Error al cargar la cita actual');
        }

        const data = await res.json();
        setCurrentAppointment(data);

        const dateISO = getAppointmentDateISO(data);
        const time = getAppointmentTime(data);

        setSelectedDateISO(dateISO || '');
        setSelectedTime(time ? time.substring(0, 5) : '');

        // Select date in calendar
        if (dateISO) {
          selectDate(new Date(dateISO));
          // Load slots for that date
          await loadTimeSlots(dateISO, data);
        }
      } catch (err) {
        console.error('[Reschedule] loadCurrentAppointment error:', err);
        showAlert('Error cargando la cita actual: ' + err.message, 'danger');
      }
    };

    loadCurrentAppointment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId, isLoggedIn]);

  // Helper: current appointment date/time extraction (matches legacy JS)
  const getAppointmentDate = (apt) =>
    !apt ? null : apt.appointmentDate || apt.date;
  const getAppointmentTime = (apt) =>
    !apt ? null : apt.appointmentTime || apt.time;
  const getAppointmentDateISO = (apt) => {
    const dateStr = getAppointmentDate(apt);
    if (!dateStr) return null;
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    return dateStr;
  };

  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  // Date selection with 90-day limit and "no same date as current" rule
  const handleSelectDate = async (date) => {
    if (!date) return;
    const dayISO = date.toISOString().slice(0, 10);

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    maxDate.setHours(0, 0, 0, 0);

    const requestedDate = new Date(dayISO);
    requestedDate.setHours(0, 0, 0, 0);

    if (requestedDate > maxDate) {
      showAlert(
        'No se puede reagendar con más de 90 días de antelación.',
        'warning'
      );
      return;
    }

    const currentISO = getAppointmentDateISO(currentAppointment);
    if (currentISO && currentISO === dayISO) {
      showAlert(
        'No puedes seleccionar la misma fecha de tu cita actual. Por favor elige una fecha diferente.',
        'warning'
      );
      return;
    }

    selectDate(date);
    setSelectedDateISO(dayISO);
    setSelectedTime(''); // reset time when date changes
    await loadTimeSlots(dayISO, currentAppointment);
  };

  // Load available slots for a date, flagging current appointment time as disabled
  const loadTimeSlots = async (dayISO, appointment) => {
    setLoadingSlots(true);
    setTimeSlots([]);

    try {
      const res = await fetch(`/api/available-slots/${dayISO}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error('Error cargando horarios disponibles');
      }

      const data = await res.json();
      const slots = data.availableSlots || [];

      const currentISO = getAppointmentDateISO(appointment);
      const currentTime = getAppointmentTime(appointment); // "HH:MM:SS"

      const enriched = slots.map((slot) => {
        const isCurrent =
          appointment &&
          currentISO === dayISO &&
          currentTime === `${slot}:00`;

        return {
          time: slot, // "HH:MM"
          isCurrent,
        };
      });

      setTimeSlots(enriched);
    } catch (err) {
      console.error('[Reschedule] loadTimeSlots error:', err);
      showAlert(
        'Error cargando horarios disponibles para esta fecha.',
        'danger'
      );
    } finally {
      setLoadingSlots(false);
    }
  };

  // Time selection handler with "no same time as current" rule
  const handleSelectTime = (slot) => {
    if (!slot || !selectedDateISO || !currentAppointment) return;

    const currentISO = getAppointmentDateISO(currentAppointment);
    const currentTime = getAppointmentTime(currentAppointment); // "HH:MM:SS"

    if (currentISO === selectedDateISO && currentTime === `${slot}:00`) {
      showAlert(
        'No puedes seleccionar la misma hora de tu cita actual. Por favor elige una hora diferente.',
        'warning'
      );
      return;
    }

    setSelectedTime(slot);
  };

  // Submit reschedule POST to /api/appointments/:id/reschedule
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedDateISO || !selectedTime) {
      showAlert('Por favor selecciona fecha y hora', 'danger');
      return;
    }

    const currentISO = getAppointmentDateISO(currentAppointment);
    const currentTime = getAppointmentTime(currentAppointment);

    if (currentISO === selectedDateISO && currentTime === `${selectedTime}:00`) {
      showAlert(
        'No puedes confirmar la misma fecha y hora que tu cita actual.',
        'danger'
      );
      return;
    }

    const noteEl = document.getElementById('note');
    const note = noteEl ? noteEl.value : '';

    setSubmitting(true);

    try {
      const tokenHeader =
        authHeaders && authHeaders.Authorization
          ? authHeaders
          : {
              Authorization:
                'Bearer ' +
                (localStorage.getItem('userToken') ||
                  localStorage.getItem('token') ||
                  ''),
            };

      const res = await fetch(
        `/api/appointments/${appointmentId}/reschedule`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...tokenHeader,
          },
          body: JSON.stringify({
            newDate: selectedDateISO,
            newTime: selectedTime,
            note,
          }),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Error reagendando la cita');
      }

      showAlert('¡Cita reagendada exitosamente!', 'success');

      setTimeout(() => {
        window.location.href = '/mis-citas';
      }, 2000);
    } catch (err) {
      console.error('[Reschedule] submit error:', err);
      showAlert('Error reagendando la cita: ' + err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    Boolean(selectedDateISO && selectedTime && !submitting && currentAppointment);

  const formatTimeAMPM = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour24 = parseInt(hours, 10);
    const hour12 =
      hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const renderCurrentAppointmentInfo = () => {
    if (!currentAppointment) {
      return 'Cargando información de tu cita actual...';
    }

    try {
      const dateStr = getAppointmentDate(currentAppointment);
      const timeStr = getAppointmentTime(currentAppointment);
      const date = new Date(dateStr);
      const formattedDate = date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const formattedTime = formatTimeAMPM(
        timeStr ? timeStr.substring(0, 5) : '00:00'
      );

      return (
        <>
          <strong>Fecha actual:</strong> {formattedDate}
          <br />
          <strong>Hora actual:</strong> {formattedTime}
          <br />
          <strong>Servicio:</strong>{' '}
          {currentAppointment.serviceType || 'Consulta General'}
          <br />
        </>
      );
    } catch (err) {
      console.error('Error displaying appointment info:', err);
      return 'Error mostrando información de la cita';
    }
  };

  return (
    <body className="reschedule-page">
      {/* Top-right alert, similar to showNotification */}
      {alert && (
        <div
          className="position-fixed top-0 end-0 p-3"
          style={{ zIndex: 9999 }}
        >
          <div
            className={`alert alert-${
              alert.type === 'danger'
                ? 'danger'
                : alert.type === 'success'
                ? 'success'
                : alert.type === 'warning'
                ? 'warning'
                : 'info'
            } alert-dismissible fade show`}
            role="alert"
          >
            {alert.message}
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={() => setAlert(null)}
            />
          </div>
        </div>
      )}

      <section className="services-section">
        <div className="container">
          <div className="text-center mb-5">
            <p className="section-subtitle">Reagenda tu cita</p>
            <h2>Reagendar Consulta Quiropráctica</h2>
            <p className="lead">
              Selecciona una nueva fecha y hora para tu cita
            </p>
          </div>

          <div className="row justify-content-center">
            <div className="col-lg-8">
              {/* Current Appointment Alert */}
              <div
                className="alert alert-warning border-0 shadow-sm mb-4"
                id="currentAppointmentAlert"
              >
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <i className="fas fa-calendar-times fa-2x text-warning" />
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h5 className="alert-heading mb-2">
                      <i className="fas fa-info-circle me-2" />
                      Cita Actual
                    </h5>
                    <p className="mb-2" id="currentAppointmentInfo">
                      {renderCurrentAppointmentInfo()}
                    </p>
                    <small className="text-muted">
                      <i className="fas fa-exclamation-triangle me-1" />
                      Tu cita actual será cancelada automáticamente cuando
                      confirmes la nueva fecha y hora. Evita seleccionar la
                      misma fecha y hora.
                    </small>
                  </div>
                </div>
              </div>

              <div className="card border-0 shadow-lg">
                <div className="card-body">
                  <div className="text-center mb-4">
                    <h3 className="mb-2">
                      <i className="fas fa-calendar-alt me-2" />
                      Nueva Cita
                    </h3>
                    <p className="lead">
                      Selecciona tu nueva fecha y hora preferida
                    </p>
                    <div className="alert alert-info d-flex align-items-center mb-3">
                      <i className="fas fa-info-circle me-2" />
                      <small>
                        <strong>Nota:</strong> Las citas deben reagendarse con
                        al menos 30 minutos de anticipación.
                      </small>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit}>
                    {/* Date Selection */}
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0">
                          <i className="fas fa-calendar me-2" />
                          Selecciona la Nueva Fecha
                        </h5>
                        <div
                          className="btn-group btn-group-sm"
                          role="group"
                        >
                          <button
                            type="button"
                            className={`btn btn-outline-secondary ${
                              view === 'week' ? 'active' : ''
                            }`}
                            onClick={() => setView('week')}
                          >
                            <i className="fas fa-list me-1" />
                            Week
                          </button>
                          <button
                            type="button"
                            className={`btn btn-outline-secondary ${
                              view === 'month' ? 'active' : ''
                            }`}
                            onClick={() => setView('month')}
                          >
                            <i className="fas fa-calendar-alt me-1" />
                            Month
                          </button>
                        </div>
                      </div>

                      {/* Week View */}
                      {view === 'week' && (
                        <div id="weekViewContainer">
                          <WeeklyCalendar
                            selectedDate={selectedDate}
                            onSelectDate={handleSelectDate}
                          />
                        </div>
                      )}

                      {/* Month View */}
                      {view === 'month' && (
                        <div id="monthViewContainer">
                          <MonthlyCalendar
                            selectedDate={selectedDate}
                            onSelectDate={handleSelectDate}
                            currentMonth={currentMonth}
                            currentYear={currentYear}
                            prevMonth={prevMonth}
                            nextMonth={nextMonth}
                          />
                        </div>
                      )}
                    </div>

                    {/* Time Selection */}
                    <div className="mb-4">
                      <h5 className="mb-3">
                        <i className="fas fa-clock me-2" />
                        Nuevo Horario Disponible
                      </h5>
                      <div id="timeCards" className="row g-2">
                        {loadingSlots && (
                          <div className="col-12">
                            <p className="text-muted mb-0">
                              Cargando horarios disponibles...
                            </p>
                          </div>
                        )}
                        {!loadingSlots && timeSlots.length === 0 && (
                          <div className="col-12">
                            <p className="text-muted mb-0">
                              No hay horarios disponibles para esta fecha
                            </p>
                          </div>
                        )}
                        {!loadingSlots &&
                          timeSlots.map(({ time, isCurrent }) => (
                            <div
                              className="col-6 col-md-4 col-lg-3"
                              key={time}
                            >
                              <button
                                type="button"
                                className={`btn w-100 time-slot ${
                                  isCurrent
                                    ? 'btn-warning'
                                    : selectedTime === time
                                    ? 'btn-primary'
                                    : 'btn-outline-primary'
                                }`}
                                disabled={isCurrent}
                                onClick={() =>
                                  !isCurrent && handleSelectTime(time)
                                }
                              >
                                {formatTimeAMPM(time)}
                                {isCurrent && (
                                  <>
                                    <br />
                                    <small>Hora actual</small>
                                  </>
                                )}
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Additional Notes */}
                    <div className="mb-4">
                      <label htmlFor="note" className="form-label">
                        <i className="fas fa-comment me-2" />
                        Notas Adicionales (Opcional)
                      </label>
                      <textarea
                        className="form-control"
                        name="note"
                        id="note"
                        rows={3}
                        placeholder="Actualiza el motivo de tu consulta o cualquier información relevante..."
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      className="btn btn-primary w-100"
                      type="submit"
                      disabled={!canSubmit}
                    >
                      {submitting ? (
                        <>
                          <i className="fas fa-spinner fa-spin me-2" />
                          Reagendando...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-calendar-check me-2" />
                          Confirmar Reagendamiento
                        </>
                      )}
                    </button>
                  </form>

                  {/* Navigation Links */}
                  <div className="text-center mt-4">
                    <p className="mb-0">
                      <a
                        href="/mis-citas"
                        className="text-decoration-none"
                      >
                        <i className="fas fa-arrow-left me-1" />
                        Volver a Mis Citas
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="text-center">
            <small>
              &copy; 2025 Quirophisicos Rocha. Todos los derechos reservados.
            </small>
          </div>
        </div>
      </footer>
    </body>
  );
}

export default ReschedulePage;