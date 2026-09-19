// frontend/src/pages/MyAppointmentsPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import "../../../style/myAppointments.css"

function MyAppointmentsPage() {
  const auth = useAuth() || {};
  const {
    isLoggedIn,
    authHeaders,      // e.g. { Authorization: 'Bearer <token>' }
  } = auth;

  const [appointments, setAppointments] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [userInfo, setUserInfo] = useState({ full_name: 'Cargando...', email: 'Cargando...' });

  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null); // { type, message }

  // Redirect if not authenticated (mirrors AuthManager.isLoggedIn + redirectToLogin)
  useEffect(() => {
    if (isLoggedIn === false) {
      window.location.href = '/login';
    }
  }, [isLoggedIn]);

  // Load profile + appointments on mount
  useEffect(() => {
    if (!isLoggedIn) return;

    const tokenHeader =
      authHeaders && authHeaders.Authorization
        ? authHeaders
        : {
            Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('user_token') || ''}`,
          };

    const loadData = async () => {
      try {
        // 1) Load user profile
        const profileRes = await fetch('/api/auth/profile', {
          headers: {
            'Content-Type': 'application/json',
            ...tokenHeader,
          },
        });

        if (!profileRes.ok) {
          throw new Error('Error al cargar datos del usuario');
        }

        const user = await profileRes.json();
        setUserInfo({
          full_name: user.full_name || 'Usuario',
          email: user.email || '',
        });

        // 2) Load user's appointments
        const aptRes = await fetch('/api/appointments/my-appointments', {
          headers: {
            'Content-Type': 'application/json',
            ...tokenHeader,
          },
        });

        if (!aptRes.ok) {
          throw new Error('Error al cargar las citas');
        }

        const data = await aptRes.json();
        const list = data.appointments || [];

        // If first appointment has user info, use it to populate card (matching legacy behavior)
        const userInfoSource = list.length > 0 ? list[0] : user;
        setUserInfo({
          full_name: userInfoSource.full_name || 'Usuario',
          email: userInfoSource.email || user.email || '',
        });

        setAppointments(list);
      } catch (err) {
        console.error('[MyAppointments] load error:', err);
        showAlert('Error al cargar las citas. Por favor, intenta de nuevo.', 'danger');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const showAlert = (message, type) => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const showSuccess = (message) => showAlert(message, 'success');
  const showError = (message) => showAlert(message, 'danger');

  // Cancel appointment (mirrors /api/appointments/:id/cancel logic)
  const cancelAppointment = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta cita?')) {
      return;
    }

    try {
      const tokenHeader =
        authHeaders && authHeaders.Authorization
          ? authHeaders
          : {
              Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('user_token') || ''}`,
            };

      const res = await fetch(`/api/appointments/${id}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...tokenHeader,
        },
      });

      if (!res.ok) {
        throw new Error('Error al cancelar la cita');
      }

      showSuccess('Cita cancelada exitosamente');

      // Reload appointments (simplest parity with legacy)
      const aptRes = await fetch('/api/appointments/my-appointments', {
        headers: {
          'Content-Type': 'application/json',
          ...tokenHeader,
        },
      });

      if (aptRes.ok) {
        const data = await aptRes.json();
        setAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      showError('Error al cancelar la cita. Por favor, intenta de nuevo.');
    }
  };

  // Reschedule redirect (React route instead of reschedule.html)
  const rescheduleAppointment = (id) => {
    window.location.href = `/reschedule?id=${id}`;
  };

  // Status config (badge text/classes)
  const getStatusConfig = (status) => {
    const configs = {
      pending: { text: 'Pendiente', className: 'warning' },
      confirmed: { text: 'Confirmada', className: 'primary' },
      completed: { text: 'Completada', className: 'secondary' },
      cancelled: { text: 'Cancelada', className: 'danger' },
    };
    return configs[status] || { text: 'Desconocido', className: 'secondary' };
  };

  // Formatting helpers (same logic as legacy, just used inside JSX)
  const formatDate = (date) => {
    const normalized = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return normalized.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const time = new Date();
    time.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filtering (all / upcoming / past) — mirrors filterAppointments()
  const filteredAppointments = useMemo(() => {
    const now = new Date();

    if (currentFilter === 'upcoming') {
      return appointments.filter((apt) => {
        const dateOnly = apt.date.split('T')[0];
        const aptDateTime = new Date(`${dateOnly}T${apt.time}`);
        return (
          aptDateTime >= now &&
          apt.status !== 'cancelled' &&
          apt.status !== 'completed'
        );
      });
    }

    if (currentFilter === 'past') {
      return appointments.filter((apt) => {
        const dateOnly = apt.date.split('T')[0];
        const aptDateTime = new Date(`${dateOnly}T${apt.time}`);
        return (
          aptDateTime < now ||
          apt.status === 'completed' ||
          apt.status === 'cancelled'
        );
      });
    }

    // all — sorted descending by date/time
    return [...appointments].sort(
      (a, b) =>
        new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`)
    );
  }, [appointments, currentFilter]);

  const appointmentCount = appointments.length;

  const renderAppointmentCard = (appointment) => {
    const dateOnly = appointment.date.split('T')[0];
    const appointmentDateTime = new Date(`${dateOnly}T${appointment.time}`);
    const now = new Date();

    const statusConfig = getStatusConfig(appointment.status);
    const formattedDate = formatDate(appointmentDateTime);
    const formattedTime = formatTime(appointment.time);

    const canReschedule =
      appointment.status === 'confirmed' && appointmentDateTime > now;
    const canCancel =
      (appointment.status === 'confirmed' ||
        appointment.status === 'pending') &&
      appointmentDateTime > now;

    return (
      <div className="col-md-6 col-lg-4" key={appointment.id}>
        <div className="card appointment-card h-100">
          <div className="card-header bg-transparent border-0 pb-0">
            <div className="d-flex justify-content-between align-items-start">
              <div className="appointment-date">{formattedDate}</div>
              <span
                className={`badge status-badge status-${appointment.status}`}
              >
                {statusConfig.text}
              </span>
            </div>
            <div className="appointment-time">
              <i className="fas fa-clock me-1" />
              {formattedTime}
            </div>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <h6 className="card-title mb-2">
                <i className="fas fa-user-md text-primary me-2" />
                Cita Médica
              </h6>
              {appointment.note && (
                <p className="card-text small text-muted mb-2">
                  <i className="fas fa-comment-medical me-1" />
                  <strong>Nota:</strong> {appointment.note}
                </p>
              )}
            </div>

            <div className="appointment-details mb-3">
              <small className="text-muted d-block">
                <i className="fas fa-calendar-plus me-1" />
                Agendada: {formatDateTime(appointment.created_at)}
              </small>
              {appointment.updated_at !== appointment.created_at && (
                <small className="text-muted d-block">
                  <i className="fas fa-edit me-1" />
                  Actualizada: {formatDateTime(appointment.updated_at)}
                </small>
              )}
            </div>
          </div>

          <div className="card-footer bg-transparent border-0">
            <div className="appointment-actions">
              {canReschedule && (
                <button
                  className="btn btn-outline-primary btn-sm"
                  type="button"
                  onClick={() => rescheduleAppointment(appointment.id)}
                >
                  <i className="fas fa-calendar-alt me-1" />
                  Reagendar
                </button>
              )}
              {canCancel && (
                <button
                  className="btn btn-outline-danger btn-sm"
                  type="button"
                  onClick={() => cancelAppointment(appointment.id)}
                >
                  <i className="fas fa-times me-1" />
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Notification container (top-right) */}
      {alert && (
        <div
          className="position-fixed top-0 end-0 p-3"
          style={{ zIndex: 9999 }}
        >
          <div
            className={`alert alert-${alert.type} alert-dismissible fade show`}
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

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <h1 className="display-5 fw-bold mb-3">
                <i className="fas fa-calendar-check me-3" />
                Mis Citas
              </h1>
              <p className="lead mb-0">
                Revisa el estado de tus citas y mantente al día con tu
                tratamiento
              </p>
            </div>
            <div className="col-lg-4 text-lg-end">
              <a href="/appointment" className="btn btn-light btn-lg">
                <i className="fas fa-plus me-2" />
                Nueva Cita
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container">
        {/* User Info Section */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h5 className="card-title mb-1">
                      <i className="fas fa-user-circle text-primary me-2" />
                      <span id="userFullName">{userInfo.full_name}</span>
                    </h5>
                    <p className="text-muted mb-0">
                      <i className="fas fa-envelope me-2" />
                      <span id="userEmail">{userInfo.email}</span>
                    </p>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <div className="badge bg-primary fs-6 p-2">
                      <i className="fas fa-calendar-alt me-1" />
                      <span id="appointmentCount">{appointmentCount}</span>{' '}
                      citas
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Appointments Section */}
        <div className="row">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3>
                <i className="fas fa-calendar-alt text-primary me-2" />
                Historial de Citas
              </h3>
              <div className="btn-group" role="group">
                <input
                  type="radio"
                  className="btn-check"
                  name="appointmentFilter"
                  id="all"
                  autoComplete="off"
                  checked={currentFilter === 'all'}
                  onChange={() => setCurrentFilter('all')}
                />
                <label className="btn btn-outline-primary" htmlFor="all">
                  Todas
                </label>

                <input
                  type="radio"
                  className="btn-check"
                  name="appointmentFilter"
                  id="upcoming"
                  autoComplete="off"
                  checked={currentFilter === 'upcoming'}
                  onChange={() => setCurrentFilter('upcoming')}
                />
                <label className="btn btn-outline-primary" htmlFor="upcoming">
                  Próximas
                </label>

                <input
                  type="radio"
                  className="btn-check"
                  name="appointmentFilter"
                  id="past"
                  autoComplete="off"
                  checked={currentFilter === 'past'}
                  onChange={() => setCurrentFilter('past')}
                />
                <label className="btn btn-outline-primary" htmlFor="past">
                  Pasadas
                </label>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div id="loadingState" className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="mt-3">Cargando tus citas...</p>
              </div>
            )}

            {/* Appointments Container / Empty states */}
            {!loading && (
              <>
                {appointmentCount === 0 ? (
                  <div
                    id="noAppointments"
                    className="no-appointments text-center"
                  >
                    <i className="fas fa-calendar-times fa-4x text-muted mb-3" />
                    <h4>No tienes citas registradas</h4>
                    <p className="mb-4">
                      ¡Agenda tu primera cita para comenzar tu tratamiento!
                    </p>
                    <a
                      href="/appointment"
                      className="btn btn-primary btn-lg"
                    >
                      <i className="fas fa-calendar-plus me-2" />
                      Agendar Primera Cita
                    </a>
                  </div>
                ) : (
                  <div id="appointmentsContainer" className="row g-4">
                    {filteredAppointments.length === 0 ? (
                      <div className="col-12">
                        <p className="text-center text-muted mt-4">
                          No hay citas que coincidan con este filtro.
                        </p>
                      </div>
                    ) : (
                      filteredAppointments.map(renderAppointmentCard)
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer (optional: keep as separate layout component) */}
      <footer className="bg-dark text-light py-4 mt-5">
        <div className="container">
          <div className="row">
            <div className="col-md-6">
              <h5>
                <i className="fas fa-clinic-medical me-2" />
                Quirofísicos Rocha
              </h5>
              <p className="mb-2">
                Cuidando tu salud con profesionalismo y dedicación
              </p>
            </div>
            <div className="col-md-6">
              <h6>Contacto</h6>
              <p className="mb-1">
                <i className="fas fa-phone me-2" />
                +52 664 123 4567
              </p>
              <p className="mb-1">
                <i className="fas fa-envelope me-2" />
                info@quirofisicosrocha.com
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default MyAppointmentsPage;