export class UserVerificationModule {
  // Verify a user and refresh the list
  async verifyUser(id) {
    if (!confirm('¿Estás seguro de que quieres verificar este usuario?')) return;
    try {
      const response = await fetch(`/api/admin/users/${id}/verify`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('user_token') || localStorage.getItem('token')}`
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
  // Fetch and display unverified users
  async loadUnverifiedUsers() {
    try {
      const response = await fetch('/api/admin/users/unverified', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('user_token') || localStorage.getItem('token')}`
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

  // Render unverified users list in the correct container
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
  // Setup button and auto-refresh for unverified users
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
  // Dynamically update the send-reminders-dynamic container
  updateSendRemindersContent(html) {
    const container = document.getElementById('send-reminders-dynamic');
    if (container) {
      container.innerHTML = html;
    }
  }
  // Render appointments table
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

  async displayPendingAppointments() {
    try {
      const response = await fetch('/api/admin/appointments/pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('user_token') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const appointments = await response.json();
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
      appointments.forEach(appointment => {
        const appointmentDiv = document.createElement('div');
        appointmentDiv.className = 'appointment-item';
        appointmentDiv.innerHTML = `
          <div class="appointment-details">
            <h4>Cita #${appointment.id}</h4>
            <p><strong>Cliente:</strong> ${appointment.user_name}</p>
            <p><strong>Email:</strong> ${appointment.email}</p>
            <p><strong>Teléfono:</strong> ${appointment.phone || 'No especificado'}</p>
            <p><strong>Fecha:</strong> ${appointment.appointment_date}</p>
            <p><strong>Hora:</strong> ${formatTimeToAMPM(appointment.appointment_time)}</p>
            <p><strong>Servicio:</strong> ${appointment.service}</p>
            <p><strong>Notas:</strong> ${appointment.notes || 'Sin notas'}</p>
            <p><strong>Fecha de solicitud:</strong> ${new Date(appointment.created_at).toLocaleString()}</p>
          </div>
          <div class="appointment-actions">
            <button class="btn-approve" onclick="userVerificationModule.approveAppointment(${appointment.id})">
              Aprobar y Enviar SMS
            </button>
            <button class="btn-reject" onclick="userVerificationModule.rejectAppointment(${appointment.id})">
              Rechazar
            </button>
          </div>
        `;
        container.appendChild(appointmentDiv);
      });
    } catch (error) {
      console.error('Error loading pending appointments:', error);
      const container = document.getElementById('pending-appointments');
      if (container) {
        container.innerHTML = '<p>Error al cargar las citas pendientes.</p>';
      }
    }
  }

  async setupUnverifiedUsersUI() {
    const container = document.getElementById('unverified-users');
    if (!container) return;

    try {
      const response = await fetch('/api/admin/users/unverified', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('user_token') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);

      const { users } = await response.json();
      if (!Array.isArray(users)) {
        console.error('Unexpected response format:', users);
        return;
      }

      container.innerHTML = users.map(user => `
        <div class="user-item">
          <p><strong>ID:</strong> ${user.id}</p>
          <p><strong>Nombre:</strong> ${user.full_name}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Teléfono:</strong> ${user.phone || 'No especificado'}</p>
          <button class="btn-verify" onclick="userVerificationModule.verifyUser(${user.id})">Verificar</button>
          <button class="btn-reject" onclick="userVerificationModule.rejectUser(${user.id})">Rechazar</button>
        </div>
      `).join('');
    } catch (error) {
      console.error('Error loading unverified users:', error);
      container.innerHTML = '<p>Error al cargar los usuarios no verificados.</p>';
    }
  }

  }

// Initialize module and UI wiring for user verification section
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