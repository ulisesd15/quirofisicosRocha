/**
 * announcements.js
 *
 * Handles admin UI for managing announcements (Anuncios Públicos).
 * - CRUD operations: load, create, edit, delete announcements
 * - UI rendering and form handling for announcements tab
 * - Uses admin REST API routes for announcements
 */

export class AnnouncementsModule {
  constructor() {
    // Bind methods for use as event handlers
    this.loadAnnouncements = this.loadAnnouncements.bind(this);
    this.saveAnnouncement = this.saveAnnouncement.bind(this);
    this.deleteAnnouncement = this.deleteAnnouncement.bind(this);
    this.renderAnnouncements = this.renderAnnouncements.bind(this);
    this.getAuthToken = this.getAuthToken.bind(this);
    this.showError = this.showError.bind(this);
    this.showSuccess = this.showSuccess.bind(this);
  }

  getAuthToken() {
    return localStorage.getItem('token') || localStorage.getItem('userToken') || '';
  }

  showError(message) {
    alert(message);
  }

  showSuccess(message) {
    alert(message);
  }

  async deleteAnnouncement(id) {
    if (!confirm('¿Está seguro de eliminar este anuncio?')) return;
    try {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });
      if (!response.ok) throw new Error('Failed to delete announcement');
      this.showSuccess('Anuncio eliminado exitosamente');
      await this.loadAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      this.showError('Error al eliminar anuncio');
    }
  }

  async saveAnnouncement() {
    const formData = {
      title: document.getElementById('announcement-title').value,
      message: document.getElementById('announcement-content').value,
      announcementType: document.getElementById('announcement-type').value,
      priority: document.getElementById('announcement-priority').value,
      startDate: document.getElementById('announcement-start-date').value,
      endDate: document.getElementById('announcement-end-date').value,
      showOnHomepage: document.getElementById('announcement-active').checked,
      showOnBooking: false
    };
    if (!formData.title || !formData.message || !formData.startDate) {
      this.showError('Faltan campos obligatorios');
      return;
    }
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Error al guardar anuncio');
      this.showSuccess('Anuncio guardado exitosamente');
      // Close modal and refresh list
      const modal = bootstrap.Modal.getInstance(document.getElementById('addAnnouncementModal'));
      modal?.hide();
      document.getElementById('add-announcement-form')?.reset();
      await this.loadAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      this.showError('Error al guardar anuncio: ' + error.message);
    }
  }

  renderAnnouncements(announcements) {
    const container = document.getElementById('announcements-list');
    if (!container) return;
    if (announcements.length === 0) {
      container.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="fas fa-bullhorn fa-3x mb-3"></i>
          <p>No hay anuncios activos. Usa el botón "Nuevo Anuncio" para crear uno.</p>
        </div>
      `;
      return;
    }
    container.innerHTML = announcements.map(announcement => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
              <h6 class="card-title d-flex align-items-center">
                <i class="fas fa-bullhorn me-2 text-${this.getAnnouncementColor(announcement.announcementType)}"></i>
                ${announcement.title}
                <span class="badge bg-${this.getAnnouncementColor(announcement.announcementType)} ms-2">
                  ${this.getAnnouncementTypeLabel(announcement.announcementType)}
                </span>
                <span class="badge bg-secondary ms-1">
                  ${this.getPriorityLabel(announcement.priority)}
                </span>
              </h6>
              <p class="card-text">${announcement.message}</p>
              <div class="d-flex gap-3 text-sm text-muted">
                <span><i class="fas fa-calendar"></i> ${this.formatDateRange(announcement.startTate, announcement.endDate)}</span>
                ${announcement.showOnHomepage ? '<span class="badge bg-success">En página principal</span>' : ''}
                ${announcement.showOnBooking ? '<span class="badge bg-info">En reservas</span>' : ''}
                <span class="text-muted">Por: ${announcement.createdByName || 'Admin'}</span>
              </div>
            </div>
            <div class="btn-group">
              <button class="btn btn-outline-primary btn-sm" onclick="window.adminPanel.editAnnouncement(${announcement.id})">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-outline-danger btn-sm" onclick="window.adminPanel.deleteAnnouncement(${announcement.id})">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
    document.getElementById('save-announcement')?.addEventListener('click', () => this.saveAnnouncement());
  }

  getAnnouncementColor(type) {
    const colors = {
      'info': 'primary',
      'warning': 'warning',
      'success': 'success',
      'danger': 'danger',
      'urgent': 'danger'
    };
    return colors[type] || 'primary';
  }

  getAnnouncementTypeLabel(type) {
    const labels = {
      'info': 'Información',
      'warning': 'Advertencia',
      'success': 'Buenas noticias',
      'danger': 'Urgente',
      'urgent': 'Urgente'
    };
    return labels[type] || 'Información';
  }

  getPriorityLabel(priority) {
    const labels = {
      'low': 'Baja',
      'normal': 'Normal',
      'high': 'Alta',
      'urgent': 'Urgente'
    };
    return labels[priority] || 'Normal';
  }

  formatDateRange(start, end) {
    if (!start) return '';
    if (!end || start === end) return start;
    return `${start} - ${end}`;
  }

  async loadAnnouncements() {
    console.log('[DEBUG] loadAnnouncements() called');
    try {
      const response = await fetch('/api/admin/announcements', {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });
      console.log('[DEBUG] API response:', response);
      if (!response.ok) throw new Error('Failed to load announcements');
      const announcements = await response.json();
      console.log('[DEBUG] announcements array:', announcements);
      this.renderAnnouncements(announcements);
    } catch (error) {
      console.error('Error loading announcements:', error);
      this.showError('Error al cargar anuncios');
    }
  }
}

// For global access in inline HTML event handlers
window.AnnouncementsModule = AnnouncementsModule;
