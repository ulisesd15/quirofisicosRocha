// frontend/src/components/admin/pages/schedule/AnnouncementsTab.jsx
//
// Manage the announcements shown on the public site.
// Backed by /api/admin/announcements (CRUD).

import React, { useCallback, useEffect, useState } from "react";

import Modal from "../../Modal";
import { showToast } from "../../toast";
import { adminApi } from "../../adminApi";

const TYPE_OPTIONS = [
  { value: "info", label: "Información", color: "primary" },
  { value: "warning", label: "Advertencia", color: "warning" },
  { value: "success", label: "Buenas noticias", color: "success" },
  { value: "danger", label: "Urgente", color: "danger" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Baja" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const TYPE_COLORS = Object.fromEntries(
  TYPE_OPTIONS.map((t) => [t.value, t.color])
);

const EMPTY_FORM = {
  title: "",
  message: "",
  announcementType: "info",
  priority: "normal",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  showOnHomepage: true,
};

export default function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi("/api/admin/announcements");
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading announcements:", error);
      showToast("Error al cargar anuncios: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const openModal = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!form.title || !form.message || !form.startDate) {
      showToast("Título, mensaje y fecha de inicio son obligatorios", "error");
      return;
    }

    setSaving(true);
    try {
      await adminApi("/api/admin/announcements", {
        method: "POST",
        body: {
          title: form.title,
          message: form.message,
          announcementType: form.announcementType,
          priority: form.priority,
          startDate: form.startDate,
          endDate: form.endDate || null,
          showOnHomepage: form.showOnHomepage,
          showOnBooking: false,
        },
      });

      setModalOpen(false);
      showToast("Anuncio guardado exitosamente", "success");
      await loadAnnouncements();
    } catch (error) {
      console.error("Error saving announcement:", error);
      showToast("Error al guardar el anuncio: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Está seguro de eliminar este anuncio?")) return;

    try {
      await adminApi(`/api/admin/announcements/${id}`, { method: "DELETE" });
      showToast("Anuncio eliminado exitosamente", "success");
      await loadAnnouncements();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      showToast("Error al eliminar el anuncio: " + error.message, "error");
    }
  };

  const formatDateRange = (start, end) => {
    const s = start ? start.split("T")[0] : "";
    const e = end ? end.split("T")[0] : "";
    if (!s) return "";
    if (!e || s === e) return s;
    return `${s} — ${e}`;
  };

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">
            <i className="fas fa-bullhorn me-2" />
            Anuncios y Banners
          </h5>
          <small className="text-muted">
            Gestione los anuncios que aparecen en la página principal del sitio
            web
          </small>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          <i className="fas fa-plus" /> Nuevo Anuncio
        </button>
      </div>
      <div className="card-body">
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="text-muted mt-2 mb-0">Cargando anuncios...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center text-muted py-4">
            <i className="fas fa-bullhorn fa-3x mb-3" />
            <p>
              No hay anuncios activos. Usa el botón "Nuevo Anuncio" para crear
              uno.
            </p>
          </div>
        ) : (
          announcements.map((announcement) => {
            const typeColor =
              TYPE_COLORS[announcement.announcementType] || "primary";
            return (
              <div className="card mb-3" key={announcement.id}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <h6 className="card-title d-flex align-items-center flex-wrap gap-1">
                        <i className={`fas fa-bullhorn me-2 text-${typeColor}`} />
                        {announcement.title}
                        <span className={`badge bg-${typeColor} ms-2`}>
                          {announcement.announcementType}
                        </span>
                        <span className="badge bg-secondary ms-1">
                          {announcement.priority}
                        </span>
                      </h6>
                      <p className="card-text">
                        {announcement.message || announcement.content}
                      </p>
                      <div className="d-flex gap-3 small text-muted">
                        <span>
                          <i className="fas fa-calendar" />{" "}
                          {formatDateRange(
                            announcement.startDate,
                            announcement.endDate
                          )}
                        </span>
                        {announcement.showOnHomepage && (
                          <span className="badge bg-success">
                            En página principal
                          </span>
                        )}
                        {announcement.createdByName && (
                          <span>Por: {announcement.createdByName}</span>
                        )}
                      </div>
                    </div>
                    <div className="btn-group">
                      <button
                        className="btn btn-outline-danger btn-sm"
                        title="Eliminar"
                        onClick={() => handleDelete(announcement.id)}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Announcement Modal */}
      <Modal
        show={modalOpen}
        title="Nuevo Anuncio"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSave}>
          <div className="mb-3">
            <label className="form-label">Título</label>
            <input
              type="text"
              className="form-control"
              value={form.title}
              onChange={(e) => handleField("title", e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Mensaje</label>
            <textarea
              className="form-control"
              rows="3"
              value={form.message}
              onChange={(e) => handleField("message", e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Tipo</label>
            <select
              className="form-select"
              value={form.announcementType}
              onChange={(e) =>
                handleField("announcementType", e.target.value)
              }
              required
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Prioridad</label>
            <select
              className="form-select"
              value={form.priority}
              onChange={(e) => handleField("priority", e.target.value)}
              required
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="row mb-3">
            <div className="col">
              <label className="form-label">Fecha de inicio</label>
              <input
                type="date"
                className="form-control"
                value={form.startDate}
                onChange={(e) => handleField("startDate", e.target.value)}
                required
              />
            </div>
            <div className="col">
              <label className="form-label">Fecha de fin</label>
              <input
                type="date"
                className="form-control"
                value={form.endDate}
                onChange={(e) => handleField("endDate", e.target.value)}
              />
            </div>
          </div>
          <div className="form-check mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="announcement-active"
              checked={form.showOnHomepage}
              onChange={(e) => handleField("showOnHomepage", e.target.checked)}
            />
            <label
              className="form-check-label"
              htmlFor="announcement-active"
            >
              Mostrar en página principal
            </label>
          </div>

          <div className="text-end">
            <button
              type="button"
              className="btn btn-secondary me-2"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <span className="spinner-border spinner-border-sm me-1" />
              ) : (
                <i className="fas fa-bullhorn me-1" />
              )}
              Publicar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
