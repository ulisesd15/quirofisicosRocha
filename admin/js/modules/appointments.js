// admin/js/modules/appointments.js
export class AppointmentsModule {
  async loadUpcomingAppointments() {
    try {
      const response = await fetch('/api/admin/appointments?limit=10&sort=upcoming', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      if (!response.ok) throw new Error('Error loading upcoming appointments');
      const data = await response.json();
      const appointments = data.appointments || data;
      const tbody = document.getElementById('recent-appointments');
      if (!tbody) return;
      tbody.innerHTML = appointments.map(apt => `
        <tr>
          <td>${apt.id}</td>
          <td>${this.formatDate(apt.appointment_date)}</td>
          <td>${this.formatTime(apt.appointment_time)}</td>
          <td>${apt.name}</td>
          <td>${apt.email || ''}</td>
          <td>${apt.phone || ''}</td>
          <td><span class="badge bg-${apt.status}">${this.getStatusText(apt.status)}</span></td>
        </tr>
      `).join('');
    } catch (error) {
      console.error('Error loading upcoming appointments:', error);
      const tbody = document.getElementById('recent-appointments');
      if (tbody) tbody.innerHTML = '<tr><td colspan="7">Error al cargar citas pendientes.</td></tr>';
    }
  }
  updatePagination(section, pagination) {
    // No-op fallback. Implement pagination UI here if needed.
  }
  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatTime(timeStr) {
    if (!timeStr) return '';
    // If timeStr is already in HH:mm, return as is
    if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
    // Otherwise, try to parse
    const d = new Date(`1970-01-01T${timeStr}`);
    if (isNaN(d)) return timeStr;
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  getStatusText(status) {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  }
  getAuthToken() {
    return localStorage.getItem('token') || localStorage.getItem('user_token') || '';
  }

  showError(message) {
    // Simple fallback: show error in a visible div, alert, or console
    alert(message);
  }
  constructor() {
    // Optionally, you can pass a loading element or selector
  }

  showLoading() {
    // Simple fallback: show a spinner if present, or do nothing
    const spinner = document.getElementById('appointments-loading-spinner');
    if (spinner) spinner.style.display = 'block';
  }

  hideLoading() {
    const spinner = document.getElementById('appointments-loading-spinner');
    if (spinner) spinner.style.display = 'none';
  }
  // Add citas/appointments logic here

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

  async loadAppointments() {
    try {
      this.showLoading();
      
      // Reset header to default if no filter is active
      if (!this.currentFilter) {
        const cardTitle = document.querySelector('#appointments-section .card-header h5');
        if (cardTitle) {
          cardTitle.innerHTML = `<i class="fas fa-calendar-check me-2"></i>Gestión de citas`;
        }
      }
      
      // Ensure valid pagination
      const page = Number.isInteger(this.currentPage) && this.currentPage > 0 ? this.currentPage : 1;
      const limit = Number.isInteger(this.itemsPerPage) && this.itemsPerPage > 0 ? this.itemsPerPage : 10;
      const params = new URLSearchParams({
        page,
        limit
      });

      // Add filters
      const search = document.getElementById('appointments-search')?.value;
      const status = document.getElementById('appointments-status-filter')?.value;
      const date = document.getElementById('appointments-date-filter')?.value;

      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (date) params.append('date', date);

      const response = await fetch(`/api/admin/appointments?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Error loading appointments');
      
      const data = await response.json();
      
      this.displayAppointments(data.appointments);
      this.updatePagination('appointments', data.pagination);
      
      // Clear the current filter after normal load
      this.currentFilter = null;
      
    } catch (error) {
      console.error('Error loading appointments:', error);
      this.showError('Error cargando las citas');
    } finally {
      this.hideLoading();
    }
  }

  async saveAppointmentChanges() {
    try {
      const id = document.getElementById('edit-appointment-id').value;
      const data = {
        name: document.getElementById('edit-appointment-name').value,
        email: document.getElementById('edit-appointment-email').value,
        phone: document.getElementById('edit-appointment-phone').value,
        appointment_date: document.getElementById('edit-appointment-date').value,
        appointment_time: document.getElementById('edit-appointment-time').value,
        status: document.getElementById('edit-appointment-status').value,
        note: document.getElementById('edit-appointment-note').value
      };

      const response = await fetch(`/api/admin/appointments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Error updating appointment');

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('editAppointmentModal'));
      modal.hide();

      // Reload data
      await this.refreshCurrentSection();
      this.showSuccess('Cita actualizada correctamente');

    } catch (error) {
      console.error('Error saving appointment:', error);
      this.showError('Error guardando los cambios');
    }
  }

  async editAppointment(id) {
    try {
      const response = await fetch(`/api/admin/appointments/${id}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Error loading appointment');
      
      const data = await response.json();
      const appointment = data.appointment;

      // Populate modal
      document.getElementById('edit-appointment-id').value = appointment.id;
      document.getElementById('edit-appointment-name').value = appointment.name;
      document.getElementById('edit-appointment-email').value = appointment.email || '';
      document.getElementById('edit-appointment-phone').value = appointment.phone || '';
      document.getElementById('edit-appointment-date').value = appointment.appointment_date;
      document.getElementById('edit-appointment-time').value = appointment.appointment_time;
      document.getElementById('edit-appointment-status').value = appointment.status;
      document.getElementById('edit-appointment-note').value = appointment.note || '';

      // Show modal
      const modal = new bootstrap.Modal(document.getElementById('editAppointmentModal'));
      modal.show();

    } catch (error) {
      console.error('Error loading appointment:', error);
      this.showError('Error cargando la cita');
    }
  }

  async deleteAppointment(id) {
    await this.appointments.delete(id);
  }

  async saveAppointmentChanges() {
    try {
      const id = document.getElementById('edit-appointment-id').value;
      const data = {
        name: document.getElementById('edit-appointment-name').value,
        email: document.getElementById('edit-appointment-email').value,
        phone: document.getElementById('edit-appointment-phone').value,
        appointment_date: document.getElementById('edit-appointment-date').value,
        appointment_time: document.getElementById('edit-appointment-time').value,
        status: document.getElementById('edit-appointment-status').value,
        note: document.getElementById('edit-appointment-note').value
      };

      const response = await fetch(`/api/admin/appointments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Error updating appointment');

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('editAppointmentModal'));
      modal.hide();

      // Reload data
      await this.refreshCurrentSection();
      this.showSuccess('Cita actualizada correctamente');

    } catch (error) {
      console.error('Error saving appointment:', error);
      this.showError('Error guardando los cambios');
    }
  }

   async editAppointment(id) {
    try {
      const response = await fetch(`/api/admin/appointments/${id}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Error loading appointment');
      const data = await response.json();
      const appointment = data.appointment;

      // Populate modal
      document.getElementById('edit-appointment-id').value = appointment.id;
      document.getElementById('edit-appointment-name').value = appointment.name;
      document.getElementById('edit-appointment-email').value = appointment.email || '';
      document.getElementById('edit-appointment-phone').value = appointment.phone || '';
      document.getElementById('edit-appointment-date').value = appointment.appointment_date;
      document.getElementById('edit-appointment-time').value = appointment.appointment_time;
      document.getElementById('edit-appointment-status').value = appointment.status;
      document.getElementById('edit-appointment-note').value = appointment.note || '';

      // Show modal
      const modal = new bootstrap.Modal(document.getElementById('editAppointmentModal'));
      modal.show();
    } catch (error) {
      console.error('Error loading appointment:', error);
      this.showError('Error cargando la cita para editar');
    }
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

  rescheduleAppointment(appointmentId) {
    // This could open a modal or redirect to edit appointment
    this.editAppointment(appointmentId);
  }

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
          <button class="btn-approve" onclick="approveAppointment(${appointment.id})">
            Aprobar y Enviar SMS
          </button>
          <button class="btn-reject" onclick="rejectAppointment(${appointment.id})">
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

async approveAppointment(appointmentId) {
    try {
        const response = await fetch(`/api/admin/appointments/${appointmentId}/approve`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('user_token') || localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Show success message
        this.showNotification('Cita aprobada y SMS enviado exitosamente', 'success');
        
        // Refresh the pending appointments list
        this.displayPendingAppointments();
        
        } catch (error) {
            console.error('Error approving appointment:', error);
            this.showNotification('Error al aprobar la cita', 'error');
        }
}

// Function to reject an appointment (placeholder for future implementation)
async rejectAppointment(appointmentId) {
  if (!confirm('¿Está seguro de que desea rechazar esta cita?')) {
    return;
  }

  async function sendAppointmentReminders() {
  try {
    const confirmSend = confirm('¿Desea enviar recordatorios SMS a todos los pacientes con citas para mañana?');
    if (!confirmSend) return;
    
    const response = await fetch('/api/admin/appointments/send-reminders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('user_token') || localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const result = await response.json();
    
    showNotification(`Recordatorios enviados: ${result.sent} SMS enviados exitosamente`, 'success');
    
  } catch (error) {
    console.error('Error sending reminders:', error);
    showNotification('Error al enviar recordatorios', 'error');
  }
}

  
  // TODO: Implement appointment rejection endpoint
  this.showNotification('Función de rechazo en desarrollo', 'warning');
}

}
