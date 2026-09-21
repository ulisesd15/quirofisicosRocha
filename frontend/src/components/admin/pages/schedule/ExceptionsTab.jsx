// frontend/src/components/admin/pages/schedule/ExceptionsTab.jsx
//
// Manage schedule exceptions: full-day closures, custom hours for a
// date or date range. Backed by /api/admin/schedule-exceptions.

import React, { useCallback, useEffect, useState } from "react";

import Modal from "../../Modal";
import { showToast } from "../../toast";
import { adminApi, formatDate } from "../../adminApi";

const EMPTY_FORM = {
  exceptionType: "single_day",
  reason: "",
  description: "",
  startDate: "",
  endDate: "",
  isClosed: true,
  customOpenTime: "09:00",
  customCloseTime: "18:00",
  recurringType: "",
};

export default function ExceptionsTab() {
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadExceptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi("/api/admin/schedule-exceptions");
      setExceptions(data.scheduleExceptions || []);
    } catch (error) {
      console.error("Error loading schedule exceptions:", error);
      showToast("Error cargando las excepciones: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExceptions();
  }, [loadExceptions]);

  const openModal = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!form.reason || !form.startDate) {
      showToast("Por favor complete los campos requeridos", "error");
      return;
    }

    if (
      !form.isClosed &&
      (!form.customOpenTime || !form.customCloseTime)
    ) {
      showToast("Por favor especifique las horas personalizadas", "error");
      return;
    }

    setSaving(true);
    try {
      await adminApi("/api/admin/schedule-exceptions", {
        method: "POST",
        body: {
          exceptionType: form.exceptionType,
          reason: form.reason,
          description: form.description,
          startDate: form.startDate,
          endDate:
            form.exceptionType === "date_range" ? form.endDate || null : null,
          isClosed: form.isClosed,
          customOpenTime: form.isClosed ? null : form.customOpenTime,
          customCloseTime: form.isClosed ? null : form.customCloseTime,
          recurringType: form.recurringType,
        },
      });

      setModalOpen(false);
      showToast("Excepción guardada exitosamente", "success");
      await loadExceptions();
    } catch (error) {
      console.error("Error saving exception:", error);
      showToast("Error al guardar la excepción: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Está seguro de eliminar esta excepción?")) return;

    try {
      await adminApi(`/api/admin/schedule-exceptions/${id}`, {
        method: "DELETE",
      });
      showToast("Excepción eliminada", "success");
      await loadExceptions();
    } catch (error) {
      console.error("Error deleting exception:", error);
      showToast("Error al eliminar: " + error.message, "error");
    }
  };

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">
            <i className="fas fa-calendar-times me-2" />
            Excepciones de Horario
          </h5>
          <small className="text-muted">
            Gestione cierres completos, horarios especiales y excepciones
            temporales
          </small>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          <i className="fas fa-plus" /> Nueva Excepción
        </button>
      </div>
      <div className="card-body">
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="text-muted mt-2 mb-0">Cargando excepciones...</p>
          </div>
        ) : exceptions.length === 0 ? (
          <div className="alert alert-info mb-0">
            <i className="fas fa-info-circle me-2" />
            No hay excepciones de horario configuradas.
          </div>
        ) : (
          exceptions.map((exc) => (
            <div className="card mb-3" key={exc.id}>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-8">
                    <h6>
                      {exc.reason || exc.name || "Excepción"}
                    </h6>
                    <p className="mb-1">
                      <strong>Inicio:</strong> {formatDate(exc.startDate)}
                      {exc.endDate ? (
                        <>
                          {" "}
                          — <strong>Fin:</strong> {formatDate(exc.endDate)}
                        </>
                      ) : null}
                    </p>
                    {exc.description && (
                      <p className="text-muted mb-1">{exc.description}</p>
                    )}
                    <div>
                      {exc.isClosed ? (
                        <span className="badge bg-danger">
                          Cerrado todo el día
                        </span>
                      ) : (
                        <span className="badge bg-success">
                          {exc.customOpenTime} - {exc.customCloseTime}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-md-4 text-end">
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDelete(exc.id)}
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Exception Modal */}
      <Modal
        show={modalOpen}
        title="Nueva Excepción de Horario"
        size="lg"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSave}>
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label fw-bold">Tipo de Excepción</label>
              <select
                className="form-select"
                value={form.exceptionType}
                onChange={(e) => handleField("exceptionType", e.target.value)}
                required
              >
                <option value="single_day">Día específico</option>
                <option value="date_range">Rango de fechas</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-bold">Motivo</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej: Vacaciones, Feriado, Mantenimiento"
                value={form.reason}
                onChange={(e) => handleField("reason", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label fw-bold">Fecha de inicio</label>
              <input
                type="date"
                className="form-control"
                value={form.startDate}
                onChange={(e) => handleField("startDate", e.target.value)}
                required
              />
            </div>
            {form.exceptionType === "date_range" && (
              <div className="col-md-6">
                <label className="form-label fw-bold">Fecha de fin</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.endDate}
                  onChange={(e) => handleField("endDate", e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="card border-primary mb-3">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0">
                <i className="fas fa-cogs me-2" />
                Configuración del Horario
              </h6>
            </div>
            <div className="card-body">
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="exception-is-closed"
                  checked={form.isClosed}
                  onChange={(e) => handleField("isClosed", e.target.checked)}
                />
                <label
                  className="form-check-label fw-bold text-danger"
                  htmlFor="exception-is-closed"
                >
                  Cerrado completamente
                </label>
              </div>

              {!form.isClosed && (
                <div>
                  <h6 className="text-muted mb-3">Horario personalizado:</h6>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Hora apertura</label>
                      <input
                        type="time"
                        className="form-control"
                        value={form.customOpenTime}
                        onChange={(e) =>
                          handleField("customOpenTime", e.target.value)
                        }
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Hora cierre</label>
                      <input
                        type="time"
                        className="form-control"
                        value={form.customCloseTime}
                        onChange={(e) =>
                          handleField("customCloseTime", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="exception-recurring"
                  checked={form.recurringType === "yearly"}
                  onChange={(e) =>
                    handleField(
                      "recurringType",
                      e.target.checked ? "yearly" : ""
                    )
                  }
                />
                <label
                  className="form-check-label"
                  htmlFor="exception-recurring"
                >
                  Repetir anualmente
                </label>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">
              Descripción adicional (opcional)
            </label>
            <textarea
              className="form-control"
              rows="2"
              placeholder="Información adicional sobre la excepción..."
              value={form.description}
              onChange={(e) => handleField("description", e.target.value)}
            />
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
                <i className="fas fa-save me-1" />
              )}
              Guardar Excepción
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
