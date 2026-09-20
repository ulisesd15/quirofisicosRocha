// frontend/src/pages/NotFoundPage.jsx
import React from "react";

import { Link } from "react-router-dom";



export default function NotFoundPage() {
  return (
    <main className="page-shell">
      <section className="card">
        <h1>Página no encontrada</h1>
        <p>La ruta que solicitaste no existe.</p>

        <Link to="/">Volver al inicio</Link>
      </section>
    </main>
  );
}