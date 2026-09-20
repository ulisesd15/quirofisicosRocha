import React from "react";
import { Link } from "react-router-dom";
import "../../../style/style.css";
import "../../../style/navigation.css";

/**
 * Placeholder for the admin panel while the admin modules are
 * migrated from the legacy frontend. Every /admin/* route renders
 * this page so navbar links and post-login redirects never 404.
 */
export default function AdminPage() {
  return (
    <section
      className="hero d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh" }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-8">
            <div className="card border-0 shadow-lg">
              <div className="card-body p-5 text-center">
                <h2 className="text-primary mb-3">
                  <i className="fas fa-chart-line me-2" />
                  Panel de Administración
                </h2>

                <p className="text-muted mb-4">
                  Los módulos de administración aún se están migrando a la
                  nueva aplicación. Pronto estarán disponibles aquí.
                </p>

                <Link to="/" className="btn btn-primary px-4 py-2 rounded-pill">
                  <i className="fas fa-home me-2" />
                  Volver al inicio
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
