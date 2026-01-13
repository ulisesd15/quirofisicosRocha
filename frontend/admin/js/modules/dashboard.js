/**
 * dashboard.js
 *
 * Handles dashboard statistics and recent appointments for the admin panel.
 * - Loads and displays user/appointment stats and recent appointments.
 * - Provides UI updates, error handling, and stat card updates.
 * - Exports a DashboardModule for use in the admin UI.
 */

export class DashboardModule {
  /**
   * Retrieves the current authentication token from localStorage.
   */
  getAuthToken() {
    return localStorage.getItem('token') || localStorage.getItem('user_token') || '';
  }

  /**
   * Displays an error alert (currently uses alert()).
   */
  showError(message) {
    alert(message);
  }

  /**
   * Shows the loading spinner for user actions.
   */
  showLoading() {
    const spinner = document.getElementById('users-loading-spinner');
    if (spinner) spinner.style.display = 'block';
  }

  /**
   * Hides the loading spinner for user actions.
   */
  hideLoading() {
    const spinner = document.getElementById('users-loading-spinner');
    if (spinner) spinner.style.display = 'none';
  }

  /**
   * Initializes DashboardModule (currently empty).
   */
  constructor() {}

  /**
   * Loads dashboard stats and recent appointments from the backend.
   */
  async load() {
    try {
      this.showLoading();
      const token = localStorage.getItem('token') || localStorage.getItem('user_token');
      const response = await fetch('/api/admin/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          this.showError('Sesión expirada. Por favor, inicie sesión nuevamente.');
          window.location.href = '/login.html';
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      this.updateStatsCard('total-users', data.totalUsers);
      this.updateStatsCard('total-appointments', data.totalAppointments);
      this.updateStatsCard('today-appointments', data.todayAppointments);
      this.updateStatsCard('pending-appointments', data.pendingAppointments);
      this.displayRecentAppointments(data.recentAppointments || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      this.showError('Error cargando el dashboard: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Loads the dashboard (wrapper for dashboard.load()).
   */
  async loadDashboard() {
    await this.dashboard.load();
  }

  /**
   * Updates a stat card in the UI by element ID.
   */
  updateStatsCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value || 0;
    }
  }

  /**
   * Returns a human-readable status string for an appointment.
   */
  getStatusText(status) {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmada';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  }

  /**
   * Renders the recent appointments table in the UI.
   */
  displayRecentAppointments(appointments) {
    const tbody = document.getElementById('recent-appointments');
    if (!tbody) return;
    if (appointments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay citas recientes</td></tr>';
      return;
    }

    // Helper to format date string
    function formatDate(dateStr) {
      if (!dateStr) return '';
      // Create a date object, treating the input as UTC to avoid timezone shifts
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
      });
    }

    // Helper to format time to AM/PM
    function formatTimeToAMPM(timeStr) {
      // Assumes timeStr is "HH:mm" or "HH:mm:ss"
      if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return '';
      const [hour, minute] = timeStr.split(':');
      let h = parseInt(hour, 10);
      if (isNaN(h) || minute === undefined) return '';
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${minute} ${ampm}`;
    }

    tbody.innerHTML = appointments.map(apt => {
      return `
        <tr>
          <td>${formatDate(apt.date)}</td>
          <td>${formatTimeToAMPM(apt.time)}</td>
          <td>${apt.fullName}</td>
          <td><span class="badge bg-${apt.status}">${this.getStatusText(apt.status)}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-primary btn-edit-appointment" data-appointment-id="${apt.id}" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
}
