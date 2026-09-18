// frontend/src/pages/AppointmentPage.jsx
import React, { useState, useEffect } from 'react';
import MonthlyCalendar from '../calendar/MonthlyCalendar';
// (Optionally) import WeeklyCalendar when you port it
// import WeeklyCalendar from '../components/calendar/WeeklyCalendar';
import { useCalendar } from '../../../hooks/useCalendar';
// import { useAuth } from '../hooks/useAuth'; // placeholder for your React auth

function AppointmentPage() {
  const {
    selectedDate,
    selectDate,
    // other values from useCalendar if you need them here
  } = useCalendar();

  const [view, setView] = useState('week'); // 'week' or 'month'
  const [selectedTime, setSelectedTime] = useState('');
  const [note, setNote] = useState('');

  const [guestFieldsVisible, setGuestFieldsVisible] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // Replace this with your actual auth hook / context
  const isLoggedIn = false; // e.g. const { isLoggedIn, user } = useAuth();
  const user = null;

  useEffect(() => {
    // Same idea as AuthManager logic from appointment.js
    setGuestFieldsVisible(!isLoggedIn);
  }, [isLoggedIn]);

  const handleSelectDate = (date) => {
    selectDate(date);
    setSelectedTime(''); // reset time when date changes
  };

  const handleSelectTime = (time24) => {
    setSelectedTime(time24);
  };

  const canSubmit = selectedDate && selectedTime;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      setNotification({ type: 'danger', message: 'Por favor, selecciona una fecha y hora.' });
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

      setNotification({ type: 'success', message: '¡Cita agendada exitosamente! Serás redirigido.' });

      setTimeout(() => {
        // Mimic legacy redirect logic
        window.location.href = isLoggedIn ? '/mis-citas' : '/';
      }, 2500);
    } catch (err) {
      console.error('Error booking appointment', err);
      setNotification({ type: 'danger', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="services-section">
      <div className="container">
        {/* ... hero header, same texts as HTML ... */}

        <div className="row justify-content-center">
          <div className="col-lg-8">
            {notification && (
              <div className={`alert alert-${notification.type} alert-dismissible fade show`} role="alert">
                {notification.message}
                {/* You can add a close button here if you want */}
              </div>
            )}

            <div className="card border-0 shadow-lg">
              <div className="card-body p-5">
                <form onSubmit={handleSubmit}>
                  {/* Guest fields (controlled instead of DOM show/hide) */}
                  {guestFieldsVisible && (
                    <div className="mb-4">
                      <h5 className="mb-3">
                        <i className="fas fa-user me-2" />Información Personal
                      </h5>
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Nombre Completo</label>
                          <input
                            className="form-control"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Teléfono</label>
                          <input
                            className="form-control"
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            required
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
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* View toggle buttons */}
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">
                        <i className="fas fa-calendar me-2" />Selecciona la Fecha
                      </h5>
                      <div className="btn-group btn-group-sm" role="group">
                        <button
                          type="button"
                          className={`btn btn-outline-secondary ${view === 'week' ? 'active' : ''}`}
                          onClick={() => setView('week')}
                        >
                          <i className="fas fa-list me-1" />
                          Week
                        </button>
                        <button
                          type="button"
                          className={`btn btn-outline-secondary ${view === 'month' ? 'active' : ''}`}
                          onClick={() => setView('month')}
                        >
                          <i className="fas fa-calendar-alt me-1" />
                          Month
                        </button>
                      </div>
                    </div>

                    {/* Calendar containers */}
                    {view === 'week' && (
                      <div id="weekViewContainer">
                        {/* WeeklyCalendar will go here once you port it */}
                        {/* <WeeklyCalendar
                          selectedDate={selectedDate}
                          onSelectDate={handleSelectDate}
                          onSelectTime={handleSelectTime}
                        /> */}
                        <p>Weekly calendar coming soon…</p>
                      </div>
                    )}

                    {view === 'month' && (
                      <div id="monthViewContainer">
                        <MonthlyCalendar
                          selectedDate={selectedDate}
                          onSelectDate={handleSelectDate}
                        />
                      </div>
                    )}
                  </div>

                  {/* Time slots (port of renderTimeSlots) */}
                  <div className="mb-4">
                    <h5 className="mb-3">
                      <i className="fas fa-clock me-2" />
                      Horario Disponible
                    </h5>
                    {/* You’ll create a TimeSlots component that calls
                        useCalendar.fetchAvailableSlots(date) and shows buttons.
                        For now, this is just a placeholder. */}
                    {/* <TimeSlots
                      date={selectedDate}
                      selectedTime={selectedTime}
                      onSelectTime={handleSelectTime}
                    /> */}
                    <p>Time slots component coming soon…</p>
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
                      placeholder="Describe brevemente el motivo de tu consulta..."
                    />
                  </div>

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
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AppointmentPage;