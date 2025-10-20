/**
 * userVerification.js
 *
 * Handles user verification logic for the admin panel.
 * - Fetches and displays unverified users.
 * - Allows admin to verify or reject users.
 * - Provides UI updates for verification actions.
 * - Includes appointment management for pending approvals.
 * - Exports a singleton instance for use in the admin UI.
 */

export class UserVerificationModule {
  /**
   * Main entry point to load the module's data.
   */
  load() {
    this.setupEventListeners();
    this.loadUnverifiedUsers();
  }

  /**
   * Retrieves the current authentication token from localStorage.
   */
  getAuthToken() {
    return localStorage.getItem('user_token') || localStorage.getItem('token') || '';
  }

  /**
   * Sets up delegated event listeners for the module.
   */
  setupEventListeners() {
    const container = document.getElementById('unverified-users');
    if (container && !container.dataset.listenerAttached) {
      container.addEventListener('click', (event) => {
        const approveButton = event.target.closest('.btn-approve');
        if (approveButton) {
          const userId = approveButton.dataset.userId;
          if (userId) {
            this.approveAppointmentAndVerifyUser(userId, approveButton.closest('.appointment-item'));
          }
        }
        const rejectButton = event.target.closest('.btn-reject');
        if (rejectButton) {
          const appointmentId = rejectButton.dataset.appointmentId;
          this.rejectAppointment(appointmentId, rejectButton.closest('.appointment-item'));
        }
      });
      container.dataset.listenerAttached = 'true';
    }
  }

