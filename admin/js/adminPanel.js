


class AdminPanel {
  constructor() {
    this.dashboard = new DashboardModule();
    this.appointments = new AppointmentsModule();
    this.users = new UsersModule();
    this.schedule = new ScheduleModule();
    this.settings = new SettingsModule();
    this.userVerification = new UserVerificationModule();
    this.serverStatus = new ServerStatusModule();
    this.initEventListeners();
  }

  initEventListeners() {
    // Navigation/tab switching logic here
    const tabLinks = document.querySelectorAll('.nav-link[data-tab]');
    tabLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.getAttribute('data-tab');
        this.showTab(tab);
      });
    });
  }

  showTab(tab) {
    // Instantiate and expose globally if needed
    window.adminPanel = new AdminPanel();
    console.log('SMS tab listeners initialized');
    
    // Initialize button event listeners
    this.initializeSMSEventListeners();
  }

  initializeSMSEventListeners() {
    // Add event listener for the load unverified users button
    const loadUnverifiedBtn = document.getElementById('load-unverified-users-btn');
    if (loadUnverifiedBtn && !loadUnverifiedBtn.hasAttribute('data-listener-added')) {
      loadUnverifiedBtn.addEventListener('click', () => {
        this.loadUserVerification();
      });
      loadUnverifiedBtn.setAttribute('data-listener-added', 'true');
    }
    
    // Add event listener for the send reminders button
    const sendRemindersBtn = document.getElementById('send-reminders-btn');
    if (sendRemindersBtn && !sendRemindersBtn.hasAttribute('data-listener-added')) {
      sendRemindersBtn.addEventListener('click', () => {
        this.sendAppointmentReminders();
      });
      sendRemindersBtn.setAttribute('data-listener-added', 'true');
    }
  }

  async loadUserVerification() {
    console.log('Loading user verification data');
    // Load unverified users if this function exists globally
    if (window.loadUnverifiedUsers) {
      await window.loadUnverifiedUsers();
    } else {
      console.warn('loadUnverifiedUsers function not found globally');
    }
  }

  initializeSendReminders() {
    console.log('Initializing send reminders functionality');
    // Any specific initialization for send reminders tab
  }

  async sendAppointmentReminders() {
    console.log('Sending appointment reminders');
    if (window.sendAppointmentReminders) {
      await window.sendAppointmentReminders();
    } else {
      console.warn('sendAppointmentReminders function not found globally');
    }
  }

  // Helper function to activate the first tab in a section
  activateFirstTab(sectionType) {
    let firstTabId, firstContentId;
    
    switch (sectionType) {
      case 'schedule':
        firstTabId = 'business-hours-tab';
        firstContentId = 'business-hours';
        break;
      case 'settings':
        firstTabId = 'general-settings-tab';
        firstContentId = 'general-settings';
        break;
      case 'sms-management':
        firstTabId = 'user-verification-tab';
        firstContentId = 'user-verification';
        break;
      default:
        console.warn('Unknown section type for tab activation:', sectionType);
        return;
    }
    
    // Activate the first tab
    const firstTab = document.getElementById(firstTabId);
    const firstContent = document.getElementById(firstContentId);
    
    if (firstTab && firstContent) {
      // Remove active class from all tabs in this section
      const sectionTabs = firstTab.closest('.nav-tabs');
      if (sectionTabs) {
        sectionTabs.querySelectorAll('.nav-link').forEach(tab => {
          tab.classList.remove('active');
        });
      }
      
      // Remove active class from all tab content in this section
      const tabContent = firstContent.closest('.tab-content');
      if (tabContent) {
        tabContent.querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.remove('active', 'show');
        });
      }
      
      // Activate the first tab and content
      firstTab.classList.add('active');
      firstContent.classList.add('active', 'show');
      
      console.log(`Activated first tab for ${sectionType}: ${firstTabId}`);
    } else {
      console.warn(`Could not find tab elements for ${sectionType}:`, { firstTabId, firstContentId });
    }
  }

  initializeSettingsTabListeners() {
    // Only initialize once to prevent duplicate listeners
    if (this.initializedTabListeners.settings) {
      console.log('Settings tab listeners already initialized');
      return;
    }
    
    // Add event listeners for settings tabs
    const generalTab = document.getElementById('general-settings-tab');
    const annualExceptionsTab = document.getElementById('annual-exceptions-settings-tab');
    
    if (generalTab) {
      generalTab.addEventListener('shown.bs.tab', async () => {
        console.log('General settings tab activated');
        await this.loadClinicSettings();
      });
    }
    
    if (annualExceptionsTab) {
      annualExceptionsTab.addEventListener('shown.bs.tab', async () => {
        console.log('Annual exceptions settings tab activated');
        await this.loadAnnualClosures('settings');
        this.initializeAnnualExceptionsSettingsEventListeners();
      });
    }
    
    this.initializedTabListeners.settings = true;
    console.log('Settings tab listeners initialized');
    
    // Initialize other event listeners for settings
    this.initializeSettingsEventListeners();
  }

  initializeAnnualExceptionsSettingsEventListeners() {
    // Add yearly closure button
    const addAnnualClosureBtn = document.getElementById('add-annual-closure-btn-settings');
    if (addAnnualClosureBtn) {
      addAnnualClosureBtn.addEventListener('click', () => this.addAnnualClosure('settings'));
    }
  }

  async loadAnnualClosures(context = 'settings') {
    try {
      const response = await fetch('/api/admin/schedule/annual-closures', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('user_token') || localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const closures = await response.json();
        this.displayAnnualClosures(closures, context);
      } else {
        throw new Error('Error loading annual closures');
      }
    } catch (error) {
      console.error('Error loading annual closures:', error);
      const containerId = `annual-closures-list-${context}`;
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = `
          <div class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>
            Los días cerrados anuales aparecerán aquí cuando sean agregados.
          </div>
        `;
      }
    }
  }

  displayAnnualClosures(closures, context = 'settings') {
    const containerId = `annual-closures-list-${context}`;
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!closures || closures.length === 0) {
      container.innerHTML = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>
          No hay días cerrados anuales configurados.
        </div>
      `;
      return;
    }

    container.innerHTML = closures.map(closure => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="row">
            <div class="col-md-8">
              <h6>${this.formatDate(closure.date)} - ${closure.reason}</h6>
              <p class="text-muted">${closure.description || 'Sin descripción'}</p>
              <small class="badge bg-danger">Cerrado todo el día</small>
              ${closure.is_recurring ? '<br><small class="badge bg-info">Recurrente</small>' : ''}
            </div>
            <div class="col-md-4 text-end">
              <button class="btn btn-outline-primary btn-sm me-2" data-action="edit-annual-closure" data-closure-id="${closure.id}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-outline-danger btn-sm" data-action="delete-annual-closure" data-closure-id="${closure.id}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  async addAnnualClosure(context = 'settings') {
    // Get form data based on context
    const suffix = `-${context}`;
    const date = document.getElementById(`closure-date${suffix}`)?.value;
    const reason = document.getElementById(`closure-reason${suffix}`)?.value;
    const description = document.getElementById(`closure-description${suffix}`)?.value;
    const isRecurring = document.getElementById(`recurring${suffix}`)?.checked;
    
    if (!date || !reason) {
  showNotification('Por favor complete los campos requeridos', 'error');
      return;
    }
    
    const closureData = {
      date: date,
      reason: reason,
      description: description || '',
      closure_type: 'full_day', // Always full day closure
      is_recurring: isRecurring
    };
    
    try {
      const response = await fetch('/api/admin/schedule/annual-closures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('user_token') || localStorage.getItem('token')}`
        },
        body: JSON.stringify(closureData)
      });
      
      if (response.ok) {
  showNotification('Día cerrado agregado exitosamente', 'success');
        // Clear form based on context
        const formId = `annual-closure-form-${context}`;
        document.getElementById(formId)?.reset();
        // Reload the list
        await this.loadAnnualClosures(context);
      } else {
        throw new Error('Error al agregar día cerrado');
      }
    } catch (error) {
      console.error('Error adding annual closure:', error);
  showNotification('Error al agregar día cerrado', 'error');
    }
  }

  initializeSettingsEventListeners() {
    // Set default dates for forms
    const today = new Date().toISOString().split('T')[0];
    const closureDateInput = document.getElementById('closure-date-settings');
    
    if (closureDateInput) {
      closureDateInput.min = today;
    }
  }

  initializeYearlyClosuresEventListeners() {
    // Add yearly closure button
    const addYearlyClosureBtn = document.getElementById('add-yearly-closure-btn');
    if (addYearlyClosureBtn) {
      addYearlyClosureBtn.addEventListener('click', () => this.addYearlyClosure());
    }
  }

  async loadYearlyClosures(context = 'main') {
    // This function would load existing yearly closures from schedule_exceptions
    // For now, we'll show a placeholder until the backend is enhanced
    const containerId = context === 'schedule' ? 'yearly-closures-list-schedule' : 'yearly-closures-list';
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>
          Los días cerrados anuales aparecerán aquí cuando sean agregados.
        </div>
      `;
    }
  }

  async addYearlyClosure(context = 'main') {
    // Get form data based on context
    const suffix = context === 'schedule' ? '-schedule' : '';
    const date = document.getElementById(`closure-date${suffix}`)?.value;
    const reason = document.getElementById(`closure-reason${suffix}`)?.value;
    const description = document.getElementById(`closure-description${suffix}`)?.value;
    const closureType = document.getElementById(`closure-type${suffix === '' ? '-yearly' : suffix}`)?.value;
    const isRecurring = document.getElementById(`recurring${suffix === '' ? '-yearly' : suffix}`)?.checked;
    
    if (!date || !reason) {
  showNotification('Por favor complete los campos requeridos', 'error');
      return;
    }
    
    const closureData = {
      date: date,
      reason: reason,
      description: description || '',
      closure_type: closureType,
      is_recurring: isRecurring
    };
    
    // Add custom hours if applicable
    if (closureType === 'custom_hours') {
      const openTime = document.getElementById(`custom-open${suffix === '' ? '-yearly' : suffix}`)?.value;
      const closeTime = document.getElementById(`custom-close${suffix === '' ? '-yearly' : suffix}`)?.value;
      
      if (!openTime || !closeTime) {
  showNotification('Por favor especifique las horas personalizadas', 'error');
        return;
      }
      
      closureData.custom_open_time = openTime;
      closureData.custom_close_time = closeTime;
    }
    
    try {
      const response = await fetch('/api/admin/schedule/yearly-closures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('user_token') || localStorage.getItem('token')}`
        },
        body: JSON.stringify(closureData)
      });
      
      if (response.ok) {
  showNotification('Día cerrado agregado exitosamente', 'success');
        // Clear form based on context
        const formId = context === 'schedule' ? 'yearly-closure-form-schedule' : 'yearly-closure-form';
        document.getElementById(formId)?.reset();
        // Reload the list
        await this.loadYearlyClosures(context);
      } else {
        throw new Error('Error al agregar día cerrado');
      }
    } catch (error) {
      console.error('Error adding yearly closure:', error);
  showNotification('Error al agregar día cerrado', 'error');
    }
  }

  

  // New methods for scheduled business hours functionality
  


  generatePreviewHTML(scheduleData, effectiveDate) {
    const dayNames = {
      monday: 'Lunes',
      tuesday: 'Martes', 
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };

    const selectedDate = new Date(effectiveDate);
    const today = new Date();
    const isImmediate = selectedDate.toDateString() === today.toDateString();

    let html = `
      <div class="alert alert-info">
        <i class="fas fa-calendar-alt me-2"></i>
        <strong>Fecha de aplicación:</strong> ${selectedDate.toLocaleDateString('es-ES')}
        ${isImmediate ? '<span class="badge bg-warning ms-2">Inmediato</span>' : ''}
      </div>
      <h6>Horarios programados:</h6>
      <div class="schedule-preview">
    `;

    Object.entries(scheduleData).forEach(([day, data]) => {
      const dayName = dayNames[day];
      const status = data.isOpen ? 
        `<span class="text-success"><i class="fas fa-clock me-1"></i>${data.openTime} - ${data.closeTime}</span>` :
        `<span class="text-danger"><i class="fas fa-times me-1"></i>Cerrado</span>`;
      
      html += `
        <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
          <strong>${dayName}</strong>
          ${status}
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  async saveScheduledBusinessHours() {
    try {
      this.showLoading();
      
      const effectiveDate = document.getElementById('schedule-effective-date')?.value;
      const scheduleData = this.collectBusinessHoursData();
      
      if (!effectiveDate) {
  showNotification('Por favor selecciona una fecha efectiva', 'error');
        return;
      }

      // Validate schedule data
      if (!this.validateScheduleData(scheduleData)) {
  showNotification('Por favor verifica los horarios ingresados', 'error');
        return;
      }

      const response = await fetch('/api/admin/schedule/business-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          effective_date: effectiveDate,
          schedule_data: scheduleData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
  showNotification('Horarios programados guardados exitosamente', 'success');
        
        // Reload business hours to show current state
        await this.loadBusinessHours();
        
        // Reset the form to today's date
        const dateInput = document.getElementById('schedule-effective-date');
        if (dateInput) {
          const today = new Date().toISOString().split('T')[0];
          dateInput.value = today;
        }
        
        this.updateScheduleStatus();
      } else {
        throw new Error(result.message || 'Error saving schedule');
      }

    } catch (error) {
      console.error('Error saving scheduled business hours:', error);
  showNotification('Error al guardar los horarios programados', 'error');
    } finally {
      this.hideLoading();
    }
  }

  validateScheduleData(scheduleData) {
    // Check if at least one day is open
    const hasOpenDays = scheduleData.some(day => day.is_open);
    if (!hasOpenDays) {
      return false;
    }

    // Validate time format for open days
    for (const day of scheduleData) {
      if (day.is_open) {
        if (!day.open_time || !day.close_time) {
          return false;
        }
        
        // Check if open time is before close time
        if (day.open_time >= day.close_time) {
          return false;
        }

        // Validate break times if provided
        if (day.break_start && day.break_end) {
          if (day.break_start >= day.break_end) {
            return false;
          }
          // Break should be within business hours
          if (day.break_start < day.open_time || day.break_end > day.close_time) {
            return false;
          }
        }
      }
    }

    return true;
  }

  // Notification Testing Functions
  async testEmailNotification() {
    try {
      const response = await fetch('/api/admin/test-email-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          testType: 'email',
          message: 'Este es un mensaje de prueba del sistema de notificaciones por email.'
        })
      });

      if (!response.ok) throw new Error('Error sending test email');
      
      const result = await response.json();
      this.showSuccess('Email de prueba enviado correctamente. Revisa tu bandeja de entrada.');
      
    } catch (error) {
      console.error('Error testing email:', error);
      this.showError('Error enviando el email de prueba: ' + error.message);
    }
  }

  async testSMSNotification() {
    try {
      const phone = prompt('Ingresa el número de teléfono para la prueba (incluye código de país, ej: +52XXXXXXXXXX):');
      if (!phone) return;

      const response = await fetch('/api/admin/test-sms-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          testType: 'sms',
          phone: phone,
          message: 'Este es un mensaje de prueba del sistema de notificaciones SMS de Quirofísicos Rocha.'
        })
      });

      if (!response.ok) throw new Error('Error sending test SMS');
      
      const result = await response.json();
      this.showSuccess('SMS de prueba enviado correctamente a ' + phone);
      
    } catch (error) {
      console.error('Error testing SMS:', error);
      this.showError('Error enviando el SMS de prueba: ' + error.message);
    }
  }

  // Admin Password Management
  showPasswordChangeModal() {
    const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    document.getElementById('admin-password-form').reset();
    modal.show();
  }

  async changeAdminPassword() {
    const currentPassword = document.getElementById('admin-current-password').value;
    const newPassword = document.getElementById('admin-new-password').value;
    const confirmPassword = document.getElementById('admin-confirm-password').value;

    // Validate fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      this.showError('Todos los campos son obligatorios');
      return;
    }

    if (newPassword !== confirmPassword) {
      this.showError('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      this.showError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          currentPassword: currentPassword,
          newPassword: newPassword
        })
      });

      const result = await response.json();

      if (response.ok) {
        this.showSuccess('Contraseña de administrador actualizada correctamente');
        const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
        modal.hide();
        document.getElementById('admin-password-form').reset();
      } else {
        throw new Error(result.error || 'Error al cambiar la contraseña');
      }
    } catch (error) {
      console.error('Error changing admin password:', error);
      this.showError('Error al cambiar la contraseña: ' + error.message);
    }
  }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('Initializing AdminPanel...');
    window.adminPanel = new AdminPanel();
    console.log('AdminPanel initialized successfully:', window.adminPanel);
  } catch (error) {
    console.error('Failed to initialize AdminPanel:', error);
  }
});
