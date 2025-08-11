// admin/js/modules/settings.js
export class SettingsModule {
  constructor() {}

  
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
      </div>
    `;
    
    // Add event listeners for notification toggles
    this.setupNotificationToggles();
  }

  // Add configuración/settings logic here
}