  /**
   * Verifies a user by ID and refreshes the unverified users list.
   * @param {number} id - The ID of the user to verify.
   */
  async verifyUser(id) {
    if (!confirm('¿Estás seguro de que quieres verificar este usuario?')) return;
    try {
      const response = await fetch(`/api/admin/users/${id}/verify`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      if (!response.ok) throw new Error('Error verificando usuario');
      this.showNotification('Usuario verificado correctamente', 'success');
      await this.loadUnverifiedUsers();
    } catch (error) {
      console.error('Error verifying user:', error);
      this.showNotification('Error verificando el usuario', 'error');
    }
  }
  /**
   * Fetches and displays the list of unverified users.
   */
  async loadUnverifiedUsers() {
    try {
      const response = await fetch('/api/admin/users/unverified', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      if (!response.ok) throw new Error('Error cargando usuarios no verificados');
      const data = await response.json();
      this.displayUnverifiedUsers(data.users);
    } catch (error) {
      console.error('Error loading unverified users:', error);
      this.displayUnverifiedUsers([]); // Show empty state
    }
  }

  /**
   * Renders the unverified users list in the UI container.
   * @param {Array} users - The list of unverified users.
   */
  displayUnverifiedUsers(users) {
    const container = document.getElementById('unverified-users');
    if (!container) return;
    container.innerHTML = '';
    if (!users || users.length === 0) {
      container.innerHTML = `<div class="empty-state">No hay usuarios no verificados para verificar.</div>`;
      return;
    }
    const table = document.createElement('table');
    table.className = 'table table-bordered';
    table.innerHTML = `
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Email</th>
          <th>Teléfono</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(user => `
          <tr>
            <td>${user.id}</td>
            <td>${user.full_name}</td>
            <td>${user.email}</td>
            <td>${user.phone || 'N/A'}</td>
            <td>
              <button class="btn btn-success btn-sm" onclick="userVerificationModule.verifyUser(${user.id})">Verificar</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    `;
    container.appendChild(table);
  }
  /**
   * Sets up UI for unverified users, including refresh button and auto-refresh.
   */
  setupUnverifiedUsersUI() {
    const refreshBtn = document.getElementById('load-unverified-users-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadUnverifiedUsers();
      });
    }
    // Auto-refresh every 30 seconds
    setInterval(() => {
      this.loadUnverifiedUsers();
    }, 30000);
    // Initial load
    this.loadUnverifiedUsers();
  }
  /**
   * Updates the send-reminders-dynamic container with provided HTML.
   * @param {string} html - The HTML content to update the container with.
   */
  updateSendRemindersContent(html) {
    const container = document.getElementById('send-reminders-dynamic');
    if (container) {
      container.innerHTML = html;
    }
  }
  /**
   * Renders the appointments table in the UI.
   * @param {Array} appointments - The list of appointments to display.
   */
  displayAppointments(appointments) {
    const tbody = document.getElementById('appointments-table');
    
    if (appointments.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <i class="fas fa-calendar-times"></i>
            <h5>No hay citas</h5>
            <p>No se encontraron citas que coincidan con los criterios de búsqueda.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = appointments.map(apt => `
      <tr>
        <td>${apt.id}</td>
        <td>${this.formatDate(apt.appointment_date)}</td>
        <td>${this.formatTime(apt.appointment_time)}</td>
        <td>${apt.name}</td>
        <td>
          ${apt.email ? `<div>${apt.email}</div>` : ''}
          ${apt.phone ? `<div class="text-muted">${apt.phone}</div>` : ''}
        </td>
        <td><span class="badge bg-${apt.status}">${this.getStatusText(apt.status)}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-outline-primary btn-sm" onclick="adminPanel.appointments.editAppointment(${apt.id})" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm" onclick="adminPanel.appointments.deleteAppointment(${apt.id})" title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Deletes an appointment by ID and refreshes the section.
   * @param {number} id - The ID of the appointment to delete.
   */
  async deleteAppointment(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta cita?')) return;

    try {
      const response = await fetch(`/api/admin/appointments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Error deleting appointment');

      await this.refreshCurrentSection();
      this.showSuccess('Cita eliminada correctamente');

    } catch (error) {
      console.error('Error deleting appointment:', error);
      this.showError('Error eliminando la cita');
    }
  }

  /**
   * Fetches and displays pending appointments for approval.
   */
  async displayPendingAppointments() {
    try {
      const response = await fetch('/api/admin/appointments/pending', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const appointments = await response.json();
      // Log raw data received from the backend for debugging
      console.log('Pending appointments data from API:', appointments);
      const container = document.getElementById('pending-appointments');
      if (!container) {
        console.error('Pending appointments container not found');
        return;
      }
      container.innerHTML = '';
      if (appointments.length === 0) {
        container.innerHTML = '<p>No hay citas pendientes de aprobación.</p>';
        return;
      }
      appointments.forEach(item => {
        const itemHTML = this.createVerificationItemHTML(item);
        container.insertAdjacentHTML('beforeend', itemHTML);
      });
    } catch (error) {
      console.error('Error loading pending appointments:', error);
      const container = document.getElementById('pending-appointments');
      if (container) {
        container.innerHTML = '<p>Error al cargar las citas pendientes.</p>';
      }
    }
  }

  /**
   * Creates the HTML for a single pending verification item.
   * @param {object} item - The appointment and user data object from the API.
   * @returns {string} The HTML string for the item.
   */
  createVerificationItemHTML(item) {
    // Safely format date: 'YYYY-MM-DD...' -> 'dd de MMMM de yyyy'
    const formattedDate = item.date ? new Date(item.date + 'T00:00:00').toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC' // Treat date as UTC to avoid timezone shifts
    }) : 'Fecha no disponible';

    // Safely format time: 'HH:mm:ss' -> 'h:mm AM/PM'
    let formattedTime = 'Hora no disponible';
    if (item.time) {
        const [hours, minutes] = item.time.split(':');
        const time = new Date();
        time.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        formattedTime = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    return `
      <div class="appointment-item">
        <div class="appointment-details">
          <h4>Cita de: ${item.full_name || 'No disponible'}</h4>
          <p><strong>Email:</strong> ${item.email || 'No disponible'}</p>
          <p><strong>Fecha:</strong> ${formattedDate}</p>
          <p><strong>Hora de Cita:</strong> ${formattedTime}</p>
          <p class="text-muted small">ID Usuario: ${item.user_id} | ID Cita: ${item.appointment_id}</p>
        </div>
        <div class="appointment-actions">
          <button class="btn-approve" data-user-id="${item.user_id}">Aprobar</button>
          <button class="btn-reject" data-appointment-id="${item.appointment_id}">Rechazar</button>
        </div>
      </div>
    `;
  }

  /**
   * Approves a user and all their pending appointments.
   * @param {number} userId - The ID of the user to verify.
   * @param {HTMLElement} itemElement - The DOM element for the list item to be removed on success.
   */
  async approveAppointmentAndVerifyUser(userId, itemElement) {
    if (!confirm('¿Estás seguro de que quieres aprobar este usuario? Todas sus citas pendientes serán confirmadas.')) return;

    try {
      const response = await fetch(`/api/admin/approve-user/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al aprobar al usuario.');
      }

      this.showNotification(result.message || 'Usuario aprobado y citas confirmadas.', 'success');
      itemElement.remove(); // Remove the item from the list

    } catch (error) {
      console.error('Error approving user:', error);
      this.showNotification(error.message, 'error');
    }
  }
  /**
   * Rejects a pending appointment.
   * @param {number} appointmentId - The ID of the appointment to reject.
   * @param {HTMLElement} itemElement - The DOM element for the list item to be removed on success.
   */
  async rejectAppointment(appointmentId, itemElement) {
    if (!confirm('¿Estás seguro de que quieres rechazar esta cita? Esta acción no se puede deshacer.')) return;

    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al rechazar la cita.');
      }

      this.showNotification(result.message || 'Cita rechazada correctamente.', 'success');
      itemElement.remove(); // Remove the item from the list

    } catch (error) {
      console.error('Error rejecting appointment:', error);
      this.showNotification(error.message, 'error');
    }
  }
}

// Initialize module and UI wiring for user verification section
/**
 * Sets up the userVerificationModule and event listeners on DOMContentLoaded.
 */
window.userVerificationModule = new UserVerificationModule();
document.addEventListener('DOMContentLoaded', function() {
  const showBtn = document.getElementById('show-unverified-users-btn');
  if (showBtn) {
    showBtn.addEventListener('click', function() {
      document.querySelectorAll('.admin-section').forEach(sec => sec.classList.add('d-none'));
      document.getElementById('unverified-users-section').classList.remove('d-none');
      window.userVerificationModule.setupUnverifiedUsersUI();
    });
  }
});