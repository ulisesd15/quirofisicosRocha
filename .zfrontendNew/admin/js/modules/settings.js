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
    return localStorage.getItem('token') || localStorage.getItem('userToken') || '';
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
              <label for="clinicName" class="form-label">Nombre de la Clínica</label>
              <input type="text" class="form-control" id="clinicName" name="clinicName"
                     value="${settingsMap.clinicName || 'Quirofísicos Rocha'}">
            </div>
          </div>
          <div class="col-md-6">
            <div class="mb-3">
              <label for="clinicPhone" class="form-label">Teléfono</label>
              <input type="tel" class="form-control" id="clinicPhone" name="clinicPhone"
                     value="${settingsMap.clinicPhone || ''}">
            </div>
          </div>
        </div>
        <div class="mb-3">
          <label for="clinicAddress" class="form-label">Dirección</label>
          <textarea class="form-control" id="clinicAddress" name="clinicAddress" rows="3">${settingsMap.clinicAddress || ''}</textarea>
        </div>
        <div class="mb-3">
          <label for="clinicEmail" class="form-label">Email de Contacto</label>
          <input type="email" class="form-control" id="clinicEmail" name="clinicEmail"
                 value="${settingsMap.clinicEmail || ''}">
        </div>
        <div class="mb-3">
          <label for="clinicDescription" class="form-label">Descripción de la Clínica</label>
          <textarea class="form-control" id="clinicDescription" name="clinicDescription" rows="2">${settingsMap.clinicDescription || ''}</textarea>
        </div>
      </div>

      <div class="settings-group">
        <h6>Configuración de Citas</h6>
        <div class="row">
          <div class="col-md-6">
            <div class="mb-3">
              <label for="appointmentDuration" class="form-label">Duración de Cita (minutos)</label>
              <input type="number" class="form-control" id="appointmentDuration" name="appointmentDuration"
                     value="${settingsMap.appointmentDuration || '60'}" min="15" max="180" step="15">
            </div>
          </div>
          <div class="col-md-6">
            <div class="mb-3">
              <label for="advanceBookingDays" class="form-label">Días máximos de anticipación</label>
              <input type="number" class="form-control" id="advanceBookingDays" name="advanceBookingDays"
                     value="${settingsMap.advanceBookingDays || '30'}" min="1" max="365">
            </div>
          </div>
        </div>
        <div class="form-check mb-3">
          <input class="form-check-input" type="checkbox" id="autoConfirmAppointments" name="autoConfirmAppointments"
                 ${settingsMap.autoConfirmAppointments === 'true' ? 'checked' : ''}>
          <label class="form-check-label" for="autoConfirmAppointments">
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
        { key: 'clinicName', value: form.clinicName.value },
        { key: 'clinicPhone', value: form.clinicPhone.value },
        { key: 'clinicAddress', value: form.clinicAddress.value },
        { key: 'clinicEmail', value: form.clinicRmail.value },
        { key: 'clinicDescription', value: form.clinicDescription.value },
        { key: 'appointmentDuration', value: form.appointmentDuration.value },
        { key: 'advanceBookingDays', value: form.advanceBookingDays.value },
        { key: 'autoConfirmAppointments', value: form.autoConfirmAppointments.checked ? 'true' : 'false' }
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
