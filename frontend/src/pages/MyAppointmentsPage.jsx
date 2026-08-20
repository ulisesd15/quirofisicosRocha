/**
 * MyAppointmentsPage.jsx — React port of mis-citas.html + mis-citas.js.
 * Protected route: lists the logged-in user's appointments with filtering,
 * cancel, and reschedule actions.
 *
 * Note: the Appointment model (and the /api/auth/* user payloads) return
 * camelCase fields (fullName, createdAt, updatedAt, userId) — the old
 * vanilla-JS pages assumed snake_case (full_name, created_at), which would
 * have silently rendered blank values. This page — and the shared
 * AuthContext/client.js session helpers — were fixed to use camelCase
 * consistently while building this migration.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { appointmentService } from '../api/appointmentService';

const STATUS_CONFIG = {
  pending: { text: 'Pendiente', className: 'status-pending' },
  confirmed: { text: 'Confirmada', className: 'status-confirmed' },
  completed: { text: 'Completada', className: 'status-completed' },
  cancelled: { text: 'Cancelada', className: 'status-cancelled' },
};

function getStatusConfig(status) {
  return STATUS_CONFIG[status] || { text: 'Desconocido', className: 'status-completed' };
}

function formatDate(dateStr) {
  // dateStr comes back as an ISO string ('2026-08-21T00:00:00.000Z'); read the
  // calendar date portion directly so we don't shift a day due to timezone conversion.
  const dateOnly = dateStr.split('T')[0];
  const date = new Date(`${dateOnly}T00:00:00`);
  return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const time = new Date();
  time.setHours(Number(hours), Number(minutes), 0, 0);
  return time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return '';
  const date = new Date(dateTimeStr);
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getAppointmentDateTime(appointment) {
  const dateOnly = appointment.date.split('T')[0];
  return new Date(`${dateOnly}T${appointment.time}`);
}

export default function MyAppointmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [message, setMessage] = useState(null); // { type, text }
  const [actionId, setActionId] = useState(null); // appointment id currently being cancelled

  const loadAppointments = async () => {
    try {
      const data = await appointmentService.getMyAppointments();
      setAppointments(data.appointments || []);
    } catch (err) {
      setMessage({ type: 'danger', text: err.message || 'Error al cargar las citas. Por favor, intenta de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const filteredAppointments = useMemo(() => {
    const now = new Date();
    let list;
    switch (filter) {
      case 'upcoming':
        list = appointments.filter((apt) => {
          const dt = getAppointmentDateTime(apt);
          return dt >= now && apt.status !== 'cancelled' && apt.status !== 'completed';
        });
        break;
      case 'past':
        list = appointments.filter((apt) => {
          const dt = getAppointmentDateTime(apt);
          return dt < now || apt.status === 'completed' || apt.status === 'cancelled';
        });
        break;
      default:
        list = [...appointments];
    }
    return list.sort((a, b) => getAppointmentDateTime(b) - getAppointmentDateTime(a));
  }, [appointments, filter]);

  const handleCancel = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta cita?')) return;
    setActionId(id);
    setMessage(null);
    try {
      await appointmentService.cancel(id);
      setMessage({ type: 'success', text: 'Cita cancelada exitosamente.' });
      await loadAppointments();
    } catch (err) {
      setMessage({ type: 'danger', text: err.message || 'Error al cancelar la cita. Por favor, intenta de nuevo.' });
    } finally {
      setActionId(null);
    }
  };

  const handleReschedule = (id) => {
    navigate(`/reschedule/${id}`);
  };

  return (
    <section className="services-section">
      <div className="container">
        <div className="text-center mb-5">
          <p className="section-subtitle">Tu cuenta</p>
          <h2>Mis Citas</h2>
          <p className="lead">Revisa el estado de tus citas y mantente al día con tu tratamiento</p>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-10">
            {message && (
              <div className={`alert alert-${message.type}`} data-testid="text-appointments-message">
                {message.text}
              </div>
            )}

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div>
                  <h5 className="mb-1" data-testid="text-user-name">
                    <i className="fas fa-user-circle text-primary me-2" />
                    {user?.fullName || 'Usuario'}
                  </h5>
                  <p className="text-muted mb-0" data-testid="text-user-email">
                    <i className="fas fa-envelope me-2" />
                    {user?.email || ''}
                  </p>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <span className="badge bg-primary fs-6 p-2" data-testid="text-appointment-count">
                    <i className="fas fa-calendar-alt me-1" />
                    {appointments.length} citas
                  </span>
                  <Link to="/appointment" className="btn btn-primary" data-testid="link-new-appointment">
                    <i className="fas fa-plus me-2" />
                    Nueva Cita
                  </Link>
                </div>
              </div>
            </div>

            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
              <h4 className="mb-0">
                <i className="fas fa-calendar-alt text-primary me-2" />
                Historial de Citas
              </h4>
              <div className="btn-group" role="group">
                {[
                  { id: 'all', label: 'Todas' },
                  { id: 'upcoming', label: 'Próximas' },
                  { id: 'past', label: 'Pasadas' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`btn btn-outline-primary ${filter === opt.id ? 'active' : ''}`}
                    onClick={() => setFilter(opt.id)}
                    data-testid={`button-filter-${opt.id}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5" data-testid="status-loading-appointments">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="mt-3">Cargando tus citas...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="no-appointments" data-testid="status-no-appointments">
                <i className="fas fa-calendar-times fa-4x text-muted mb-3" />
                <h4>No tienes citas registradas</h4>
                <p className="mb-4">¡Agenda tu primera cita para comenzar tu tratamiento!</p>
                <Link to="/appointment" className="btn btn-primary btn-lg">
                  <i className="fas fa-calendar-plus me-2" />
                  Agendar Primera Cita
                </Link>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <p className="text-center text-muted mt-4">No hay citas que coincidan con este filtro.</p>
            ) : (
              <div className="row g-4">
                {filteredAppointments.map((appointment) => {
                  const dt = getAppointmentDateTime(appointment);
                  const now = new Date();
                  const statusConfig = getStatusConfig(appointment.status);
                  const canReschedule = appointment.status === 'confirmed' && dt > now;
                  const canCancel = (appointment.status === 'confirmed' || appointment.status === 'pending') && dt > now;

                  return (
                    <div className="col-md-6 col-lg-4" key={appointment.id}>
                      <div className="card appointment-card h-100" data-testid={`card-appointment-${appointment.id}`}>
                        <div className="card-header bg-transparent border-0 pb-0">
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="appointment-date">{formatDate(appointment.date)}</div>
                            <span className={`badge status-badge ${statusConfig.className}`}>{statusConfig.text}</span>
                          </div>
                          <div className="appointment-time">
                            <i className="fas fa-clock me-1" />
                            {formatTime(appointment.time)}
                          </div>
                        </div>
                        <div className="card-body">
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
                          <div className="appointment-details mb-0">
                            <small className="text-muted d-block">
                              <i className="fas fa-calendar-plus me-1" />
                              Agendada: {formatDateTime(appointment.createdAt)}
                            </small>
                            {appointment.updatedAt !== appointment.createdAt && (
                              <small className="text-muted d-block">
                                <i className="fas fa-edit me-1" />
                                Actualizada: {formatDateTime(appointment.updatedAt)}
                              </small>
                            )}
                          </div>
                        </div>
                        {(canReschedule || canCancel) && (
                          <div className="card-footer bg-transparent border-0">
                            <div className="appointment-actions">
                              {canReschedule && (
                                <button
                                  type="button"
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={() => handleReschedule(appointment.id)}
                                  data-testid={`button-reschedule-${appointment.id}`}
                                >
                                  <i className="fas fa-calendar-alt me-1" />
                                  Reagendar
                                </button>
                              )}
                              {canCancel && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  disabled={actionId === appointment.id}
                                  onClick={() => handleCancel(appointment.id)}
                                  data-testid={`button-cancel-${appointment.id}`}
                                >
                                  <i className="fas fa-times me-1" />
                                  {actionId === appointment.id ? 'Cancelando...' : 'Cancelar'}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
