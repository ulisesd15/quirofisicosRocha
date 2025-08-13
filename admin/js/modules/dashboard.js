// admin/js/modules/dashboard.js

export class DashboardModule {
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

  showLoading() {
    document.getElementById('dashboard-loading')?.classList.remove('d-none');
  }
  hideLoading() {
    document.getElementById('dashboard-loading')?.classList.add('d-none');
  }
  showError(msg) {
    // You may want to use a notification service here
    alert(msg);
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
          <td>${apt.appointment_time}</td>
          <td>${apt.name}</td>
          <td><span class="badge ${statusClass} ${textColor}">${statusText}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="adminPanel.editAppointment(${apt.id})">
              <i class="fas fa-edit"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
}
