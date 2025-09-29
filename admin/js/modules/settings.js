/**
 * settings.js
 *
 * Handles clinic and appointment settings management for the admin panel.
 * - Loads, displays, and saves clinic and appointment configuration.
 * - Provides UI updates for loading, errors, and saving.
 * - Exports a SettingsModule for use in the admin UI.
 */

export class SettingsModule {
  /**
   * Sets up event listeners for notification toggles (placeholder).
   */
  setupNotificationToggles() {
    // Optionally, add code to handle notification toggle event listeners
  }
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
   * Shows the loading spinner for user actions (users spinner).
   */
  showLoading() {
    const spinner = document.getElementById('users-loading-spinner');
    if (spinner) spinner.style.display = 'block';
  }
  /**
   * Hides the loading spinner for user actions (users spinner).
   */
  hideLoading() {
    const spinner = document.getElementById('users-loading-spinner');
    if (spinner) spinner.style.display = 'none';
  }
  /**
   * Initializes SettingsModule (currently empty).
   */
  constructor() {}

  /**
   * Shows the loading spinner for settings actions.
   */
  showLoading() {
    const spinner = document.getElementById('settings-loading-spinner');
    if (spinner) spinner.style.display = 'block';
  }

  /**
   * Hides the loading spinner for settings actions.
   */
  hideLoading() {
    const spinner = document.getElementById('settings-loading-spinner');
    if (spinner) spinner.style.display = 'none';
  }

  /**
   * Loads clinic settings from the backend and displays them in the form.
   */
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

  /**
   * Renders the clinic settings form and handles save logic.
   */
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
              <input type="text" class="form-control" id="clinic_name" name="clinic_name"
                     value="${settingsMap.clinic_name || 'Quirofísicos Rocha'}">
            </div>
          </div>
          <div class="col-md-6">
            <div class="mb-3">
              <label for="clinic_phone" class="form-label">Teléfono</label>
              <input type="tel" class="form-control" id="clinic_phone" name="clinic_phone"
                     value="${settingsMap.clinic_phone || ''}">
            </div>
          </div>
        </div>
        <div class="mb-3">
          <label for="clinic_address" class="form-label">Dirección</label>
          <textarea class="form-control" id="clinic_address" name="clinic_address" rows="3">${settingsMap.clinic_address || ''}</textarea>
        </div>
        <div class="mb-3">
          <label for="clinic_email" class="form-label">Email de Contacto</label>
          <input type="email" class="form-control" id="clinic_email" name="clinic_email"
                 value="${settingsMap.clinic_email || ''}">
        </div>
        <div class="mb-3">
          <label for="clinic_description" class="form-label">Descripción de la Clínica</label>
          <textarea class="form-control" id="clinic_description" name="clinic_description" rows="2">${settingsMap.clinic_description || ''}</textarea>
        </div>
      </div>

      <div class="settings-group">
        <h6>Configuración de Citas</h6>
        <div class="row">
          <div class="col-md-6">
            <div class="mb-3">
              <label for="appointment_duration" class="form-label">Duración de Cita (minutos)</label>
              <input type="number" class="form-control" id="appointment_duration" name="appointment_duration"
                     value="${settingsMap.appointment_duration || '60'}" min="15" max="180" step="15">
            </div>
          </div>
          <div class="col-md-6">
            <div class="mb-3">
              <label for="advance_booking_days" class="form-label">Días máximos de anticipación</label>
              <input type="number" class="form-control" id="advance_booking_days" name="advance_booking_days"
                     value="${settingsMap.advance_booking_days || '30'}" min="1" max="365">
            </div>
          </div>
        </div>
        <div class="form-check mb-3">
          <input class="form-check-input" type="checkbox" id="auto_confirm_appointments" name="auto_confirm_appointments"
                 ${settingsMap.auto_confirm_appointments === 'true' ? 'checked' : ''}>
          <label class="form-check-label" for="auto_confirm_appointments">
            Confirmar citas automáticamente
          </label>
        </div>
      </div>
      <button type="submit" class="btn btn-primary mt-3">Guardar Cambios</button>
    `;

    // Add event listeners for notification toggles
    this.setupNotificationToggles();

    // Add submit handler for saving settings
    form.onsubmit = async (e) => {
      e.preventDefault();
      const settingsToSave = [
        { key: 'clinic_name', value: form.clinic_name.value },
        { key: 'clinic_phone', value: form.clinic_phone.value },
        { key: 'clinic_address', value: form.clinic_address.value },
        { key: 'clinic_email', value: form.clinic_email.value },
        { key: 'clinic_description', value: form.clinic_description.value },
        { key: 'appointment_duration', value: form.appointment_duration.value },
        { key: 'advance_booking_days', value: form.advance_booking_days.value },
        { key: 'auto_confirm_appointments', value: form.auto_confirm_appointments.checked ? 'true' : 'false' }
      ];
      try {
        this.showLoading();
        const response = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken()}`
          },
          body: JSON.stringify({ settings: settingsToSave })
        });
        if (!response.ok) throw new Error('Error guardando configuración');
        this.showError('Configuración guardada correctamente');
      } catch (err) {
        console.error('Error saving settings:', err);
        this.showError('Error guardando configuración');
      } finally {
        this.hideLoading();
      }
    };
  }

  // Add configuración/settings logic here
}
