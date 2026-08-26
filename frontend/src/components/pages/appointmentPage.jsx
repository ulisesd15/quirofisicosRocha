import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

function formatLongDate(dateKey) {
  if (!dateKey) return '';

  return parseDateKey(dateKey).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getStartOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  copy.setDate(copy.getDate() + mondayOffset);
  copy.setHours(0, 0, 0, 0);

  return copy;
}

function isSameDay(first, second) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function isPastDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const candidate = new Date(date);
  candidate.setHours(0, 0, 0, 0);

  return candidate < today;
}

function getToken() {
  return localStorage.getItem('token') || localStorage.getItem('user_token');
}

function getStoredUser() {
  try {
    const rawUser = localStorage.getItem('user');
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
}

function normalizeSlots(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data.availableSlots)) return data.availableSlots;
  if (Array.isArray(data.available_slots)) return data.available_slots;
  if (Array.isArray(data.slots)) return data.slots;
  if (Array.isArray(data.data)) return data.data;

  return [];
}

function getSlotTime(slot) {
  if (typeof slot === 'string') return slot;

  return (
    slot.time ||
    slot.start_time ||
    slot.startTime ||
    slot.slot_time ||
    ''
  );
}

function isSlotAvailable(slot) {
  if (typeof slot === 'string') return true;

  if (typeof slot.available === 'boolean') return slot.available;
  if (typeof slot.isAvailable === 'boolean') return slot.isAvailable;
  if (typeof slot.is_available === 'boolean') return slot.is_available;

  return true;
}

