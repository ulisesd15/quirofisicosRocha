// frontend/src/components/admin/pages/VerificationPage.jsx
//
// User verification workflow: lists unverified users and pending
// appointments, allowing the admin to verify users directly or
// approve/reject appointments (which also verifies the patient).

import React, { useCallback, useEffect, useState } from "react";

import { showToast } from "../toast";
import { adminApi, formatDate, formatTime } from "../adminApi";

export default function VerificationPage() {
  const [unverifiedUsers, setUnverifiedUsers] = useState([]);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadVerificationData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, appointmentsData] = await Promise.all([
        adminApi("/api/admin/users/unverified"),
        adminApi("/api/admin/appointments/pending"),
      ]);

      setUnverifiedUsers(usersData.users || []);
      setPendingAppointments(
        Array.isArray(appointmentsData) ? appointmentsData : []
      );
    } catch (error) {
      console.error("Error loading verification data:", error);
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVerificationData();
  }, [loadVerificationData]);

  // Optional auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadVerificationData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadVerificationData]);

  const handleVerifyUser = async (id) => {
    try {
      await adminApi(`/api/admin/users/${id}/verify`, { method: "PUT" });
      showToast("Usuario verificado correctamente", "success");
      await loadVerificationData();
    } catch (error) {
      console.error("Error verifying user:", error);
      showToast(error.message, "error");
    }
  };

  const handleApproveAppointment = async (id) => {
    try {
      await adminApi(`/api/admin/appointments/${id}/approve`, {
        method: "PUT",
      });
      showToast("Cita aprobada y usuario verificado correctamente", "success");
      await loadVerificationData();
    } catch (error) {
      console.error("Error approving appointment:", error);
      showToast(error.message, "error");
    }
  };

  const handleRejectAppointment = async (id) => {
    if (!window.confirm("¿Está seguro de que desea rechazar esta cita?"))
      return;

    try {
      // Rejection maps to cancelling the appointment via the standard
      // update endpoint (no dedicated /reject route exists).
      await adminApi(`/api/admin/appointments/${id}`, {
        method: "PUT",
        body: { status: "cancelled" },
      });
      showToast("Cita rechazada", "success");
      await loadVerificationData();
    } catch (error) {
      console.error("Error rejecting appointment:", error);
      showToast(error.message, "error");
    }
  };

  return (
    <div className="admin-section pt-3 pb-5">
      {/* Section Header */}
      <div className="section-header">
        <h2>
          <i className="fas fa-user-check me-2 text-info" />
          Verificación de Usuarios
        </h2>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <button
          type="button"
          className="btn btn-outline-success btn-sm"
          onClick={() => loadVerificationData()}
        >
          <i className="fas fa-sync-alt" /> Actualizar Lista
        </button>
        <div className="d-flex align-items-center gap-2">
          <div className="form-check form-switch mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              id="auto-refresh-switch"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <label
              className="form-check-label small text-muted"
              htmlFor="auto-refresh-switch"
            >
              Actualizar cada 30 segundos
            </label>
          </div>
        </div>
      </div>

      {/* Pending Appointments (approve to verify patient) */}
      <div className="content-card mb-4">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="fas fa-calendar-check me-2" />
            Citas Pendientes de Aprobación
          </h5>
          <small className="text-muted">
            Aprobar una cita verifica automáticamente al paciente
          </small>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="text-muted mt-2 mb-0">Cargando citas pendientes...</p>
            </div>
          ) : pendingAppointments.length === 0 ? (
            <div className="alert alert-info mb-0">
              <i className="fas fa-info-circle me-2" />
              No hay citas pendientes de aprobación.
            </div>
          ) : (
            pendingAppointments.map((apt) => {
              const patient = apt.user || {};
              return (
                <div className="card mb-3" key={apt.id}>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-8">
                        <h6>
                          Cita #{apt.id} — {patient.fullName || apt.fullName}
                        </h6>
                        <p className="mb-1">
                          <strong>Email:</strong> {patient.email || apt.email}
                        </p>
                        <p className="mb-1">
                          <strong>Teléfono:</strong> {patient.phone || apt.phone || "N/A"}
                        </p>
                        <p className="mb-1">
                          <strong>Fecha:</strong> {formatDate(apt.date)} a las{" "}
                          {formatTime(apt.time)}
                        </p>
                        {apt.note && (
                          <p className="mb-1">
                            <strong>Notas:</strong> {apt.note}
                          </p>
                        )}
                      </div>
                      <div className="col-md-4 d-flex flex-column justify-content-center gap-2">
                        <button
                          className="btn btn-success"
                          onClick={() => handleApproveAppointment(apt.id)}
                        >
                          <i className="fas fa-check me-2" />
                          Aprobar y Verificar
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => handleRejectAppointment(apt.id)}
                        >
                          <i className="fas fa-times me-2" />
                          Rechazar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Unverified Users */}
      <div className="content-card">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="fas fa-users me-2" />
            Usuarios Pendientes de Verificación
          </h5>
          <small className="text-muted">
            Usuarios que aún no han sido verificados
          </small>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="text-muted mt-2 mb-0">Cargando usuarios...</p>
            </div>
          ) : unverifiedUsers.length === 0 ? (
            <div className="alert alert-info mb-0">
              <i className="fas fa-info-circle me-2" />
              No hay usuarios pendientes de verificación.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th width="140">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {unverifiedUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.fullName}</td>
                      <td>{user.email}</td>
                      <td>{user.phone || "N/A"}</td>
                      <td>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleVerifyUser(user.id)}
                        >
                          <i className="fas fa-user-check me-1" />
                          Verificar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
