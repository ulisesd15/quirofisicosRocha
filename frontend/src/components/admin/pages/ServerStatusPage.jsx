// frontend/src/components/admin/pages/ServerStatusPage.jsx
//
// Server health overview: process stats from /api/admin/server/status
// plus client-side reachability checks for key public endpoints.

import React, { useCallback, useEffect, useState } from "react";

import { adminApi } from "../adminApi";

const CHECKED_ENDPOINTS = [
  { label: "/api/health", path: "/api/health" },
  { label: "/api/business-hours", path: "/api/business-hours" },
  { label: "/api/announcements/active", path: "/api/announcements/active" },
];

function formatUptime(secondsString) {
  const seconds = parseFloat(secondsString);
  if (isNaN(seconds)) return secondsString;

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days} días`);
  if (hours > 0) parts.push(`${hours} horas`);
  parts.push(`${minutes} minutos`);
  return parts.join(", ");
}

export default function ServerStatusPage() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [endpoints, setEndpoints] = useState(
    CHECKED_ENDPOINTS.map((endpoint) => ({
      ...endpoint,
      state: "checking",
      responseTime: null,
    }))
  );

  const loadStatus = useCallback(async () => {
    try {
      const data = await adminApi("/api/admin/server/status");
      setStatus(data);
      setError("");
    } catch (err) {
      console.error("Error loading server status:", err);
      setError(err.message);
    }
  }, []);

  const checkEndpoints = useCallback(async () => {
    // Reset all rows to "checking"
    setEndpoints((prev) =>
      prev.map((endpoint) => ({
        ...endpoint,
        state: "checking",
        responseTime: null,
      }))
    );

    for (const endpoint of CHECKED_ENDPOINTS) {
      const started = performance.now();
      try {
        const response = await fetch(endpoint.path);
        const elapsed = Math.round(performance.now() - started);
        setEndpoints((prev) =>
          prev.map((item) =>
            item.path === endpoint.path
              ? {
                  ...item,
                  state: response.ok ? "up" : "degraded",
                  responseTime: elapsed,
                }
              : item
          )
        );
      } catch {
        setEndpoints((prev) =>
          prev.map((item) =>
            item.path === endpoint.path
              ? { ...item, state: "down", responseTime: null }
              : item
          )
        );
      }
    }
  }, []);

  useEffect(() => {
    loadStatus();
    checkEndpoints();
  }, [loadStatus, checkEndpoints]);

  const stateBadge = (state) => {
    switch (state) {
      case "up":
        return <span className="badge bg-success">Operativo</span>;
      case "degraded":
        return <span className="badge bg-warning text-dark">Degradado</span>;
      case "down":
        return <span className="badge bg-danger">Sin respuesta</span>;
      default:
        return <span className="badge bg-secondary">Verificando...</span>;
    }
  };

  return (
    <div className="admin-section pt-3 pb-5">
      {/* Section Header */}
      <div className="section-header">
        <h2>
          <i className="fas fa-server me-2 text-danger" />
          Estado del Servidor
        </h2>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2" />
          {error}
        </div>
      )}

      {/* Server Header Cards */}
      <div className="row mb-4" id="server-header-cards">
        <div className="col-6 col-lg-3 mb-3">
          <div className="card">
            <div className="card-body">
              <h6 className="card-title">Estado General</h6>
              {status ? (
                status.isHealthy ? (
                  <span className="badge bg-success fs-6">Saludable</span>
                ) : (
                  <span className="badge bg-danger fs-6">Con problemas</span>
                )
              ) : (
                <span className="spinner-border spinner-border-sm" />
              )}
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3 mb-3">
          <div className="card">
            <div className="card-body">
              <h6 className="card-title">Tiempo Activo</h6>
              <p className="mb-0">
                {status ? formatUptime(status.uptime) : "—"}
              </p>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3 mb-3">
          <div className="card">
            <div className="card-body">
              <h6 className="card-title">Memoria (RSS)</h6>
              <p className="mb-0">
                {status ? `${status.memoryUsage} MB` : "—"}
              </p>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3 mb-3">
          <div className="card">
            <div className="card-body">
              <h6 className="card-title">CPU (indicador)</h6>
              <p className="mb-0">
                {status ? `${status.cpuUsage}%` : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* API Endpoints Health Check */}
      <div className="content-card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-heartbeat me-2" />
            Estado de Endpoints API
          </h5>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={checkEndpoints}
          >
            <i className="fas fa-sync-alt" /> Verificar Todo
          </button>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Estado</th>
                  <th>Tiempo de Respuesta</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((endpoint) => (
                  <tr key={endpoint.path}>
                    <td>{endpoint.label}</td>
                    <td>{stateBadge(endpoint.state)}</td>
                    <td>
                      {endpoint.responseTime
                        ? `${endpoint.responseTime} ms`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
