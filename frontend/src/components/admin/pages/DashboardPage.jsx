// frontend/src/components/admin/pages/DashboardPage.jsx
//
// Key metrics (users, appointments, today, pending) plus the most
// recent appointments table. Cards navigate to their sections.

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { adminApi, formatDate, formatTime, statusBadgeClass, statusText } from "../adminApi";

export default function DashboardPage() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await adminApi("/api/admin/dashboard/stats");
        if (!cancelled) setStats(data);
      } catch (err) {
        console.error("Error loading dashboard:", err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    {
      id: "total-users",
      label: "Total Usuarios",
      value: stats?.totalUsers ?? 0,
      icon: "fa-users",
      to: "/admin/users",
    },
    {
      id: "total-appointments",
      label: "Total Citas",
      value: stats?.totalAppointments ?? 0,
      icon: "fa-calendar-check",
      to: "/admin/appointments",
    },
    {
      id: "today-appointments",
      label: "Citas Hoy",
      value: stats?.todayAppointments ?? 0,
      icon: "fa-calendar-day",
      to: "/admin/appointments",
    },
    {
      id: "pending-appointments",
      label: "Citas Pendientes",
      value: stats?.pendingAppointments ?? 0,
      icon: "fa-user-check",
      to: "/admin/verificacion",
    },
  ];

  const recentAppointments = stats?.recentAppointments || [];

  return (
    <div className="admin-section pt-3 pb-5">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Dashboard</h1>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2" />
          {error}
        </div>
      )}

      <div className="row">
        {cards.map((card) => (
          <div className="col-6 col-lg-3 mb-4" key={card.id}>
            <div
              className="card dashboard-card"
              onClick={() => navigate(card.to)}
              role="button"
            >
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-title">{card.label}</h6>
                    <h2>
                      {loading ? (
                        <span className="spinner-border spinner-border-sm" />
                      ) : (
                        card.value
                      )}
                    </h2>
                  </div>
                  <div className="align-self-center">
                    <i className={`fas ${card.icon} fa-2x`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Appointments */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="fas fa-calendar-check me-2" />
                Citas Recientes
              </h5>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => navigate("/admin/appointments")}
              >
                Ver todas <i className="fas fa-arrow-right ms-1" />
              </button>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Paciente</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="text-center">Cargando...</td>
                      </tr>
                    ) : recentAppointments.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center">
                          No hay citas recientes
                        </td>
                      </tr>
                    ) : (
                      recentAppointments.map((apt) => (
                        <tr key={apt.id}>
                          <td>{formatDate(apt.date)}</td>
                          <td>{formatTime(apt.time)}</td>
                          <td>{apt.fullName}</td>
                          <td>
                            <span className={`badge ${statusBadgeClass(apt.status)}`}>
                              {statusText(apt.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
