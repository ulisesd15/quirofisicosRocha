  export class UserVerificationModule {
  // Dynamically update the send-reminders-dynamic container
  updateSendRemindersContent(html) {
    const container = document.getElementById('send-reminders-dynamic');
    if (container) {
      container.innerHTML = html;
    }
  }
  // Render the notification settings form
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

    renderNotificationSettings(settingsMap = {}) {
      const html = `
        <div class="settings-group">
          <h6><i class="fas fa-bell me-2"></i>Configuración de Notificaciones</h6>
          <div class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>
            Configure cómo desea enviar notificaciones automáticas a los pacientes sobre sus citas.
          </div>
          <div class="row">
            <div class="col-md-6">
              <div class="card border-primary">
                <div class="card-header bg-primary text-white">
                  <h6 class="mb-0"><i class="fas fa-envelope me-2"></i>Notificaciones por Email</h6>
                </div>
                <div class="card-body">
                  <div class="form-check form-switch mb-3">
                    <input class="form-check-input" type="checkbox" id="email_notifications" 
                           ${settingsMap.email_notifications === 'true' ? 'checked' : ''}>
                    <label class="form-check-label" for="email_notifications">
                      <strong>Activar notificaciones por email</strong>
                    </label>
                  </div>
                  <div class="notification-options" id="email-options" style="display: ${settingsMap.email_notifications === 'true' ? 'block' : 'none'}">
                    <div class="form-check mb-2">
                      <input class="form-check-input" type="checkbox" id="email_appointment_confirmation" 
                             ${settingsMap.email_appointment_confirmation === 'true' ? 'checked' : ''}>
                      <label class="form-check-label" for="email_appointment_confirmation">
                        Confirmación de cita
                      </label>
                    </div>
                    <div class="form-check mb-2">
                      <input class="form-check-input" type="checkbox" id="email_appointment_reminder" 
                             ${settingsMap.email_appointment_reminder === 'true' ? 'checked' : ''}>
                      <label class="form-check-label" for="email_appointment_reminder">
                        Recordatorio de cita (24h antes)
                      </label>
                    </div>
                    <div class="form-check mb-2">
                      <input class="form-check-input" type="checkbox" id="email_appointment_changes" 
                             ${settingsMap.email_appointment_changes === 'true' ? 'checked' : ''}>
                      <label class="form-check-label" for="email_appointment_changes">
                        Cambios en la cita
                      </label>
                    </div>
                    <div class="mt-3">
                      <button type="button" class="btn btn-outline-primary btn-sm" onclick="adminPanel.testEmailNotification()">
                        <i class="fas fa-envelope me-1"></i>Probar Email
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card border-success">
                <div class="card-header bg-success text-white">
                  <h6 class="mb-0"><i class="fas fa-sms me-2"></i>Notificaciones por SMS</h6>
                </div>
                <div class="card-body">
                  <div class="form-check form-switch mb-3">
                    <input class="form-check-input" type="checkbox" id="sms_notifications" 
                           ${settingsMap.sms_notifications === 'true' ? 'checked' : ''}>
                    <label class="form-check-label" for="sms_notifications">
                      <strong>Activar notificaciones por SMS</strong>
                    </label>
                  </div>
                  <div class="notification-options" id="sms-options" style="display: ${settingsMap.sms_notifications === 'true' ? 'block' : 'none'}">
                    <div class="form-check mb-2">
                      <input class="form-check-input" type="checkbox" id="sms_appointment_confirmation" 
                             ${settingsMap.sms_appointment_confirmation === 'true' ? 'checked' : ''}>
                      <label class="form-check-label" for="sms_appointment_confirmation">
                        Confirmación de cita
                      </label>
                    </div>
                    <div class="form-check mb-2">
                      <input class="form-check-input" type="checkbox" id="sms_appointment_reminder" 
                             ${settingsMap.sms_appointment_reminder === 'true' ? 'checked' : ''}>
                      <label class="form-check-label" for="sms_appointment_reminder">
                        Recordatorio de cita (24h antes)
                      </label>
                    </div>
                    <div class="form-check mb-2">
                      <input class="form-check-input" type="checkbox" id="sms_appointment_changes" 
                             ${settingsMap.sms_appointment_changes === 'true' ? 'checked' : ''}>
                      <label class="form-check-label" for="sms_appointment_changes">
                        Cambios en la cita
                      </label>
                    </div>
                  </div>
                  <div class="mt-3">
                    <button type="button" class="btn btn-outline-primary btn-sm" onclick="adminPanel.testEmailNotification()">
                      <i class="fas fa-envelope me-1"></i>Probar Email
                    </button>
                  </div>
                  <div class="mt-3">
                    <small class="text-muted">
                      <i class="fas fa-info-circle me-1"></i>
                      Servicio SMS: ${settingsMap.sms_service_status || 'Vonage (activo)'}
                    </small>
                  </div>
                  <div class="mt-3">
                    <button type="button" class="btn btn-outline-success btn-sm" onclick="adminPanel.testSMSNotification()">
                      <i class="fas fa-paper-plane me-1"></i>Probar SMS
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="row mt-3">
            <div class="col-12">
              <div class="card border-warning">
                <div class="card-header bg-warning text-dark">
                  <h6 class="mb-0"><i class="fas fa-clock me-2"></i>Configuración de Horarios</h6>
                </div>
                <div class="card-body">
                  <div class="row">
                    <div class="col-md-6">
                      <div class="mb-3">
                        <label for="reminder_hours_before" class="form-label">Enviar recordatorios (horas antes)</label>
                        <select class="form-select" id="reminder_hours_before">
                          <option value="1" ${settingsMap.reminder_hours_before === '1' ? 'selected' : ''}>1 hora antes</option>
                          <option value="2" ${settingsMap.reminder_hours_before === '2' ? 'selected' : ''}>2 horas antes</option>
                          <option value="6" ${settingsMap.reminder_hours_before === '6' ? 'selected' : ''}>6 horas antes</option>
                          <option value="12" ${settingsMap.reminder_hours_before === '12' ? 'selected' : ''}>12 horas antes</option>
                          <option value="24" ${settingsMap.reminder_hours_before === '24' || !settingsMap.reminder_hours_before ? 'selected' : ''}>24 horas antes</option>
                          <option value="48" ${settingsMap.reminder_hours_before === '48' ? 'selected' : ''}>48 horas antes</option>
                        </select>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="mb-3">
                        <label for="business_hours_only" class="form-label">Envío de notificaciones</label>
                        <div class="form-check">
                          <input class="form-check-input" type="checkbox" id="business_hours_only" 
                                 ${settingsMap.business_hours_only === 'true' ? 'checked' : ''}>
                          <label class="form-check-label" for="business_hours_only">
                            Solo en horario de atención (8:00 AM - 6:00 PM)
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>`;
      this.updateSendRemindersContent(html);
    }
}