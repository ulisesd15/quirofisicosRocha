// frontend/src/pages/UserSettingsPage.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import "../../../style/userSettings.css"

function UserSettingsPage() {
  const auth = useAuth() || {};
  const {
    isLoggedIn,
    authHeaders,      // e.g. { Authorization: 'Bearer <token>' }
    user,
    setUser,          // optional: update user in auth context
    userName,
    setUserName,      // optional: update display name in auth context
  } = auth;

  const [loading, setLoading] = useState(true);

  // Personal info state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);

  // Account info
  const [isVerified, setIsVerified] = useState(false);
  const [memberSince, setMemberSince] = useState('Cargando...');
  const [authProvider, setAuthProvider] = useState('local');

  // UI alert
  const [alert, setAlert] = useState(null); // { type: 'success'|'danger'|'info', message: string }

  // Redirect to login if not authenticated (mirrors AuthManager.isLoggedIn check)
  useEffect(() => {
    if (isLoggedIn === false) {
      window.location.href = '/login';
    }
  }, [isLoggedIn]);

  // Load user profile on mount
  useEffect(() => {
    if (!isLoggedIn) return;

    const loadUserData = async () => {
      try {
        const res = await fetch('/api/auth/profile', {
          headers: {
            'Content-Type': 'application/json',
            ...(authHeaders || {}),
          },
        });

        if (!res.ok) {
          throw new Error('Error al cargar datos del usuario');
        }

        const userData = await res.json();

        // Personal info
        setFullName(userData.fulName || '');
        setEmail(userData.email || '');
        setPhone(userData.phone || '');

        // Account info
        setIsVerified(Boolean(userData.isVerified));
        if (userData.createdAt) {
          const memberDate = new Date(userData.createdAt).toLocaleDateString(
            'es-ES',
            { year: 'numeric', month: 'long', day: 'numeric' }
          );
          setMemberSince(memberDate);
        }

        // Auth provider (hide password section if not local)
        setAuthProvider(userData.authProvider || 'local');

        // Notification preferences (if backend stores them on profile)
        if (typeof userData.emailNotifications === 'boolean') {
          setEmailNotifications(userData.emailNotifications);
        }
        if (typeof userData.smsNotifications === 'boolean') {
          setSmsNotifications(userData.smsNotifications);
        }

        // Optionally sync auth context user
        if (setUser) {
          setUser(userData);
        }
        if (setUserName && userData.fullName) {
          setUserName(userData.fullName);
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        showAlert('Error al cargar los datos del usuario', 'danger');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Password confirm validation (replaces setCustomValidity)
  useEffect(() => {
    if (confirmPassword && newPassword && confirmPassword !== newPassword) {
      setPasswordError('Las contraseñas no coinciden');
    } else {
      setPasswordError('');
    }
  }, [newPassword, confirmPassword]);

  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });

    if (type === 'success') {
      setTimeout(() => {
        setAlert(null);
      }, 5000);
    }
  };

  const handlePersonalInfoSubmit = async (e) => {
    e.preventDefault();

    const formData = {
      fullName: fullName,
      email,
      phone,
    };

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeaders || {}),
        },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Error al actualizar información');
      }

      showAlert('Información personal actualizada correctamente', 'success');

      // Update stored user name if it changed
      if (setUserName && formData.fullName && formData.fullName !== userName) {
        setUserName(formData.fullName);
      }
      if (setUser && user) {
        setUser({ ...user, fullName: formData.fullName, email, phone });
      }
    } catch (err) {
      console.error('Error updating personal info:', err);
      showAlert(err.message, 'danger');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      showAlert('Las contraseñas no coinciden', 'danger');
      return;
    }

    // Validate password strength
    if (newPassword.length < 6) {
      showAlert('La contraseña debe tener al menos 6 caracteres', 'danger');
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeaders || {}),
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Error al cambiar contraseña');
      }

      showAlert('Contraseña actualizada correctamente', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Error updating password:', err);
      showAlert(err.message, 'danger');
    }
  };

  const handleNotificationSubmit = async (e) => {
    e.preventDefault();

    const preferences = {
      emailNotifications: emailNotifications,
      smsNotifications: smsNotifications,
    };

    try {
      const res = await fetch('/api/auth/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeaders || {}),
        },
        body: JSON.stringify(preferences),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(
          result.error || 'Error al actualizar preferencias'
        );
      }

      showAlert('Preferencias de notificación actualizadas', 'success');
    } catch (err) {
      console.error('Error updating notification preferences:', err);
      showAlert(err.message, 'danger');
    }
  };

  if (!isLoggedIn && loading) {
    // Initial state while auth status is resolving
    return (
      <div className="container py-5">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="container py-5 settings-page">
      <div className="row justify-content-center">
        <div className="col-xl-7 col-lg-9 col-md-11">
          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="h2 mb-2">
              <i className="fas fa-user-cog me-2" />
              Configuración de Usuario
            </h1>
            <p className="text-muted">
              Actualiza tu información personal y configuración de cuenta
            </p>
          </div>

          {/* Alert Container */}
          {alert && (
            <div
              className={`alert alert-${alert.type} alert-dismissible fade show alert-custom`}
              role="alert"
            >
              <i
                className={`fas ${
                  alert.type === 'success'
                    ? 'fa-check-circle'
                    : alert.type === 'danger'
                    ? 'fa-exclamation-circle'
                    : 'fa-info-circle'
                } me-2`}
              />
              {alert.message}
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={() => setAlert(null)}
              />
            </div>
          )}

          {/* Settings Card */}
          <div className="card settings-card">
            <div className="card-body p-4 p-md-5">
              {/* Personal Information Section */}
              <div className="settings-section">
                <h5 className="mb-3">
                  <i className="fas fa-user me-2 text-primary" />
                  Información Personal
                </h5>
                <form onSubmit={handlePersonalInfoSubmit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label htmlFor="full-name" className="form-label">
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="full-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
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
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+52 1 234 567 8900"
                      />
                    </div>
                    <div className="col-12 d-flex justify-content-end mt-3">
                      <button type="submit" className="btn btn-primary">
                        <i className="fas fa-save me-2" aria-hidden="true" />
                        Guardar Cambios
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Password Section (hidden for non-local providers) */}
              {authProvider === 'local' && (
                <div className="settings-section" id="password-section">
                  <h5 className="mb-3">
                    <i className="fas fa-lock me-2 text-warning" />
                    Cambiar Contraseña
                  </h5>
                  <form onSubmit={handlePasswordSubmit}>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label
                          htmlFor="current-password"
                          className="form-label"
                        >
                          Contraseña Actual
                        </label>
                        <input
                          type="password"
                          className="form-control"
                          id="current-password"
                          value={currentPassword}
                          onChange={(e) =>
                            setCurrentPassword(e.target.value)
                          }
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <label htmlFor="new-password" className="form-label">
                          Nueva Contraseña
                        </label>
                        <input
                          type="password"
                          className="form-control"
                          id="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                      </div>
                      <div className="col-md-4">
                        <label
                          htmlFor="confirm-password"
                          className="form-label"
                        >
                          Confirmar Contraseña
                        </label>
                        <input
                          type="password"
                          className={
                            'form-control' +
                            (passwordError ? ' is-invalid' : '')
                          }
                          id="confirm-password"
                          value={confirmPassword}
                          onChange={(e) =>
                            setConfirmPassword(e.target.value)
                          }
                          required
                        />
                        {passwordError && (
                          <div className="invalid-feedback">
                            {passwordError}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="d-flex justify-content-end mt-3">
                      <button type="submit" className="btn btn-warning">
                        <i className="fas fa-key me-2" aria-hidden="true" />
                        Actualizar Contraseña
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Account Information Section */}
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
                        <div id="verification-status">
                          {loading ? (
                            <span className="badge bg-secondary">
                              Cargando...
                            </span>
                          ) : isVerified ? (
                            <span className="badge bg-success">
                              <i className="fas fa-check me-1" />
                              Verificado
                            </span>
                          ) : (
                            <span className="badge bg-warning">
                              <i className="fas fa-clock me-1" />
                              Pendiente de Verificación
                            </span>
                          )}
                        </div>
                        <small className="text-muted mt-2 d-block">
                          Los usuarios verificados tienen acceso completo al
                          sistema
                        </small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card bg-light h-100">
                      <div className="card-body">
                        <h6 className="card-title">Miembro Desde</h6>
                        <p className="card-text" id="member-since">
                          {memberSince}
                        </p>
                        <small className="text-muted">
                          Fecha de registro en el sistema
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notification Preferences */}
              <div className="settings-section">
                <h5 className="mb-3">
                  <i className="fas fa-bell me-2 text-success" />
                  Preferencias de Notificación
                </h5>
                <form onSubmit={handleNotificationSubmit}>
                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="email-notifications"
                      checked={emailNotifications}
                      onChange={(e) =>
                        setEmailNotifications(e.target.checked)
                      }
                    />
                    <label
                      className="form-check-label"
                      htmlFor="email-notifications"
                    >
                      <strong>Notificaciones por Email</strong>
                      <br />
                      <small className="text-muted">
                        Recibir confirmaciones y recordatorios de citas por
                        correo
                      </small>
                    </label>
                  </div>
                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="sms-notifications"
                      checked={smsNotifications}
                      onChange={(e) =>
                        setSmsNotifications(e.target.checked)
                      }
                    />
                    <label
                      className="form-check-label"
                      htmlFor="sms-notifications"
                    >
                      <strong>Notificaciones por SMS</strong>
                      <br />
                      <small className="text-muted">
                        Recibir recordatorios y confirmaciones por mensaje de
                        texto
                      </small>
                    </label>
                  </div>
                  <div className="d-flex justify-content-end">
                    <button type="submit" className="btn btn-success">
                      <i className="fas fa-save me-2" aria-hidden="true" />
                      Guardar Preferencias
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Back Button */}
          <div className="text-center mt-4">
            <a
              href="/"
              className="btn btn-outline-primary btn-lg px-5 py-2"
            >
              <i className="fas fa-arrow-left me-2" aria-hidden="true" />
              Volver al Inicio
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserSettingsPage;