// admin/js/modules/dashboard.js

export class DashboardModule {
  getAuthToken() {
    return localStorage.getItem('token') || localStorage.getItem('user_token') || '';
  }

  showError(message) {
    alert(message);
  }

  showLoading() {
    const spinner = document.getElementById('users-loading-spinner');
    if (spinner) spinner.style.display = 'block';
  }

  hideLoading() {
    const spinner = document.getElementById('users-loading-spinner');
    if (spinner) spinner.style.display = 'none';
  }
  constructor() {}

  async load() {
    try {
      this.showLoading();
      const token = localStorage.getItem('token') || localStorage.getItem('user_token');
      const response = await fetch('/api/admin/dashboard', {
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
      this.updateStatsCard('pending-users', data.pendingAppointments);
      this.displayRecentAppointments(data.recentAppointments || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      this.showError('Error cargando el dashboard: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }
   async loadDashboard() {
    await this.dashboard.load();
  }
  
  updateStatsCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value || 0;
    }
  }
  displayRecentAppointments(appointments) {
    const tbody = document.getElementById('recent-appointments');
    if (!tbody) return;
    if (appointments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay citas recientes</td></tr>';
      return;
    }

    // Helper to format time to AM/PM
    function formatTimeToAMPM(timeStr) {
      // Assumes timeStr is "HH:mm" or "HH:mm:ss"
      const [hour, minute] = timeStr.split(':');
      let h = parseInt(hour, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${minute} ${ampm}`;
    }

    tbody.innerHTML = appointments.map(apt => {
      const statusClass = this.getStatusBadgeClass?.(apt.status) || '';
      const statusText = this.getStatusText?.(apt.status) || apt.status;
      let textColor = '';
      switch (apt.status) {
        case 'pending': textColor = 'text-warning'; break;
        case 'confirmed': textColor = 'text-success'; break;
        case 'cancelled': textColor = 'text-danger'; break;
        default: textColor = 'text-secondary';
      }
      return `
        <tr>
          <td>${apt.appointment_date}</td>
          <td>${formatTimeToAMPM(apt.appointment_time)}</td>
          <td>${apt.name}</td>
          <td><span class="badge ${statusClass} ${textColor}">${statusText}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="adminPanel.appointments.editAppointment(${apt.id})">
              <i class="fas fa-edit"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
}
