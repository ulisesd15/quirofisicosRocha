/**
 * UserSettingsPage.jsx — React port of user-settings.html + user-settings.js.
 * Protected route: personal info form, password change (local accounts
 * only), and read-only account info (verification status, member since).
 *
 * The old page also had a "Preferencias de Notificación" form that posted to
 * /api/auth/notification-preferences — that endpoint doesn't exist anywhere
 * in the backend, so the form always failed silently. It's intentionally
 * left out of this migration rather than porting a feature with no backend
 * support; add it back once a real endpoint exists.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../api/authService';

export default function UserSettingsPage() {
  const { login } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [personalForm, setPersonalForm] = useState({ fullName: '', email: '', phone: '' });
  const [personalMessage, setPersonalMessage] = useState(null); // { type, text }
  const [savingPersonal, setSavingPersonal] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await authService.getProfile();
        if (!mounted) return;
        setProfile(data);
        setPersonalForm({ fullName: data.fullName || '', email: data.email || '', phone: data.phone || '' });
      } catch (err) {
        if (!mounted) return;
        setLoadError(err.message || 'Error al cargar los datos del usuario.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handlePersonalChange = (event) => {
    setPersonalForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handlePasswordChange = (event) => {
    setPasswordForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handlePersonalSubmit = async (event) => {
    event.preventDefault();
    setPersonalMessage(null);
    setSavingPersonal(true);
    try {
      await authService.updateProfile(personalForm);
      setPersonalMessage({ type: 'success', text: 'Información personal actualizada correctamente.' });
      // Refresh the cached session so the navbar/other pages pick up the new name right away.
      const token = localStorage.getItem('user_token') || localStorage.getItem('token');
      login(token, { ...profile, ...personalForm });
      setProfile((prev) => ({ ...prev, ...personalForm }));
    } catch (err) {
      setPersonalMessage({ type: 'danger', text: err.message || 'Error al actualizar información.' });
    } finally {
      setSavingPersonal(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordMessage(null);

    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'danger', text: 'Las contraseñas no coinciden.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'danger', text: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    setSavingPassword(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      setPasswordMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordMessage({ type: 'danger', text: err.message || 'Error al cambiar contraseña.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Cargando...';
  const showPasswordSection = profile && (!profile.authProvider || profile.authProvider === 'local');

  if (loading) {
    return (
      <div className="container py-5 text-center" data-testid="status-loading-settings">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p className="mt-3">Cargando tu configuración...</p>
      </div>
    );
  }

  return (
    <div className="container py-5 settings-page">
      <div className="row justify-content-center">
        <div className="col-xl-7 col-lg-9 col-md-11">
          <div className="text-center mb-4">
            <h1 className="h2 mb-2">
              <i className="fas fa-user-cog me-2" />
              Configuración de Usuario
            </h1>
            <p className="text-muted">Actualiza tu información personal y configuración de cuenta</p>
          </div>

          {loadError && (
            <div className="alert alert-danger" data-testid="text-settings-load-error">
              {loadError}
            </div>
          )}

          <div className="card settings-card">
            <div className="card-body p-4 p-md-5">
              {/* Personal Information */}
              <div className="settings-section mb-4">
                <h5 className="mb-3">
                  <i className="fas fa-user me-2 text-primary" />
                  Información Personal
                </h5>

                {personalMessage && (
                  <div className={`alert alert-${personalMessage.type}`} data-testid="text-personal-message">
                    {personalMessage.text}
                  </div>
                )}

                <form onSubmit={handlePersonalSubmit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label htmlFor="fullName" className="form-label">
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="fullName"
                        name="fullName"
                        value={personalForm.fullName}
                        onChange={handlePersonalChange}
                        required
                        data-testid="input-settings-fullname"
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="email" className="form-label">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        id="email"
                        name="email"
                        value={personalForm.email}
                        onChange={handlePersonalChange}
                        required
                        data-testid="input-settings-email"
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="phone" className="form-label">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        className="form-control"
                        id="phone"
                        name="phone"
                        placeholder="+52 1 234 567 8900"
                        value={personalForm.phone}
                        onChange={handlePersonalChange}
                        data-testid="input-settings-phone"
                      />
                    </div>
                    <div className="col-12 d-flex justify-content-end mt-3">
                      <button type="submit" className="btn btn-primary" disabled={savingPersonal} data-testid="button-save-personal">
                        <i className="fas fa-save me-2" />
                        {savingPersonal ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Password */}
              {showPasswordSection && (
                <div className="settings-section mb-4">
                  <h5 className="mb-3">
                    <i className="fas fa-lock me-2 text-warning" />
                    Cambiar Contraseña
                  </h5>

                  {passwordMessage && (
                    <div className={`alert alert-${passwordMessage.type}`} data-testid="text-password-message">
                      {passwordMessage.text}
                    </div>
                  )}

                  <form onSubmit={handlePasswordSubmit}>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label htmlFor="currentPassword" className="form-label">
                          Contraseña Actual
                        </label>
                        <input
                          type="password"
                          className="form-control"
                          id="currentPassword"
                          name="currentPassword"
                          value={passwordForm.currentPassword}
                          onChange={handlePasswordChange}
                          required
                          data-testid="input-current-password"
                        />
                      </div>
                      <div className="col-md-4">
                        <label htmlFor="newPassword" className="form-label">
                          Nueva Contraseña
                        </label>
                        <input
                          type="password"
                          className="form-control"
                          id="newPassword"
                          name="newPassword"
                          minLength={6}
                          value={passwordForm.newPassword}
                          onChange={handlePasswordChange}
                          required
                          data-testid="input-new-password"
                        />
                      </div>
                      <div className="col-md-4">
                        <label htmlFor="confirmPassword" className="form-label">
                          Confirmar Contraseña
                        </label>
                        <input
                          type="password"
                          className={`form-control ${
                            passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword ? 'is-invalid' : ''
                          }`}
                          id="confirmPassword"
                          name="confirmPassword"
                          value={passwordForm.confirmPassword}
                          onChange={handlePasswordChange}
                          required
                          data-testid="input-confirm-new-password"
                        />
                        {passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword && (
                          <div className="invalid-feedback">Las contraseñas no coinciden</div>
                        )}
                      </div>
                    </div>
                    <div className="d-flex justify-content-end mt-3">
                      <button type="submit" className="btn btn-warning" disabled={savingPassword} data-testid="button-save-password">
                        <i className="fas fa-key me-2" />
                        {savingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Account Info */}
              <div className="settings-section">
                <h5 className="mb-3">
                  <i className="fas fa-info-circle me-2 text-info" />
                  Información de la Cuenta
                </h5>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="card bg-light h-100">
                      <div className="card-body">
                        <h6 className="card-title">Estado de Verificación</h6>
                        <div data-testid="status-verification">
                          {profile?.isVerified ? (
                            <span className="badge bg-success">
                              <i className="fas fa-check me-1" />
                              Verificado
                            </span>
                          ) : (
                            <span className="badge bg-warning text-dark">
                              <i className="fas fa-clock me-1" />
                              Pendiente de Verificación
                            </span>
                          )}
                        </div>
                        <small className="text-muted mt-2 d-block">
                          Los usuarios verificados tienen acceso completo al sistema
                        </small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card bg-light h-100">
                      <div className="card-body">
                        <h6 className="card-title">Miembro Desde</h6>
                        <p className="card-text" data-testid="text-member-since">
                          {memberSince}
                        </p>
                        <small className="text-muted">Fecha de registro en el sistema</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-4">
            <Link to="/" className="btn btn-outline-primary btn-lg px-5 py-2">
              <i className="fas fa-arrow-left me-2" />
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
