/**
 * user-settings.js
 *
 * Handles the user settings page for Quirofísicos Rocha:
 * - Loads and updates user profile information.
 * - Handles password changes and notification preferences.
 * - Integrates with AuthManager for authentication and session management.
 * - Provides user feedback and error handling in the UI.
 */

class UserSettings {
    /**
     * Initializes UserSettings and triggers initial load.
     */
    constructor() {
        this.authManager = new AuthManager();
        this.init();
    }

    /**
     * Main initialization: checks auth, loads user data, sets up event listeners, updates UI.
     */
    init() {
        // Check authentication
        if (!this.authManager.isLoggedIn()) {
            window.location.href = 'login.html';
            return;
        }

        // Load user data
        this.loadUserData();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Update UI with user info
        this.updateUserDisplay();
    }

    /**
     * Sets up event listeners for forms and UI actions.
     */
    setupEventListeners() {
        // Personal info form
        document.getElementById('personal-info-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updatePersonalInfo();
        });

        // Password form
        document.getElementById('password-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updatePassword();
        });

        // Notification preferences form
        document.getElementById('notification-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateNotificationPreferences();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.authManager.logout();
            window.location.href = 'index.html';
        });

        // Password confirmation validation
        const newPassword = document.getElementById('new-password');
        const confirmPassword = document.getElementById('confirm-password');
        
        confirmPassword.addEventListener('input', () => {
            if (newPassword.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity('Las contraseñas no coinciden');
            } else {
                confirmPassword.setCustomValidity('');
            }
        });
    }

    /**
     * Loads the current user's profile data from the backend and populates the form.
     */
    async loadUserData() {
        try {
            const response = await fetch('/api/auth/profile', {
                headers: this.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const userData = await response.json();
                this.populateForm(userData);
                this.updateAccountInfo(userData);
            } else {
                throw new Error('Error al cargar datos del usuario');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showAlert('Error al cargar los datos del usuario', 'danger');
        }
    }

    /**
     * Populates the personal info form with user data.
     */
    populateForm(userData) {
        document.getElementById('full-name').value = userData.full_name || '';
        document.getElementById('email').value = userData.email || '';
        document.getElementById('phone').value = userData.phone || '';
    }

    /**
     * Updates the account info section (verification, member since).
     */
    updateAccountInfo(userData) {
        // Update verification status
        const verificationElement = document.getElementById('verification-status');
        if (userData.is_verified) {
            verificationElement.innerHTML = '<span class="badge bg-success"><i class="fas fa-check me-1"></i>Verificado</span>';
        } else {
            verificationElement.innerHTML = '<span class="badge bg-warning"><i class="fas fa-clock me-1"></i>Pendiente de Verificación</span>';
        }

        // Update member since date
        if (userData.created_at) {
            const memberDate = new Date(userData.created_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            document.getElementById('member-since').textContent = memberDate;
        }
    }

    /**
     * Updates the user name display in the UI.
     */
    updateUserDisplay() {
        const userName = this.authManager.userName || 'Usuario';
        document.getElementById('user-name').textContent = userName;
    }

    /**
     * Handles personal info form submission and updates user profile.
     */
    async updatePersonalInfo() {
        const formData = {
            full_name: document.getElementById('full-name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value
        };

        try {
            const response = await fetch('/api/auth/update-profile', {
                method: 'PUT',
                headers: this.authManager.getAuthHeaders(),
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showAlert('Información personal actualizada correctamente', 'success');
                
                // Update stored user name if it changed
                if (formData.full_name !== this.authManager.userName) {
                    localStorage.setItem('user_name', formData.full_name);
                    this.authManager.userName = formData.full_name;
                    this.updateUserDisplay();
                }
            } else {
                throw new Error(result.error || 'Error al actualizar información');
            }
        } catch (error) {
            console.error('Error updating personal info:', error);
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * Handles password form submission and updates the user's password.
     */
    async updatePassword() {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            this.showAlert('Las contraseñas no coinciden', 'danger');
            return;
        }

        // Validate password strength
        if (newPassword.length < 6) {
            this.showAlert('La contraseña debe tener al menos 6 caracteres', 'danger');
            return;
        }

        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'PUT',
                headers: this.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    currentPassword: currentPassword,
                    newPassword: newPassword
                })
            });

            const result = await response.json();

            if (response.ok) {
                this.showAlert('Contraseña actualizada correctamente', 'success');
                document.getElementById('password-form').reset();
            } else {
                throw new Error(result.error || 'Error al cambiar contraseña');
            }
        } catch (error) {
            console.error('Error updating password:', error);
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * Handles notification preferences form submission and updates preferences.
     */
    async updateNotificationPreferences() {
        const preferences = {
            email_notifications: document.getElementById('email-notifications').checked,
            sms_notifications: document.getElementById('sms-notifications').checked
        };

        try {
            const response = await fetch('/api/auth/notification-preferences', {
                method: 'PUT',
                headers: this.authManager.getAuthHeaders(),
                body: JSON.stringify(preferences)
            });

            const result = await response.json();

            if (response.ok) {
                this.showAlert('Preferencias de notificación actualizadas', 'success');
            } else {
                throw new Error(result.error || 'Error al actualizar preferencias');
            }
        } catch (error) {
            console.error('Error updating notification preferences:', error);
            this.showAlert(error.message, 'danger');
        }
    }

    /**
     * Shows an alert message in the UI.
     */
    showAlert(message, type) {
        const alertContainer = document.getElementById('alert-container');
        const alertId = 'alert-' + Date.now();
        
        const alertHTML = `
            <div class="alert alert-${type} alert-dismissible fade show alert-custom" role="alert" id="${alertId}">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        alertContainer.innerHTML = alertHTML;
        
        // Auto-hide success alerts after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                const alert = document.getElementById(alertId);
                if (alert) {
                    const bsAlert = new bootstrap.Alert(alert);
                    bsAlert.close();
                }
            }, 5000);
        }
    }
}

// Initialize when DOM is loaded
/**
 * Initializes the UserSettings class on DOMContentLoaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    new UserSettings();
});
