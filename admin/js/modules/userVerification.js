// admin/js/modules/userVerification.js
export class UserVerificationModule {
  constructor() {}
  // Add verificación de usuarios logic here
  // Removed duplicate approveUser method. Use the one below with notes prompt and correct endpoint.

  async approveUser(id) {
    const notes = prompt('Notas adicionales (opcional):');
    
    try {
      const response = await fetch(`/api/admin/approval/users/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ notes })
      });

      if (!response.ok) throw new Error('Failed to approve user');

      this.showSuccess('Usuario aprobado exitosamente');
      await this.loadPendingUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      this.showError('Error al aprobar usuario');
    }
  }

  async loadScheduledClosures() {
    try {
      const response = await fetch('/api/admin/schedule/closures', {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to load scheduled closures');

      const closures = await response.json();
      this.renderScheduledClosures(closures);
    } catch (error) {
      console.error('Error loading scheduled closures:', error);
      this.showError('Error al cargar cierres programados');
    }
  }

  renderScheduledClosures(closures) {
    const container = document.getElementById('closures-list');
    if (!container) return;

    if (closures.length === 0) {
      container.innerHTML = '<div class="text-center text-muted py-4">No hay cierres programados</div>';
      return;
    }

    container.innerHTML = closures.map(closure => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h6 class="card-title">${closure.title}</h6>
              <p class="card-text text-muted">${closure.description || 'Sin descripción'}</p>
              <div class="d-flex gap-3 text-sm">
                <span><i class="fas fa-calendar"></i> ${this.formatDateRange(closure.start_date, closure.end_date)}</span>
                ${closure.start_time ? `<span><i class="fas fa-clock"></i> ${closure.start_time} - ${closure.end_time}</span>` : '<span><i class="fas fa-calendar-day"></i> Todo el día</span>'}
                <span class="badge bg-${this.getClosureTypeColor(closure.closure_type)}">${this.getClosureTypeLabel(closure.closure_type)}</span>
                ${closure.is_recurring ? '<span class="badge bg-info">Anual</span>' : ''}
              </div>
            </div>
            <button class="btn btn-outline-danger btn-sm" onclick="adminPanel.deleteScheduledClosure(${closure.id})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  async saveScheduledClosure() {
    const formData = {
      title: document.getElementById('closure-title').value,
      description: document.getElementById('closure-description').value,
      start_date: document.getElementById('closure-start-date').value,
      end_date: document.getElementById('closure-end-date').value,
      start_time: document.getElementById('closure-start-time').value,
      end_time: document.getElementById('closure-end-time').value,
      closure_type: document.getElementById('closure-type').value,
      is_recurring: document.getElementById('closure-recurring').checked
    };

    if (!formData.title || !formData.start_date || !formData.end_date) {
      this.showError('Faltan campos obligatorios');
      return;
    }

    try {
      const response = await fetch('/api/admin/schedule/closures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save closure');

      this.showSuccess('Cierre programado guardado exitosamente');
      
      // Close modal and reload data
      const modal = bootstrap.Modal.getInstance(document.getElementById('addClosureModal'));
      modal.hide();
      document.getElementById('add-closure-form').reset();
      
      await this.loadScheduledClosures();
    } catch (error) {
      console.error('Error saving scheduled closure:', error);
      this.showError('Error al guardar cierre programado');
    }
  }

  async deleteScheduledClosure(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este cierre programado?')) return;

    try {
      const response = await fetch(`/api/admin/schedule/closures/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to delete closure');

      this.showSuccess('Cierre eliminado exitosamente');
      await this.loadScheduledClosures();
    } catch (error) {
      console.error('Error deleting scheduled closure:', error);
      this.showError('Error al eliminar cierre');
    }
  }

  async loadScheduleOverrides() {
    try {
      const response = await fetch('/api/admin/schedule/overrides', {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to load schedule overrides');

      const overrides = await response.json();
      this.renderScheduleOverrides(overrides);
    } catch (error) {
      console.error('Error loading schedule overrides:', error);
      this.showError('Error al cargar horarios especiales');
    }
  }

  renderScheduleOverrides(overrides) {
    const container = document.getElementById('overrides-list');
    if (!container) return;

    if (overrides.length === 0) {
      container.innerHTML = '<div class="text-center text-muted py-4">No hay horarios especiales configurados</div>';
      return;
    }

    container.innerHTML = overrides.map(override => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h6 class="card-title">${this.formatDate(override.date)} - ${override.day_of_week}</h6>
              <p class="card-text text-muted">${override.reason || 'Sin motivo especificado'}</p>
              <div class="d-flex gap-3 text-sm">
                ${override.is_open ? 
                  `<span><i class="fas fa-clock"></i> ${override.open_time} - ${override.close_time}</span>
                   ${override.break_start ? `<span><i class="fas fa-coffee"></i> Descanso: ${override.break_start} - ${override.break_end}</span>` : ''}` 
                  : '<span class="badge bg-danger">Cerrado</span>'}
              </div>
            </div>
            <button class="btn btn-outline-danger btn-sm" onclick="adminPanel.deleteScheduleOverride(${override.id})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  async saveScheduleOverride() {
    const isOpen = document.getElementById('override-is-open').checked;
    const formData = {
      date: document.getElementById('override-date').value,
      reason: document.getElementById('override-reason').value,
      is_open: isOpen,
      open_time: isOpen ? document.getElementById('override-open-time').value : null,
      close_time: isOpen ? document.getElementById('override-close-time').value : null,
      break_start: isOpen ? document.getElementById('override-break-start').value : null,
      break_end: isOpen ? document.getElementById('override-break-end').value : null
    };

    if (!formData.date) {
      this.showError('La fecha es obligatoria');
      return;
    }

    try {
      const response = await fetch('/api/admin/schedule/overrides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save override');

      this.showSuccess('Horario especial guardado exitosamente');
      
      // Close modal and reload data
      const modal = bootstrap.Modal.getInstance(document.getElementById('addOverrideModal'));
      modal.hide();
      document.getElementById('add-override-form').reset();
      
      await this.loadScheduleOverrides();
    } catch (error) {
      console.error('Error saving schedule override:', error);
      this.showError('Error al guardar horario especial');
    }
  }

  resetHolidayTemplateForm() {
    document.getElementById('holidayTemplateForm').reset();
    document.getElementById('holiday-template-id').value = '';
    document.getElementById('custom-hours-section').classList.add('d-none');
    document.getElementById('addHolidayTemplateModalLabel').innerHTML = 
      '<i class="fas fa-star me-2"></i>Nueva Plantilla de Feriado';
  }

  async deleteScheduleOverride(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este horario especial?')) return;

    try {
      const response = await fetch(`/api/admin/schedule/overrides/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to delete override');

      this.showSuccess('Horario especial eliminado exitosamente');
      await this.loadScheduleOverrides();
    } catch (error) {
      console.error('Error deleting schedule override:', error);
      this.showError('Error al eliminar horario especial');
    }
  }

  async rejectUser(userId) {
    // Ask for rejection reason
    const notes = prompt('Motivo del rechazo:');
    if (notes === null) return; // Cancelled prompt

    // Confirm rejection
    if (!confirm('¿Está seguro de que desea rechazar este usuario?')) return;

    try {
        // Try both endpoints for compatibility
        let response = await fetch(`/api/admin/approval/users/${userId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getAuthToken()}`
            },
            body: JSON.stringify({ notes })
        });

        // If first endpoint fails, try the second
        if (!response.ok) {
            response = await fetch(`/api/admin/settings/users/${userId}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
        }

        if (!response.ok) throw new Error('Error rejecting user');

        this.showNotification
            ? this.showNotification('Usuario rechazado', 'warning')
            : alert('Usuario rechazado');
        await this.loadPendingUsers();

    } catch (error) {
        console.error('Error rejecting user:', error);
        this.showError
            ? this.showError('Error al rechazar usuario')
            : alert('Error al rechazar el usuario');
    }
}
async loadPendingUsers() {
    try {
        const response = await fetch('/api/admin/approval/pending-users', {
            headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
        });

        if (!response.ok) throw new Error('Failed to load pending users');

        const users = await response.json();
        this.renderPendingUsers(users);
    } catch (error) {
        console.error('Error loading pending users:', error);
        this.showError('Error al cargar usuarios pendientes');
    }
}

  renderPendingUsers(users) {
    const container = document.getElementById('pending-users-list');
    if (!container) return;

    if (users.length === 0) {
      container.innerHTML = '<div class="text-center text-muted py-3">No hay usuarios pendientes de aprobación</div>';
      return;
    }
    container.innerHTML = users.map(user => `
      <div class="card mb-2">
        <div class="card-body py-2">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <strong>${user.full_name}</strong>
              <br><small class="text-muted">${user.email}</small>
              ${user.phone ? `<br><small class="text-muted">${user.phone}</small>` : ''}
              <br><small class="text-muted">Solicitado: ${this.formatDate(user.requested_at)}</small>
            </div>
            <div class="btn-group">
              <button class="btn btn-success btn-sm" onclick="adminPanel.approveUser(${user.id})">
                <i class="fas fa-check"></i> Aprobar
              </button>
              <button class="btn btn-danger btn-sm" onclick="adminPanel.rejectUser(${user.id})">
                <i class="fas fa-times"></i> Rechazar
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

async loadUnverifiedUsers() {
  try {
    const response = await fetch('/api/admin/users-unverified', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('user_token') || localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const users = await response.json();
    
    const container = document.getElementById('unverified-users');
    if (!container) {
      console.error('Unverified users container not found');
      return;
    }
    
    container.innerHTML = '';
    
    if (users.length === 0) {
      container.innerHTML = '<p>No hay usuarios pendientes de verificación.</p>';
      return;
    }
    
    users.forEach(user => {
      const userDiv = document.createElement('div');
      userDiv.className = 'user-item';
      userDiv.innerHTML = `
        <div class="user-details">
          <h4>${user.name}</h4>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Teléfono:</strong> ${user.phone || 'No especificado'}</p>
          <p><strong>Fecha de registro:</strong> ${new Date(user.created_at).toLocaleString()}</p>
          <p><strong>Citas pendientes:</strong> ${user.pending_appointments || 0}</p>
        </div>
        <div class="user-actions">
          <button class="btn-verify" onclick="adminPanel.verifyUser(${user.id})">
            Verificar Usuario
          </button>
        </div>
      `;
      
      container.appendChild(userDiv);
    });
    
  } catch (error) {
    console.error('Error loading unverified users:', error);
    const container = document.getElementById('unverified-users');
    if (container) {
      container.innerHTML = '<p>Error al cargar usuarios no verificados.</p>';
    }
  }
}

async verifyUser(userId) {
  try {
    const response = await fetch(`/api/admin/users/${userId}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('user_token') || localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    // No need to use the result variable if not used
    await response.json();
    
    // Show success message
    showNotification('Usuario verificado y SMS enviado exitosamente', 'success');
    
    // Refresh the unverified users list
    this.loadUnverifiedUsers();
    
    // Also refresh pending appointments as this user's appointments may now be auto-approved
    if (typeof displayPendingAppointments === 'function') {
      displayPendingAppointments();
    }
    
  } catch (error) {
    console.error('Error verifying user:', error);
    showNotification('Error al verificar el usuario', 'error');
  }
}

}
