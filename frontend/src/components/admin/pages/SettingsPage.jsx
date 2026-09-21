// frontend/src/components/admin/pages/SettingsPage.jsx
//
// Clinic-wide configuration: general info and appointment rules.
// Backed by GET/PUT /api/admin/settings.

import React, { useCallback, useEffect, useState } from "react";

import { showToast } from "../toast";
import { adminApi } from "../adminApi";

const DEFAULTS = {
  clinicName: "Quirofísicos Rocha",
  clinicPhone: "",
  clinicAddress: "",
  clinicEmail: "",
  clinicDescription: "",
  appointmentDuration: "60",
  advanceBookingDays: "30",
  autoConfirmAppointments: false,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadClinicSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi("/api/admin/settings");

      const flat = { ...DEFAULTS };
      Object.keys(data || {}).forEach((key) => {
        flat[key] = data[key]?.value ?? data[key] ?? "";
      });
      flat.autoConfirmAppointments =
        String(flat.autoConfirmAppointments) === "true";

      setSettings(flat);
    } catch (error) {
      console.error("Error loading settings:", error);
      showToast("Error cargando la configuración: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClinicSettings();
  }, [loadClinicSettings]);

  const handleField = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);

    const settingsToSave = [
      { key: "clinicName", value: settings.clinicName },
      { key: "clinicPhone", value: settings.clinicPhone },
      { key: "clinicAddress", value: settings.clinicAddress },
      { key: "clinicEmail", value: settings.clinicEmail },
      { key: "clinicDescription", value: settings.clinicDescription },
      { key: "appointmentDuration", value: settings.appointmentDuration },
      { key: "advanceBookingDays", value: settings.advanceBookingDays },
      {
        key: "autoConfirmAppointments",
        value: settings.autoConfirmAppointments ? "true" : "false",
      },
    ];

    try {
      await adminApi("/api/admin/settings", {
        method: "PUT",
        body: { settings: settingsToSave },
      });
      showToast("Configuración guardada correctamente", "success");
    } catch (error) {
      console.error("Error saving settings:", error);
      showToast("Error guardando la configuración: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-section pt-3 pb-5">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="text-muted mt-2 mb-0">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-section pt-3 pb-5">
      {/* Section Header */}
      <div className="section-header">
        <h2>
          <i className="fas fa-cogs me-2 text-warning" />
          Configuración del Sistema
        </h2>
      </div>

      <div className="content-card">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="fas fa-cog me-2" />
            Configuración General de la Clínica
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSave}>
            <div className="settings-group">
              <h6>Información General</h6>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Nombre de la Clínica</label>
                    <input
                      type="text"
                      className="form-control"
                      value={settings.clinicName || ""}
                      onChange={(e) => handleField("clinicName", e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Teléfono</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={settings.clinicPhone || ""}
                      onChange={(e) => handleField("clinicPhone", e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Dirección</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={settings.clinicAddress || ""}
                  onChange={(e) => handleField("clinicAddress", e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Email de Contacto</label>
                <input
                  type="email"
                  className="form-control"
                  value={settings.clinicEmail || ""}
                  onChange={(e) => handleField("clinicEmail", e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Descripción de la Clínica</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={settings.clinicDescription || ""}
                  onChange={(e) =>
                    handleField("clinicDescription", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="settings-group">
              <h6>Configuración de Citas</h6>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">
                      Duración de Cita (minutos)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      min="15"
                      max="180"
                      step="15"
                      value={settings.appointmentDuration || "60"}
                      onChange={(e) =>
                        handleField("appointmentDuration", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">
                      Días máximos de anticipación
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      max="365"
                      value={settings.advanceBookingDays || "30"}
                      onChange={(e) =>
                        handleField("advanceBookingDays", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="form-check mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="autoConfirmAppointments"
                  checked={Boolean(settings.autoConfirmAppointments)}
                  onChange={(e) =>
                    handleField("autoConfirmAppointments", e.target.checked)
                  }
                />
                <label
                  className="form-check-label"
                  htmlFor="autoConfirmAppointments"
                >
                  Confirmar citas automáticamente
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary mt-3"
              disabled={saving}
            >
              {saving ? (
                <span className="spinner-border spinner-border-sm me-1" />
              ) : (
                <i className="fas fa-save me-1" />
              )}
              Guardar Cambios
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
