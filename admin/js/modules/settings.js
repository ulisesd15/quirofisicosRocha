// admin/js/modules/settings.js
export class SettingsModule {
  setupNotificationToggles() {
    // Optionally, add code to handle notification toggle event listeners
  }
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

  showLoading() {
    const spinner = document.getElementById('settings-loading-spinner');
    if (spinner) spinner.style.display = 'block';
  }

  hideLoading() {
    const spinner = document.getElementById('settings-loading-spinner');
    if (spinner) spinner.style.display = 'none';
  }

  
  async loadClinicSettings() {
    try {
      this.showLoading();
      
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Error loading settings');
      
      const data = await response.json();
      // The API returns settings directly, not wrapped in a 'settings' property
      this.displayClinicSettings(data);
      
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showError('Error cargando la configuración');
    } finally {
      this.hideLoading();
    }
  }

  displayClinicSettings(settings) {
    const form = document.getElementById('clinic-settings-form');
    
    // Handle case where settings might be undefined or not an object
    if (!settings || typeof settings !== 'object') {
      console.warn('Invalid settings data received:', settings);
      settings = {};
    }

    // Create a settingsMap to extract values from the API response
    const settingsMap = {};
    Object.keys(settings).forEach(key => {
      settingsMap[key] = settings[key]?.value || '';
    });

    form.innerHTML = `
      <div class="settings-group">
        <h6>Información General</h6>
        <div class="row">
          <div class="col-md-6">
            <div class="mb-3">
              <label for="clinic_name" class="form-label">Nombre de la Clínica</label>
              <input type="text" class="form-control" id="clinic_name" 
                     value="${settingsMap.clinic_name || 'Quirofísicos Rocha'}">
            </div>
          </div>
          <div class="col-md-6">
            <div class="mb-3">
              <label for="clinic_phone" class="form-label">Teléfono</label>
              <input type="tel" class="form-control" id="clinic_phone" 
                     value="${settingsMap.clinic_phone || ''}">
            </div>
          </div>
        </div>
        <div class="mb-3">
          <label for="clinic_address" class="form-label">Dirección</label>
          <textarea class="form-control" id="clinic_address" rows="3">${settingsMap.clinic_address || ''}</textarea>
        </div>
        <div class="mb-3">
          <label for="clinic_email" class="form-label">Email de Contacto</label>
          <input type="email" class="form-control" id="clinic_email" 
                 value="${settingsMap.clinic_email || ''}">
        </div>
      </div>

      <div class="settings-group">
        <h6>Configuración de Citas</h6>
        <div class="row">
          <div class="col-md-6">
            <div class="mb-3">
              <label for="appointment_duration" class="form-label">Duración de Cita (minutos)</label>
              <input type="number" class="form-control" id="appointment_duration" 
                     value="${settingsMap.appointment_duration || '60'}" min="15" max="180" step="15">
            </div>
          </div>
          <div class="col-md-6">
            <div class="mb-3">
              <label for="advance_booking_days" class="form-label">Días máximos de anticipación</label>
              <input type="number" class="form-control" id="advance_booking_days" 
                     value="${settingsMap.advance_booking_days || '30'}" min="1" max="365">
            </div>
          </div>
        </div>
        <div class="form-check mb-3">
          <input class="form-check-input" type="checkbox" id="auto_confirm_appointments" 
                 ${settingsMap.auto_confirm_appointments === 'true' ? 'checked' : ''}>
          <label class="form-check-label" for="auto_confirm_appointments">
            Confirmar citas automáticamente
          </label>
        </div>
      </div>
    `;
    
    // Add event listeners for notification toggles
    this.setupNotificationToggles();
  }

  // Add configuración/settings logic here
}
