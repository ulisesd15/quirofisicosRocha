/**
 * mis-citas.js
 *
 * Handles the user appointments ("Mis Citas") page logic:
 * - Loads and displays the current user's appointments.
 * - Supports filtering, canceling, rescheduling, and viewing appointment details.
 * - Handles authentication and redirects to login if not authenticated.
 * - Provides UI feedback for errors and actions.
 */

class MisCitas {
    /**
     * Initializes MisCitas instance, sets up state, and triggers initial load.
     */
    constructor() {
        this.appointments = [];
        this.currentFilter = 'all';
        this.currentUser = null;
        this.authManager = new AuthManager();
        this.init();
    }

    /**
     * Main initialization: checks auth, loads user data and appointments, sets up event listeners.
     */
    async init() {
        // Check authentication
        const loggedIn = this.authManager.isLoggedIn();
        console.debug('[MisCitas] init - isLoggedIn:', loggedIn, { token: this.authManager.token, userId: this.authManager.userId });
        if (!loggedIn) {
            console.info('[MisCitas] User is not logged in; redirecting to login.html');
            this.redirectToLogin();
            return;
        }

        // Load user data and appointments
        await this.loadUserData();
        this.setupFilterEventListeners();
    }

    /**
     * Returns the current user's auth token.
     */
    getAuthToken() {
        return this.authManager.token;
    }

    /**
     * Redirects to the login page.
     */
    redirectToLogin() {
        window.location.href = 'login.html';
    }

    /**
     * Loads the current user's profile data from the backend and displays it.
     */
    async loadUserData() {
        try {
            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (response.ok) {
                this.currentUser = await response.json();
                // User data is loaded, now load their appointments
                await this.loadAppointments();
            } else {
                throw new Error('Error loading user data');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            // If user data fails to load, it's an auth issue. Redirect to login.
            window.location.href = 'login.html';
        }
    }

    /**
     * Updates the UI with the current user's info.
     */
    displayUserInfo() {
    }

    /**
     * Loads the user's appointments from the backend and updates the UI.
     */
    async loadAppointments() {
        try {
            const token = this.getAuthToken();
            const response = await fetch('/api/appointments/my-appointments', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.appointments = data.appointments || [];
                // Populate user info card with data from the first appointment if available
                const userInfo = this.appointments.length > 0 ? this.appointments[0] : this.currentUser;
                document.getElementById('userFullName').textContent = userInfo.full_name || 'Usuario';
                document.getElementById('userEmail').textContent = userInfo.email || '';
                this.updateAppointmentCount();
                this.displayAppointments();
            } else {
                throw new Error('Error loading appointments');
            }
        } catch (error) {
            console.error('Error loading appointments:', error);
            this.showError('Error al cargar las citas. Por favor, intenta de nuevo.');
        } finally {
            document.getElementById('loadingState').style.display = 'none';
        }
    }

    /**
     * Updates the UI with the current number of appointments.
     */
    updateAppointmentCount() {
        const count = this.appointments.length;
        document.getElementById('appointmentCount').textContent = count;
    }

    /**
     * Renders the list of appointments in the UI, or shows a message if none exist.
     */
    displayAppointments() {
        const container = document.getElementById('appointmentsContainer');
        const noAppointments = document.getElementById('noAppointments');

        if (this.appointments.length === 0) {
            container.style.display = 'none';
            noAppointments.style.display = 'block';
            return;
        }

        container.style.display = 'block';
        noAppointments.style.display = 'none';

        const filteredAppointments = this.filterAppointments();
        container.innerHTML = filteredAppointments.map(appointment => this.createAppointmentCard(appointment)).join('');
        // After rendering cards, set up event listeners for the buttons inside them
        this.setupCardEventListeners(container);
    }

    /**
     * Returns the filtered list of appointments based on the current filter.
     */
    filterAppointments() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (this.currentFilter) {
            case 'upcoming':
                return this.appointments.filter(apt => {
                    const aptDate = new Date(apt.date);
                    return aptDate >= today && apt.status !== 'cancelled' && apt.status !== 'completed';
                });
            case 'past':
                return this.appointments.filter(apt => {
                    const aptDate = new Date(apt.date);
                    return aptDate < today || apt.status === 'completed';
                });
            default:
                return this.appointments;
        }
    }

