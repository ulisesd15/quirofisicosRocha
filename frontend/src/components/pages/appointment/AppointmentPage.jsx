// frontend/src/pages/AppointmentPage.jsx
import React, { useState, useEffect } from 'react';
import MonthlyCalendar from '../calendar/MonthlyCalendar';
import WeeklyCalendar from '../calendar/WeeklyCalendar';
import TimeSlots from '../calendar/TimeSlots';
import { useCalendar } from '../../../hooks/useCalendar';
import { useAuth } from '../../../hooks/useAuth';


function AppointmentPage() {
  // Calendar state (date only; slots handled by TimeSlots/useCalendar)
  const {
    selectedDate,
    selectDate,
  } = useCalendar();

  // View: 'week' or 'month'
  const [view, setView] = useState('week');

  // Selected time (24h string, e.g. "14:30")
  const [selectedTime, setSelectedTime] = useState('');

  // Optional note
  const [note, setNote] = useState('');

  // Guest fields
  const [guestFieldsVisible, setGuestFieldsVisible] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // UX state
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // Auth (mirrors AuthManager usage from legacy JS)
  const { isLoggedIn, user } = useAuth() || { isLoggedIn: false, user: null };

  // Show/hide guest fields based on auth
  useEffect(() => {
    setGuestFieldsVisible(!isLoggedIn);
  }, [isLoggedIn]);

  // Auto-dismiss notifications after 5 seconds (similar to showNotification)
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  const handleSelectDate = (date) => {
    selectDate(date);
    // Reset time and any time-slot selection when date changes
    setSelectedTime('');
  };

  const handleSelectTime = (time24) => {
    setSelectedTime(time24);
  };

  // Basic submit guard: need date and time
  const canSubmit = Boolean(selectedDate && selectedTime);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canSubmit) {
      setNotification({
        type: 'danger',
        message: 'Por favor, selecciona una fecha y hora.',
      });
      return;
    }

    setSubmitting(true);
    setNotification(null);

    const dateStr = selectedDate.toISOString().slice(0, 10);

    const appointmentData = {
      date: dateStr,
      time: selectedTime,
      note,
    };

    if (isLoggedIn && user) {
      appointmentData.userId = user.id;
      appointmentData.fullName = user.fullName;
      appointmentData.email = user.email;
      appointmentData.phone = user.phone;
    } else {
      appointmentData.fullName = guestName;
      appointmentData.email = guestEmail;
      appointmentData.phone = guestPhone;
    }

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'No se pudo agendar la cita.');
      }

      setNotification({
        type: 'success',
        message: '¡Cita agendada exitosamente! Serás redirigido.',
      });

      // Redirect similar to legacy: logged-in -> mis-citas, guest -> inicio
      setTimeout(() => {
        window.location.href = isLoggedIn ? '/mis-citas' : '/';
      }, 2500);
    } catch (err) {
      console.error('Error booking appointment', err);
      setNotification({
        type: 'danger',
        message: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="services-section">
      <div className="container">
        {/* Hero header (ported from appointment.html) */}
        <div className="text-center mb-5">
          <p className="section-subtitle">Reserva tu cita</p>
          <h2>Agendar Consulta Quiropráctica</h2>
          <p className="lead">Programa tu cita de manera fácil y rápida</p>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-8">
            {/* Notification container */}
            {notification && (
              <div
                className={`alert alert-${notification.type} alert-dismissible fade show mb-4`}
                role="alert"
              >
                {notification.message}
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setNotification(null)}
                />
              </div>
            )}

            <div className="card border-0 shadow-lg">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <h3 className="text-primary mb-2">
                    <i className="fas fa-calendar-plus me-2" />
                    Nueva Cita
                  </h3>
                  <p className="text-muted">
                    Completa el formulario para agendar tu consulta
                  </p>
                  <div className="alert alert-info d-flex align-items-center mb-3">
                    <i className="fas fa-info-circle me-2" />
                    <small>
                      <strong>Nota:</strong> Las citas deben agendarse con al
                      menos 30 minutos de anticipación.
                    </small>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  {/* Guest fields (only when not logged in) */}
                  {guestFieldsVisible && (
                    <div className="mb-4">
                      <h5 className="mb-3">
                        <i className="fas fa-user me-2" />
                        Información Personal
                      </h5>
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Nombre Completo</label>
                          <input
                            className="form-control"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="Tu nombre completo"
                            required={guestFieldsVisible}
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Teléfono</label>
                          <input
                            className="form-control"
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            placeholder="664-123-4567"
                            required={guestFieldsVisible}
                          />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Correo Electrónico</label>
                        <input
                          className="form-control"
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="tu@email.com"
                          required={guestFieldsVisible}
                        />
                      </div>
                    </div>
                  )}

                  {/* Date selection with view toggle */}
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">
                        <i className="fas fa-calendar me-2" />
                        Selecciona la Fecha
                      </h5>
                      <div className="btn-group btn-group-sm" role="group">
                        <button
                          type="button"
                          className={`btn btn-outline-secondary ${
                            view === 'week' ? 'active' : ''
                          }`}
                          onClick={() => {
                            setView('week');
                            // Reset time when switching views
                            setSelectedTime('');
                          }}
                        >
                          <i className="fas fa-list me-1" />
                          Week
                        </button>
                        <button
                          type="button"
                          className={`btn btn-outline-secondary ${
                            view === 'month' ? 'active' : ''
                          }`}
                          onClick={() => {
                            setView('month');
                            setSelectedTime('');
                          }}
                        >
                          <i className="fas fa-calendar-alt me-1" />
                          Month
                        </button>
                      </div>
                    </div>

                    {/* Weekly view (React port of weeklyCalendar div) */}
                    {view === 'week' && (
                      <div id="weekViewContainer">
                        <WeeklyCalendar
                          selectedDate={selectedDate}
                          onSelectDate={handleSelectDate}
                          onSelectTime={handleSelectTime}
                        />
                      </div>
                    )}

                    {/* Monthly view (React port of monthlyCalendar div) */}
                    {view === 'month' && (
                      <div id="monthViewContainer">
                        <MonthlyCalendar
                          selectedDate={selectedDate}
                          onSelectDate={handleSelectDate}
                        />
                      </div>
                    )}
                  </div>

                  {/* Time slots (React port of #timeCards + hidden input) */}
                  <div className="mb-4">
                    <h5 className="mb-3">
                      <i className="fas fa-clock me-2" />
                      Horario Disponible
                    </h5>
                    <TimeSlots
                      date={selectedDate}
                      selectedTime={selectedTime}
                      onSelectTime={handleSelectTime}
                    />
                  </div>

                  {/* Notes */}
                  <div className="mb-4">
                    <label className="form-label">
                      <i className="fas fa-comment me-2" />
                      Notas Adicionales (Opcional)
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Describe brevemente el motivo de tu consulta o cualquier información relevante..."
                    />
                  </div>

                  {/* Submit */}
                  <button
                    className="btn btn-primary w-100"
                    type="submit"
                    disabled={!canSubmit || submitting}
                  >
                    {submitting ? (
                      <>
                        <i className="fas fa-spinner fa-spin me-2" />
                        Confirmando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-calendar-check me-2" />
                        Confirmar Cita
                      </>
                    )}
                  </button>
                </form>

                {/* Navigation link back home */}
                <div className="text-center mt-4">
                  <p className="mb-0">
                    <a href="/index.html" className="text-decoration-none">
                      <i className="fas fa-home me-1" />
                      Volver al inicio
                    </a>
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

export default AppointmentPage;