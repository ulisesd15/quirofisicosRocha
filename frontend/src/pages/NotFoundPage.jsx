import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="auth-hero d-flex align-items-center justify-content-center text-center">
      <div className="container">
        <h1 className="mb-3">404</h1>
        <p className="lead text-muted mb-4">No pudimos encontrar la página que buscas.</p>
        <Link to="/" className="btn btn-primary" data-testid="link-home">
          Volver al inicio
        </Link>
      </div>
    </section>
  );
}