    /**
     * Creates the HTML for a single appointment card.
     */
    createAppointmentCard(appointment) {
        const appointmentDate = new Date(appointment.date);
        const appointmentTime = appointment.time;
        const dateTimeString = `${appointment.date}T${appointmentTime}:00`;
        const appointmentDateTime = new Date(dateTimeString);
        const now = new Date();
        const isUpcoming = appointmentDateTime > now && appointment.status !== 'cancelled' && appointment.status !== 'completed';

        const statusConfig = this.getStatusConfig(appointment.status);
        const formattedDate = this.formatDate(appointmentDateTime);
        const formattedTime = this.formatTime(appointmentTime);

        return `
            <div class="col-md-6 col-lg-4">
                <div class="card appointment-card h-100 border-0 shadow-sm">
                    <div class="card-header bg-transparent border-0 pb-0">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="appointment-date">${formattedDate}</div>
                            <span class="badge status-badge status-${appointment.status}">${statusConfig.text}</span>
                        </div>
                        <div class="appointment-time">
                            <i class="fas fa-clock me-1"></i>${formattedTime}
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <h6 class="card-title mb-2">
                                <i class="fas fa-user-md text-primary me-2"></i>Cita Médica
                            </h6>
                            ${appointment.note ? `
                                <p class="card-text small text-muted mb-2">
                                    <i class="fas fa-comment-medical me-1"></i>
                                    <strong>Nota:</strong> ${appointment.note}
                                </p>
                            ` : ''}
                        </div>
                        
                        <div class="appointment-details mb-3">
                            <small class="text-muted d-block">
                                <i class="fas fa-calendar-plus me-1"></i>
                                Agendada: ${this.formatDateTime(appointment.created_at)}
                            </small>
                            ${appointment.updated_at !== appointment.created_at ? `
                                <small class="text-muted d-block">
                                    <i class="fas fa-edit me-1"></i>
                                    Actualizada: ${this.formatDateTime(appointment.updated_at)}
                                </small>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="card-footer bg-transparent border-0">
                        <div class="appointment-actions">
                            ${isUpcoming && appointment.status === 'pending' ? `
                                <button class="btn btn-outline-warning btn-sm" data-action="cancel" data-id="${appointment.id}">
                                    <i class="fas fa-times me-1"></i>Cancelar
                                </button>
                            ` : ''}
                            ${isUpcoming && (appointment.status === 'pending' || appointment.status === 'confirmed') ? `
                                <button class="btn btn-outline-primary btn-sm" data-action="reschedule" data-id="${appointment.id}">
                                    <i class="fas fa-calendar-alt me-1"></i>Reagendar
                                </button>
                            ` : ''}
                            <button class="btn btn-outline-info btn-sm" data-action="details" data-id="${appointment.id}">
                                <i class="fas fa-eye me-1"></i>Detalles
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Returns a config object for the given appointment status.
     */
    getStatusConfig(status) {
        const configs = {
            pending: { text: 'Pendiente', class: 'warning' },
            confirmed: { text: 'Confirmada', class: 'success' },
            completed: { text: 'Completada', class: 'secondary' },
            cancelled: { text: 'Cancelada', class: 'danger' }
        };
        return configs[status] || { text: 'Desconocido', class: 'secondary' };
    }

    /**
     * Formats a date as a localized string for display.
     */
    formatDate(date) {
        return date.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Formats a time string as a localized time for display.
     */
    formatTime(timeString) {
        const [hours, minutes] = timeString.split(':');
        const time = new Date();
        time.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return time.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    /**
     * Formats a date-time string as a localized string for display.
     */
    formatDateTime(dateTimeString) {
        const date = new Date(dateTimeString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Sets up event listeners for appointment filter radio buttons.
     */
    setupFilterEventListeners() {
        // Filter buttons
        document.querySelectorAll('input[name="appointmentFilter"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentFilter = e.target.id;
                this.displayAppointments();
            });
        });
    }

    /**
     * Sets up delegated event listeners for appointment card actions.
     * @param {HTMLElement} container - The container holding the appointment cards.
     */
    setupCardEventListeners(container) {
        container.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const id = button.dataset.id;

            if (!id) return;

            switch (action) {
                case 'cancel':
                    this.cancelAppointment(id);
                    break;
                case 'reschedule':
                    this.rescheduleAppointment(id);
                    break;
                case 'details':
                    this.viewAppointmentDetails(id);
                    break;
            }
        });
    }