export default function AppointmentPage() {
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    getStartOfWeek(new Date())
  );
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [calendarView, setCalendarView] = useState('week');

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [guest, setGuest] = useState({
    fullName: '',
    phone: '',
    email: '',
  });
  const [note, setNote] = useState('');

  const [notification, setNotification] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(getToken()));
  }, []);

  useEffect(() => {
    if (!notification) return undefined;

    const timeoutId = window.setTimeout(() => {
      setNotification(null);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [notification]);

  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      return undefined;
    }

    const controller = new AbortController();

    async function loadAvailableSlots() {
      setSlotsLoading(true);
      setSelectedTime('');

      try {
        const response = await fetch(
          `/api/appointments/date/${selectedDate}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error('No fue posible consultar los horarios disponibles.');
        }

        const data = await response.json();
        setAvailableSlots(normalizeSlots(data));
      } catch (error) {
        if (error.name !== 'AbortError') {
          setAvailableSlots([]);
          setNotification({
            type: 'danger',
            message: error.message || 'Error al cargar horarios disponibles.',
          });
        }
      } finally {
        setSlotsLoading(false);
      }
    }

    loadAvailableSlots();

    return () => controller.abort();
  }, [selectedDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + index);
      return date;
    });
  }, [currentWeekStart]);

  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const firstWeekday = firstDay.getDay();
    const mondayBasedOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
    const numberOfDays = lastDay.getDate();

    const cells = Array.from({ length: mondayBasedOffset }, () => null);

    for (let day = 1; day <= numberOfDays; day += 1) {
      cells.push(new Date(year, month, day));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [currentMonth]);

  const selectableSlots = useMemo(() => {
    return availableSlots
      .filter(isSlotAvailable)
      .map(getSlotTime)
      .filter(Boolean);
  }, [availableSlots]);

  const selectDate = (date) => {
    if (isPastDate(date)) return;

    setSelectedDate(toDateKey(date));
    setSelectedTime('');
  };

  const changeWeek = (direction) => {
    const nextWeek = new Date(currentWeekStart);
    nextWeek.setDate(nextWeek.getDate() + direction * 7);
    setCurrentWeekStart(nextWeek);
  };

  const changeMonth = (direction) => {
    setCurrentMonth(
      (previous) =>
        new Date(previous.getFullYear(), previous.getMonth() + direction, 1)
    );
  };

  const handleCalendarViewChange = (view) => {
    setCalendarView(view);
    setSelectedDate('');
    setSelectedTime('');
    setAvailableSlots([]);

    if (view === 'month') {
      setCurrentMonth(new Date());
    }
  };

  const handleGuestChange = (event) => {
    const { name, value } = event.target;
    setGuest((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedDate || !selectedTime) {
      setNotification({
        type: 'danger',
        message: 'Por favor, selecciona una fecha y hora.',
      });
      return;
    }

    if (
      !isLoggedIn &&
      (!guest.fullName.trim() || !guest.email.trim() || !guest.phone.trim())
    ) {
      setNotification({
        type: 'danger',
        message: 'Completa tu nombre, teléfono y correo electrónico.',
      });
      return;
    }

    const storedUser = getStoredUser();

    const appointmentData = {
      date: selectedDate,
      time: selectedTime,
      note: note.trim(),
    };

    if (isLoggedIn) {
      appointmentData.userId = storedUser?.id;
      appointmentData.fullName =
        storedUser?.fullName || storedUser?.full_name || '';
      appointmentData.email = storedUser?.email || '';
      appointmentData.phone = storedUser?.phone || '';
    } else {
      appointmentData.fullName = guest.fullName.trim();
      appointmentData.email = guest.email.trim();
      appointmentData.phone = guest.phone.trim();
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify(appointmentData),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message ||
            result.error ||
            'No se pudo agendar la cita. Intenta nuevamente.'
        );
      }

      setNotification({
        type: 'success',
        message: '¡Cita agendada exitosamente! Serás redirigido.',
      });

      window.setTimeout(() => {
        navigate(isLoggedIn ? '/mis-citas' : '/');
      }, 1800);
    } catch (error) {
      setNotification({
        type: 'danger',
        message: error.message || 'Ocurrió un error al agendar la cita.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <section className="services-section">
        <div className="container">
          <div className="text-center mb-5">
            <p className="section-subtitle">Reserva tu cita</p>
            <h2>Agendar Consulta Quiropráctica</h2>
            <p className="lead">Programa tu cita de manera fácil y rápida</p>
          </div>

          <div className="row justify-content-center">
            <div className="col-lg-8">
              {notification && (
                <div
                  className={`alert alert-${notification.type} alert-dismissible fade show`}
                  role="alert"
                >
                  {notification.message}
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Cerrar"
                    onClick={() => setNotification(null)}
                  />
                </div>
              )}

              <div className="card border-0 shadow-lg">
                <div className="card-body p-4 p-md-5">
                  <div className="text-center mb-4">
                    <h3 className="text-primary mb-2">
                      <i className="fas fa-calendar-plus me-2" />
                      Nueva Cita
                    </h3>
                    <p className="text-muted">
                      Completa el formulario para agendar tu consulta
                    </p>

                    <div className="alert alert-info d-flex align-items-center mb-3 text-start">
                      <i className="fas fa-info-circle me-2" />
                      <small>
                        <strong>Nota:</strong> Las citas deben agendarse con al
                        menos 30 minutos de anticipación.
                      </small>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit}>
                    {!isLoggedIn && (
                      <section className="mb-4">
                        <h5 className="mb-3">
                          <i className="fas fa-user me-2" />
                          Información Personal
                        </h5>

                        <div className="row">
                          <div className="col-md-6 mb-3">
                            <label className="form-label" htmlFor="guestName">
                              Nombre Completo
                            </label>
                            <input
                              id="guestName"
                              className="form-control"
                              name="fullName"
                              value={guest.fullName}
                              onChange={handleGuestChange}
                              placeholder="Tu nombre completo"
                              required
                            />
                          </div>

                          <div className="col-md-6 mb-3">
                            <label className="form-label" htmlFor="guestPhone">
                              Teléfono
                            </label>
                            <input
                              id="guestPhone"
                              className="form-control"
                              name="phone"
                              value={guest.phone}
                              onChange={handleGuestChange}
                              placeholder="664-123-4567"
                              required
                            />
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="form-label" htmlFor="guestEmail">
                            Correo Electrónico
                          </label>
                          <input
                            id="guestEmail"
                            className="form-control"
                            type="email"
                            name="email"
                            value={guest.email}
                            onChange={handleGuestChange}
                            placeholder="tu@email.com"
                            required
                          />
                        </div>
                      </section>
                    )}

                    <section className="mb-4">
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                        <h5 className="mb-0">
                          <i className="fas fa-calendar me-2" />
                          Selecciona la Fecha
                        </h5>

                        <div
                          className="btn-group btn-group-sm"
                          role="group"
                          aria-label="Vista de calendario"
                        >
                          <button
                            type="button"
                            className={`btn ${
                              calendarView === 'week'
                                ? 'btn-primary'
                                : 'btn-outline-secondary'
                            }`}
                            onClick={() => handleCalendarViewChange('week')}
                          >
                            <i className="fas fa-list me-1" />
                            Semana
                          </button>

                          <button
                            type="button"
                            className={`btn ${
                              calendarView === 'month'
                                ? 'btn-primary'
                                : 'btn-outline-secondary'
                            }`}
                            onClick={() => handleCalendarViewChange('month')}
                          >
                            <i className="fas fa-calendar-alt me-1" />
                            Mes
                          </button>
                        </div>
                      </div>

                      {calendarView === 'week' && (
                        <div className="border rounded p-3">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => changeWeek(-1)}
                            >
                              <i className="fas fa-chevron-left" />
                            </button>

                            <strong>
                              {formatLongDate(toDateKey(weekDays[0]))} —{' '}
                              {formatLongDate(toDateKey(weekDays[6]))}
                            </strong>

                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => changeWeek(1)}
                            >
                              <i className="fas fa-chevron-right" />
                            </button>
                          </div>

                          <div className="row row-cols-2 row-cols-md-4 row-cols-lg-7 g-2">
                            {weekDays.map((date) => {
                              const dateKey = toDateKey(date);
                              const selected = selectedDate === dateKey;
                              const disabled = isPastDate(date);

                              return (
                                <div className="col" key={dateKey}>
                                  <button
                                    type="button"
                                    disabled={disabled}
                                    className={`btn w-100 h-100 py-3 ${
                                      selected
                                        ? 'btn-primary'
                                        : 'btn-outline-primary'
                                    }`}
                                    onClick={() => selectDate(date)}
                                  >
                                    <span className="d-block small">
                                      {DAYS_ES[date.getDay()]}
                                    </span>
                                    <span className="d-block fs-4 fw-bold">
                                      {date.getDate()}
                                    </span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {calendarView === 'month' && (
                        <div className="border rounded p-3">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => changeMonth(-1)}
                              aria-label="Mes anterior"
                            >
                              <i className="fas fa-chevron-left" />
                            </button>

                            <strong>
                              {MONTHS_ES[currentMonth.getMonth()]}{' '}
                              {currentMonth.getFullYear()}
                            </strong>

                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => changeMonth(1)}
                              aria-label="Mes siguiente"
                            >
                              <i className="fas fa-chevron-right" />
                            </button>
                          </div>

                          <div className="row row-cols-7 g-1 text-center mb-1">
                            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(
                              (day) => (
                                <div className="col small fw-bold text-muted" key={day}>
                                  {day}
                                </div>
                              )
                            )}
                          </div>

                          <div className="row row-cols-7 g-1">
                            {monthDays.map((date, index) => {
                              if (!date) {
                                return <div className="col" key={`blank-${index}`} />;
                              }

                              const dateKey = toDateKey(date);
                              const selected = selectedDate === dateKey;
                              const disabled = isPastDate(date);
                              const today = isSameDay(date, new Date());

                              return (
                                <div className="col" key={dateKey}>
                                  <button
                                    type="button"
                                    disabled={disabled}
                                    className={`btn btn-sm w-100 ${
                                      selected
                                        ? 'btn-primary'
                                        : today
                                        ? 'btn-outline-primary'
                                        : 'btn-outline-secondary'
                                    }`}
                                    onClick={() => selectDate(date)}
                                  >
                                    {date.getDate()}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {selectedDate && (
                        <p className="text-success fw-semibold mt-3 mb-0">
                          Fecha seleccionada: {formatLongDate(selectedDate)}
                        </p>
                      )}
                    </section>

                    <section className="mb-4">
                      <h5 className="mb-3">
                        <i className="fas fa-clock me-2" />
                        Horario Disponible
                      </h5>

                      {!selectedDate && (
                        <p className="text-muted mb-0">
                          Selecciona una fecha para ver los horarios disponibles.
                        </p>
                      )}

                      {selectedDate && slotsLoading && (
                        <div className="text-center py-3">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Cargando horarios...</span>
                          </div>
                        </div>
                      )}

                      {selectedDate &&
                        !slotsLoading &&
                        selectableSlots.length === 0 && (
                          <div className="alert alert-warning mb-0">
                            No hay horarios disponibles para esta fecha. Selecciona otro
                            día.
                          </div>
                        )}

                      {selectedDate &&
                        !slotsLoading &&
                        selectableSlots.length > 0 && (
                          <div className="row g-2">
                            {selectableSlots.map((time) => (
                              <div className="col-6 col-md-4 col-lg-3" key={time}>
                                <button
                                  type="button"
                                  className={`btn w-100 ${
                                    selectedTime === time
                                      ? 'btn-primary'
                                      : 'btn-outline-primary'
                                  }`}
                                  onClick={() => setSelectedTime(time)}
                                >
                                  {time}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                    </section>

                    <div className="mb-4">
                      <label className="form-label" htmlFor="note">
                        <i className="fas fa-comment me-2" />
                        Notas Adicionales (Opcional)
                      </label>
                      <textarea
                        id="note"
                        className="form-control"
                        rows="3"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Describe brevemente el motivo de tu consulta o cualquier información relevante..."
                      />
                    </div>

                    <button
                      className="btn btn-primary w-100"
                      type="submit"
                      disabled={!selectedDate || !selectedTime || isSubmitting}
                    >
                      {isSubmitting ? (
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

                  <div className="text-center mt-4">
                    <button
                      type="button"
                      className="btn btn-link text-decoration-none"
                      onClick={() => navigate('/')}
                    >
                      <i className="fas fa-home me-1" />
                      Volver al inicio
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container">
          <div className="text-center">
            <small className="text-white-50">
              © 2025 Quirophisicos Rocha. Todos los derechos reservados.
            </small>
          </div>
        </div>
      </footer>
    </>
  );
}