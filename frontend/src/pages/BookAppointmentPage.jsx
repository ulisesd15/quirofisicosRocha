/**
 * BookAppointmentPage.jsx — React port of appointment.html + appointment.js.
 * Stays a PUBLIC route: guests can book without an account (guest fields
 * shown/required only when logged out), matching the old site's behavior.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { appointmentService } from '../api/appointmentService';
import CalendarPicker from '../components/CalendarPicker';

export default function BookAppointmentPage() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [guest, setGuest] = useState({ name: '', phone: '', email: '' });
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // { type, text }

  const handleSelect = (dateStr, time) => {
    setSelectedDate(dateStr);
    if (time) setSelectedTime(time);
    else setSelectedTime(null);
  };

  const handleGuestChange = (event) => {
    setGuest((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (!selectedDate || !selectedTime) {
      setMessage({ type: 'danger', text: 'Por favor, selecciona una fecha y hora.' });
      return;
    }
    if (!isLoggedIn && (!guest.name || !guest.phone || !guest.email)) {
      setMessage({ type: 'danger', text: 'Completa tu información de contacto.' });
      return;
    }

    setSubmitting(true);
    const appointmentData = {
      date: selectedDate,
      time: selectedTime,
      note,
      ...(isLoggedIn
        ? { userId: user.id, fullName: user.full_name, email: user.email, phone: user.phone }
        : { fullName: guest.name, email: guest.email, phone: guest.phone }),
    };

    try {
      await appointmentService.create(appointmentData);
      setMessage({ type: 'success', text: '¡Cita agendada exitosamente! Serás redirigido.' });
      setTimeout(() => navigate(isLoggedIn ? '/mis-citas' : '/'), 2000);
    } catch (err) {
      setMessage({ type: 'danger', text: err.message || 'No se pudo agendar la cita.' });
      setSubmitting(false);
    }
  };

  return (
    <section className="services-section">
      <div className="container">
        <div className="text-center mb-5">
          <p className="section-subtitle">Reserva tu cita</p>
          <h2>Agendar Consulta Quiropráctica</h2>
          <p className="lead">Programa tu cita de manera fácil y rápida</p>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-8">
            {message && (
              <div className={`alert alert-${message.type} mb-4`} data-testid="text-booking-message">
                {message.text}
              </div>
            )}

            <div className="card border-0 shadow-lg">
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <h3 className="text-primary mb-2">
                    <i className="fas fa-calendar-plus me-2" />
                    Nueva Cita
                  </h3>
                  <p className="text-muted">Completa el formulario para agendar tu consulta</p>
                  <div className="alert alert-info d-flex align-items-center text-start mb-3">
                    <i className="fas fa-info-circle me-2" />
                    <small>
                      <strong>Nota:</strong> Las citas deben agendarse con al menos 30 minutos de anticipación.
                    </small>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  {!isLoggedIn && (
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
                            name="name"
                            placeholder="Tu nombre completo"
                            value={guest.name}
                            onChange={handleGuestChange}
                            required
                            data-testid="input-guest-name"
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Teléfono</label>
                          <input
                            className="form-control"
                            name="phone"
                            placeholder="664-123-4567"
                            value={guest.phone}
                            onChange={handleGuestChange}
                            required
                            data-testid="input-guest-phone"
                          />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Correo Electrónico</label>
                        <input
                          className="form-control"
                          name="email"
                          type="email"
                          placeholder="tu@email.com"
                          value={guest.email}
                          onChange={handleGuestChange}
                          required
                          data-testid="input-guest-email"
                        />
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <CalendarPicker selectedDate={selectedDate} selectedTime={selectedTime} onSelect={handleSelect} />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="note" className="form-label">
                      <i className="fas fa-comment me-2" />
                      Notas Adicionales (Opcional)
                    </label>
                    <textarea
                      className="form-control"
                      id="note"
                      rows={3}
                      placeholder="Describe brevemente el motivo de tu consulta o cualquier información relevante..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      data-testid="input-note"
                    />
                  </div>

                  <button
                    className="btn btn-primary w-100"
                    type="submit"
                    disabled={submitting || !selectedDate || !selectedTime}
                    data-testid="button-confirm-booking"
                  >
                    <i className="fas fa-calendar-check me-2" />
                    {submitting ? 'Confirmando...' : 'Confirmar Cita'}
                  </button>
                </form>

                <div className="text-center mt-4">
                  <p className="mb-0">
                    <Link to="/" className="text-decoration-none">
                      <i className="fas fa-home me-1" />
                      Volver al inicio
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