    /**
     * Cancels an appointment by ID after user confirmation, then reloads appointments.
     */
    async cancelAppointment(appointmentId) {
        if (!confirm('¿Estás seguro de que deseas cancelar esta cita?')) {
            return;
        }

        try {
            const token = this.getAuthToken();
            const response = await fetch(`/api/appointments/${appointmentId}/cancel`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.showSuccess('Cita cancelada exitosamente');
                await this.loadAppointments(); // Reload appointments
            } else {
                throw new Error('Error cancelling appointment');
            }
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            this.showError('Error al cancelar la cita. Por favor, intenta de nuevo.');
        }
    }

    /**
     * Redirects to the reschedule page for the given appointment ID.
     */
    rescheduleAppointment(appointmentId) {
        // Redirect to reschedule page with appointment ID
        window.location.href = `reschedule.html?id=${appointmentId}`;
    }

    /**
     * Shows a modal with detailed information for the given appointment.
     */
    async viewAppointmentDetails(appointmentId) {
        const appointment = this.appointments.find(apt => apt.id.toString() === appointmentId.toString());
        if (!appointment) return;

        const modal = this.createDetailsModal(appointment);
        document.body.appendChild(modal);
        
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Clean up modal when hidden
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    /**
     * Creates and returns a Bootstrap modal element for appointment details.
     */
    createDetailsModal(appointment) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-calendar-check text-primary me-2"></i>
                            Detalles de la Cita
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6><i class="fas fa-calendar me-2"></i>Fecha y Hora</h6>
                                <p>${this.formatDate(new Date(appointment.date))}<br>
                                   <strong>${this.formatTime(appointment.time)}</strong></p>
                                
                                <h6><i class="fas fa-info-circle me-2"></i>Estado</h6>
                                <span class="badge status-badge status-${appointment.status}">
                                    ${this.getStatusConfig(appointment.status).text}
                                </span>
                            </div>
                            <div class="col-md-6">
                                <h6><i class="fas fa-user me-2"></i>Información Personal</h6>
                                <p><strong>Nombre:</strong> ${appointment.full_name}<br>
                                   <strong>Email:</strong> ${appointment.email}<br>
                                   ${appointment.phone ? `<strong>Teléfono:</strong> ${appointment.phone}` : ''}</p>
                            </div>
                        </div>
                        
                        ${appointment.note ? `
                            <div class="mt-3">
                                <h6><i class="fas fa-comment-medical me-2"></i>Notas</h6>
                                <p class="bg-light p-3 rounded">${appointment.note}</p>
                            </div>
                        ` : ''}
                        
                        <div class="mt-3">
                            <h6><i class="fas fa-clock me-2"></i>Historial</h6>
                            <small class="text-muted">
                                <strong>Creada:</strong> ${this.formatDateTime(appointment.created_at)}<br>
                                ${appointment.updated_at !== appointment.created_at ? 
                                    `<strong>Última actualización:</strong> ${this.formatDateTime(appointment.updated_at)}` : ''
                                }
                            </small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        `;
        return modal;
    }

    /**
     * Shows a success alert message in the UI.
     */
    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    /**
     * Shows an error alert message in the UI.
     */
    showError(message) {
        this.showAlert(message, 'danger');
    }

    /**
     * Shows an alert message of the given type in the UI.
     */
    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 100px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }
}

/**
 * Initializes the MisCitas instance when the DOM is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    new MisCitas();
});
