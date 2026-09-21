// frontend/src/components/admin/pages/schedule/BusinessHoursTab.jsx
//
// Edits the standard weekly business hours. Loads the current schedule
// from the public /api/business-hours endpoint and bulk-saves changes
// through PUT /api/admin/business-hours.

import React, { useCallback, useEffect, useState } from "react";

import { showToast } from "../../toast";
import { adminApi } from "../../adminApi";

// Ordered Monday-first to match the backend's FIELD ordering.
const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DAY_LABELS = {
  Monday: "Lunes",
  Tuesday: "Martes",
  Wednesday: "Miércoles",
  Thursday: "Jueves",
  Friday: "Viernes",
  Saturday: "Sábado",
  Sunday: "Domingo",
};

function buildDefaultHours() {
  return WEEK_DAYS.reduce((acc, day) => {
    acc[day] = {
      isOpen: false,
      openTime: "09:00",
      closeTime: "18:00",
      breakStart: "",
      breakEnd: "",
    };
    return acc;
  }, {});
}

export default function BusinessHoursTab() {
  const [hours, setHours] = useState(buildDefaultHours);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadBusinessHours = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi("/api/business-hours");
      const loaded = buildDefaultHours();

      (data.businessHours || []).forEach((bh) => {
        const day = bh.dayOfWeek;
        if (loaded[day]) {
          loaded[day] = {
            isOpen: Boolean(bh.isOpen),
            openTime: (bh.openTime || "09:00").slice(0, 5),
            closeTime: (bh.closeTime || "18:00").slice(0, 5),
            breakStart: bh.breakStart ? bh.breakStart.slice(0, 5) : "",
            breakEnd: bh.breakEnd ? bh.breakEnd.slice(0, 5) : "",
          };
        }
      });

      setHours(loaded);
    } catch (error) {
      console.error("Error loading business hours:", error);
      showToast("Error cargando los horarios: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBusinessHours();
  }, [loadBusinessHours]);

  const handleFieldChange = (day, field, value) => {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleSave = async () => {
    const businessHours = WEEK_DAYS.map((day) => ({
      dayOfWeek: day,
      isOpen: hours[day].isOpen,
      openTime: hours[day].isOpen ? hours[day].openTime : null,
      closeTime: hours[day].isOpen ? hours[day].closeTime : null,
      breakStart: hours[day].breakStart || null,
      breakEnd: hours[day].breakEnd || null,
    }));

    const hasOpenDays = businessHours.some((day) => day.isOpen);
    if (!hasOpenDays) {
      showToast("Debe haber al menos un día abierto", "error");
      return;
    }

    for (const day of businessHours) {
      if (!day.isOpen) continue;
      if (day.openTime >= day.closeTime) {
        showToast(
          `${DAY_LABELS[day.dayOfWeek]}: la hora de apertura debe ser anterior a la de cierre`,
          "error"
        );
        return;
      }
      if (day.breakStart && day.breakEnd) {
        if (day.breakStart >= day.breakEnd) {
          showToast(
            `${DAY_LABELS[day.dayOfWeek]}: el descanso es inválido`,
            "error"
          );
          return;
        }
      }
    }

    setSaving(true);
    try {
      await adminApi("/api/admin/business-hours", {
        method: "PUT",
        body: { businessHours },
      });
      showToast("Horarios guardados exitosamente", "success");
    } catch (error) {
      console.error("Error saving business hours:", error);
      showToast("Error al guardar los horarios: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p className="text-muted mt-2 mb-0">Cargando horarios...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h5>
          <i className="fas fa-clock me-2" />
          Horarios Semanales Estándar
        </h5>
        <small className="text-muted">
          Configure los horarios regulares de atención para cada día de la
          semana
        </small>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Día</th>
                <th>Abierto</th>
                <th>Apertura</th>
                <th>Cierre</th>
                <th>Descanso (inicio)</th>
                <th>Descanso (fin)</th>
              </tr>
            </thead>
            <tbody>
              {WEEK_DAYS.map((day) => {
                const dayData = hours[day];
                return (
                  <tr key={day} className={dayData.isOpen ? "" : "table-light"}>
                    <td>
                      <strong>{DAY_LABELS[day]}</strong>
                    </td>
                    <td>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={dayData.isOpen}
                          onChange={(e) =>
                            handleFieldChange(day, "isOpen", e.target.checked)
                          }
                        />
                      </div>
                    </td>
                    <td>
                      <input
                        type="time"
                        className="form-control"
                        value={dayData.openTime}
                        disabled={!dayData.isOpen}
                        onChange={(e) =>
                          handleFieldChange(day, "openTime", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        className="form-control"
                        value={dayData.closeTime}
                        disabled={!dayData.isOpen}
                        onChange={(e) =>
                          handleFieldChange(day, "closeTime", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        className="form-control"
                        value={dayData.breakStart}
                        disabled={!dayData.isOpen}
                        onChange={(e) =>
                          handleFieldChange(day, "breakStart", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        className="form-control"
                        value={dayData.breakEnd}
                        disabled={!dayData.isOpen}
                        onChange={(e) =>
                          handleFieldChange(day, "breakEnd", e.target.value)
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-4">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => loadBusinessHours()}
          >
            <i className="fas fa-undo" /> Restablecer
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <span className="spinner-border spinner-border-sm me-1" />
            ) : (
              <i className="fas fa-save me-1" />
            )}
            Guardar Horarios
          </button>
        </div>
      </div>
    </div>
  );
}
