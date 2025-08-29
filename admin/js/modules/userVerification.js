// admin/js/modules/userVerification.js
export class UserVerificationModule {
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
    this.showLoading();
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
      // Show error in the pending users container
      const container = document.getElementById('pending-users');
      if (container) {
        container.innerHTML = '<p style="color:red;">Error del servidor: no se pudieron cargar los usuarios pendientes. Intente más tarde.</p>';
      }
    } finally {
      this.hideLoading();
    }
  }

  async loadUnverifiedUsers() {
    this.showLoading();
    try {
      const response = await fetch('/api/admin/users-unverified', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Failed to load unverified users');

      const users = await response.json();
      this.renderUnverifiedUsers(users);
    } catch (error) {
      console.error('Error loading unverified users:', error);
      this.showError('Error al cargar usuarios no verificados');
    } finally {
      this.hideLoading();
    }
  }


  async verifyUser(userId) {
    this.showLoading();
    try {
      const response = await fetch(`/api/admin/approval/users/${userId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Failed to verify user');

      this.showSuccess('Usuario verificado exitosamente');
      await this.loadUnverifiedUsers();
    } catch (error) {
      console.error('Error verifying user:', error);
      this.showError('Error al verificar usuario');
    } finally {
      this.hideLoading();
    }
  }

  renderPendingUsers(users) {
    const container = document.getElementById('pending-users');
    if (!container) {
      console.error('Pending users container not found');
      return;
    }

    container.innerHTML = '';

    if (users.length === 0) {
      container.innerHTML = '<p>No hay usuarios pendientes de aprobación.</p>';
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
        </div>
        <button class="btn btn-success btn-sm" onclick="adminPanel.userVerification.approveUser(${user.id})">Aprobar</button>
        <button class="btn btn-danger btn-sm" onclick="adminPanel.userVerification.rejectUser(${user.id})">Rechazar</button>
      `;
      container.appendChild(userDiv);
    });
  }

  renderScheduledClosures(closures) {
    const container = document.getElementById('scheduled-closures');
    if (!container) {
      console.error('Scheduled closures container not found');
      return;
    }

    container.innerHTML = '';

    if (closures.length === 0) {
      container.innerHTML = '<p>No hay cierres programados.</p>';
      return;
    }

    closures.forEach(closure => {
      const closureDiv = document.createElement('div');
      closureDiv.className = 'closure-item';
      closureDiv.innerHTML = `
        <div class="closure-details">
          <h4>${closure.title}</h4>
          <p><strong>Fecha:</strong> ${new Date(closure.date).toLocaleString()}</p>
          <p><strong>Descripción:</strong> ${closure.description}</p>
        </div>
      `;
      container.appendChild(closureDiv);
    });
  }

  renderScheduleOverrides(overrides) {
    const container = document.getElementById('schedule-overrides');
    if (!container) {
      console.error('Schedule overrides container not found');
      return;
    }

    container.innerHTML = '';

    if (overrides.length === 0) {
      container.innerHTML = '<p>No hay modificaciones de horario programadas.</p>';
      return;
    }

    overrides.forEach(override => {
      const overrideDiv = document.createElement('div');
      overrideDiv.className = 'override-item';
      overrideDiv.innerHTML = `
        <div class="override-details">
          <h4>${override.title}</h4>
          <p><strong>Fecha:</strong> ${new Date(override.date).toLocaleString()}</p>
          <p><strong>Descripción:</strong> ${override.description}</p>
        </div>
      `;
      container.appendChild(overrideDiv);
    });
  }

}