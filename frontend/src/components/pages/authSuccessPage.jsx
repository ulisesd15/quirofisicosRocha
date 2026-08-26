import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function completeGoogleLogin() {
      const token = searchParams.get('token');

      if (!token) {
        setError('No se recibió el token de autenticación de Google.');

        window.setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2500);

        return;
      }

      try {
        const response = await fetch('/api/auth/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.message ||
              result.error ||
              'No fue posible obtener la información de tu cuenta.'
          );
        }

        if (cancelled) return;

        login(token, result);

        navigate('/', { replace: true });
      } catch (requestError) {
        if (cancelled) return;

        setError(
          requestError.message ||
            'Ocurrió un error al completar el inicio de sesión.'
        );

        window.setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    }

    completeGoogleLogin();

    return () => {
      cancelled = true;
    };
  }, [login, navigate, searchParams]);

  return (
    <>
      <section className="hero d-flex align-items-center justify-content-center">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-6 col-md-8">
              <div className="card border-0 shadow-lg">
                <div className="card-body p-5 text-center">
                  {!error ? (
                    <>
                      <div className="mb-4">
                        <div
                          className="spinner-border text-primary"
                          role="status"
                          style={{ width: '3rem', height: '3rem' }}
                        >
                          <span className="visually-hidden">Cargando...</span>
                        </div>
                      </div>

                      <h2 className="text-primary mb-3">
                        <i className="fab fa-google me-2" />
                        Autenticando con Google
                      </h2>

                      <p className="text-muted mb-4">
                        Por favor espera mientras procesamos tu inicio de sesión...
                      </p>

                      <div className="d-flex justify-content-center">
                        <div className="progress" style={{ width: '200px', height: '6px' }}>
                          <div
                            className="progress-bar progress-bar-striped progress-bar-animated"
                            role="progressbar"
                            style={{ width: '100%' }}
                            aria-valuemin="0"
                            aria-valuemax="100"
                            aria-valuenow="100"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-danger fs-1 mb-3">
                        <i className="fas fa-circle-exclamation" />
                      </div>

                      <h2 className="text-danger mb-3">
                        No se pudo iniciar sesión
                      </h2>

                      <p className="text-muted mb-0">{error}</p>
                      <p className="small text-muted mt-3 mb-0">
                        Serás redirigido al inicio de sesión.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container">
          <div className="text-center">
            <small className="text-white-50">
              © 2025 Quirophisicos Rocha. Todos los derechos reservados.
            </small>
          </div>
        </div>
      </footer>
    </>
  );
}