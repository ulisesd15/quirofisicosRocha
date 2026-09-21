// frontend/src/components/admin/pages/AppointmentsPage.jsx
//
// Search, filter, edit, and delete appointments. Includes client-side
// pagination driven by the backend /api/admin/appointments endpoint.

import React, { useCallback, useEffect, useState } from "react";

import Modal from "../Modal";
import { showToast } from "../toast";
import {
  adminApi,
  formatDate,
  formatTime,
  statusBadgeClass,
  statusText,
} from "../adminApi";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmada" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Cancelada" },
];

const EMPTY_EDIT_FORM = {
  id: null,
  fullName: "",
  email: "",
  phone: "",
  date: "",
  time: "",
  status: "pending",
  note: "",
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [saving, setSaving] = useState(false);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.append("search", search);
      if (status) params.append("status", status);
      if (date) params.append("date", date);

      const data = await adminApi(`/api/admin/appointments?${params}`);
      setAppointments(data.appointments || []);
      setPagination(data.pagination || { currentPage: 1, totalPages: 1 });
    } catch (error) {
      console.error("Error loading appointments:", error);
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, status, date]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    loadAppointments();
  };

  const openEditModal = async (id) => {
    try {
      const data = await adminApi(`/api/admin/appointments/${id}`);
      const apt = data.appointment;
      setEditForm({
        id: apt.id,
        fullName: apt.fullName || apt.name || "No disponible",
        email: apt.email || "No disponible",
        phone: apt.phone || "No disponible",
        date: (apt.date || "").split("T")[0],
        time: (apt.time || "").slice(0, 5),
        status: apt.status,
        note: apt.note || "",
      });
      setEditModalOpen(true);
    } catch (error) {
      console.error("Error loading appointment:", error);
      showToast(error.message, "error");
    }
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await adminApi(`/api/admin/appointments/${editForm.id}`, {
        method: "PUT",
        body: {
          date: editForm.date,
          time: editForm.time,
          status: editForm.status,
          note: editForm.note,
        },
      });
      setEditModalOpen(false);
      showToast("Cita actualizada correctamente", "success");
      await loadAppointments();
    } catch (error) {
      console.error("Error saving appointment:", error);
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar esta cita?"))
      return;

    try {
      await adminApi(`/api/admin/appointments/${id}`, { method: "DELETE" });
      showToast("Cita eliminada correctamente", "success");
      await loadAppointments();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      showToast(error.message, "error");
    }
  };

  const handleEditField = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const renderPagination = () => {
    const pages = [];
    for (let i = 1; i <= Math.max(pagination.totalPages || 1, 1); i++) {
      pages.push(i);
    }

    return (
      <nav aria-label="Paginación de citas">
        <ul className="pagination">
          <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
            <button
              className="page-link"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              Anterior
            </button>
          </li>
          {pages.map((p) => (
            <li
              key={p}
              className={`page-item ${p === page ? "active" : ""}`}
            >
              <button className="page-link" onClick={() => setPage(p)}>
                {p}
              </button>
            </li>
          ))}
          <li
            className={`page-item ${
              page >= (pagination.totalPages || 1) ? "disabled" : ""
            }`}
          >
            <button
              className="page-link"
              onClick={() =>
                setPage((p) => Math.min(p + 1, pagination.totalPages || 1))
              }
            >
              Siguiente
            </button>
          </li>
        </ul>
      </nav>
    );
  };

  return (
    <div className="admin-section pt-3 pb-5">
      {/* Section Header */}
      <div className="section-header">
        <h2>
          <i className="fas fa-calendar-check me-2 text-primary" />
          Gestión de Citas
        </h2>
      </div>

      {/* Controls Bar */}
      <div className="controls-bar">
        <div className="row">
          <div className="col-md-5">
            <label className="form-label fw-bold">Búsqueda</label>
            <form className="input-group" onSubmit={handleSearch}>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por nombre, email o teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="btn btn-outline-secondary" type="submit">
                <i className="fas fa-search" />
              </button>
            </form>
          </div>
          <div className="col-md-3">
            <label className="form-label fw-bold">Estado</label>
            <select
              className="form-select"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="">Todos los estados</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label fw-bold">Fecha</label>
            <input
              type="date"
              className="form-control"
              value={date}
              onChange={(e) => {
                setPage(1);
                setDate(e.target.value);
              }}
            />
          </div>
          <div className="col-md-1">
            <label className="form-label fw-bold text-white">.</label>
            <button
              type="button"
              className="btn btn-primary w-100"
              onClick={() => loadAppointments()}
              title="Actualizar"
            >
              <i className="fas fa-sync-alt" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Card */}
      <div className="content-card">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="fas fa-list me-2" />
            Lista de Citas
          </h5>
          <div className="text-muted small">
            Total: {pagination.totalRecords ?? 0} citas
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table standard-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Contacto</th>
                  <th>Estado</th>
                  <th width="140">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="loading-state">
                      <i className="fas fa-spinner fa-spin" />
                      <div>Cargando citas...</div>
                    </td>
                  </tr>
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      <i className="fas fa-calendar-times" />
                      <h5>No hay citas</h5>
                      <p>
                        No se encontraron citas que coincidan con los criterios
                        de búsqueda.
                      </p>
                    </td>
                  </tr>
                ) : (
                  appointments.map((apt) => (
                    <tr key={apt.id}>
                      <td>{apt.id}</td>
                      <td>{formatDate(apt.date)}</td>
                      <td>{formatTime(apt.time)}</td>
                      <td>{apt.fullName}</td>
                      <td>
                        {apt.email ? <div>{apt.email}</div> : ""}
                        {apt.phone ? (
                          <div className="text-muted">{apt.phone}</div>
                        ) : (
                          ""
                        )}
                      </td>
                      <td>
                        <span className={`badge ${statusBadgeClass(apt.status)}`}>
                          {statusText(apt.status)}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            title="Editar"
                            onClick={() => openEditModal(apt.id)}
                          >
                            <i className="fas fa-edit" />
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            title="Eliminar"
                            onClick={() => handleDelete(apt.id)}
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="standard-pagination">{renderPagination()}</div>
        </div>
      </div>

      {/* Edit Appointment Modal */}
      <Modal
        show={editModalOpen}
        title="Editar Cita"
        onClose={() => setEditModalOpen(false)}
      >
        <form onSubmit={handleSaveEdit}>
          <div className="mb-3 p-3 bg-light rounded border">
            <h6 className="text-muted mb-2">
              <i className="fas fa-user-circle me-2" />
              Información del Paciente
            </h6>
            <p className="mb-1">
              <strong>Nombre:</strong> {editForm.fullName}
            </p>
            <p className="mb-1">
              <strong>Email:</strong> {editForm.email}
            </p>
            <p className="mb-0">
              <strong>Teléfono:</strong> {editForm.phone}
            </p>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Fecha</label>
                <input
                  type="date"
                  className="form-control"
                  value={editForm.date}
                  onChange={(e) => handleEditField("date", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Hora</label>
                <input
                  type="time"
                  className="form-control"
                  value={editForm.time}
                  onChange={(e) => handleEditField("time", e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Estado</label>
            <select
              className="form-select"
              value={editForm.status}
              onChange={(e) => handleEditField("status", e.target.value)}
              required
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Notas</label>
            <textarea
              className="form-control"
              rows="2"
              value={editForm.note}
              onChange={(e) => handleEditField("note", e.target.value)}
            />
          </div>

          <div className="text-end">
            <button
              type="button"
              className="btn btn-secondary me-2"
              onClick={() => setEditModalOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <span className="spinner-border spinner-border-sm me-1" />
              ) : (
                <i className="fas fa-save me-1" />
              )}
              Guardar Cambios
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
