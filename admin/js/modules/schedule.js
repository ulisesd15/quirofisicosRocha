/**
 * schedule.js
 *
 * Handles business hours, holiday templates, and schedule exceptions for the admin panel.
 * - Loads, displays, and saves business hours and schedule exceptions.
 * - Manages holiday templates and yearly holiday generation.
 * - Provides UI updates, event listeners, and error handling for schedule management.
 * - Exports a ScheduleModule for use in the admin UI.
 */

export class ScheduleModule {
  constructor() {
    this.exceptionsTabInitialized = false;
  }

  /**
   * Retrieves the current authentication token from localStorage.
   */
  getAuthToken() {
    return localStorage.getItem('token') || localStorage.getItem('user_token') || '';
  }

  /**
   * Displays an error alert.
   */
  showError(message) {
    this.showNotification(message, 'danger');
  }

  /**
   * Displays a success alert.
   */
  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  /**
   * Shows a notification toast.
   */
  showNotification(message, type = 'info') {
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.style.position = 'fixed';
      container.style.top = '20px';
      container.style.right = '20px';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }
    const alertType = type === 'success' ? 'alert-success' : type === 'danger' ? 'alert-danger' : 'alert-info';
    const notification = document.createElement('div');
    notification.className = `alert ${alertType} fade show`;
    notification.innerHTML = `<i class="fas fa-info-circle me-2"></i>${message}`;
    container.appendChild(notification);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 500);
    }, 3500);
  }

  /**
   * Shows the loading spinner.
   */
  showLoading() {
    const spinner = document.getElementById('schedule-loading-spinner');
    if (spinner) spinner.style.display = 'block';
  }

  /**
   * Hides the loading spinner.
   */
  hideLoading() {
    const spinner = document.getElementById('schedule-loading-spinner');
    if (spinner) spinner.style.display = 'none';
  }

  /**
   * Loads and initializes the schedule section UI and data.
   */
  async loadScheduleSection() {
    console.log('Loading comprehensive schedule section');

    // Initialize the effective date picker
    this.initializeEffectiveDatePicker();

    // Load business hours data with proper error handling
    try {
      await this.loadBusinessHours();
      console.log('Business hours loaded successfully');
    } catch (error) {
      console.error('Error loading business hours in schedule section:', error);
    }

    // Initialize event listeners for schedule features
    this.initScheduleEventListeners();

    // Initialize tab listeners
    this.initScheduleTabListeners();

    // Add event listener for save-business-hours button
    const saveBtn = document.getElementById('save-business-hours');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveBusinessHours());
    }

    console.log('Schedule section loading complete');
  }

  /**
   * Initializes tab listeners for schedule section.
   */
  initScheduleTabListeners() {
    console.log('Initializing schedule tab listeners');

    // Schedule Exceptions Tab
    const scheduleExceptionsTab = document.getElementById('schedule-exceptions-tab');
    if (scheduleExceptionsTab && !scheduleExceptionsTab.dataset.listenerAttached) {
      scheduleExceptionsTab.addEventListener('shown.bs.tab', async () => {
        console.log('Schedule exceptions tab activated');
        await this.loadScheduleExceptionsTab();
      });
      scheduleExceptionsTab.dataset.listenerAttached = 'true';
      console.log('Schedule exceptions tab listener attached');
    }

    // Announcements Tab - handled by announcements.js
    const announcementsTab = document.getElementById('announcements-tab');
    if (announcementsTab && !announcementsTab.dataset.listenerAttached) {
      announcementsTab.addEventListener('shown.bs.tab', () => {
        console.log('Announcements tab activated (handled by announcements module)');
      });
      announcementsTab.dataset.listenerAttached = 'true';
    }
  }

  /**
   * Loads the schedule exceptions tab content and data.
   */
  async loadScheduleExceptionsTab() {
    // Only initialize once
    if (this.exceptionsTabInitialized) {
      console.log('Schedule exceptions tab already initialized, just refreshing data');
      await this.loadScheduleExceptions();
      await this.loadHolidayTemplates();
      return;
    }

    console.log('First time loading schedule exceptions tab');
    
    // Hide placeholder and show content
    const placeholder = document.getElementById('schedule-exceptions-placeholder');
    const content = document.getElementById('schedule-exceptions-content');
    
    if (placeholder) placeholder.classList.add('d-none');
    if (content) content.classList.remove('d-none');

    // Load data
    await Promise.all([
      this.loadScheduleExceptions(),
      this.loadHolidayTemplates()
    ]);

    // Set up event listeners
    this.setupScheduleExceptionsListeners();

    this.exceptionsTabInitialized = true;
    console.log('Schedule exceptions tab initialized');
  }

  /**
   * Sets up event listeners specific to schedule exceptions.
   */
  setupScheduleExceptionsListeners() {
    console.log('Setting up schedule exceptions listeners');

    // Generate holidays button
    const generateBtn = document.getElementById('generate-holidays-btn');
    if (generateBtn && !generateBtn.dataset.listenerAttached) {
      generateBtn.addEventListener('click', () => this.generateYearlyHolidays());
      generateBtn.dataset.listenerAttached = 'true';
      console.log('Generate holidays button listener attached');
    }

    // Save schedule exception button
    const saveBtn = document.getElementById('save-schedule-exception');
    if (saveBtn && !saveBtn.dataset.listenerAttached) {
      saveBtn.addEventListener('click', () => this.saveScheduleException());
      saveBtn.dataset.listenerAttached = 'true';
      console.log('Save schedule exception button listener attached');
    }

    // Exception type selector
    const typeSelect = document.getElementById('exception-type-select');
    if (typeSelect && !typeSelect.dataset.listenerAttached) {
      typeSelect.addEventListener('change', (e) => {
        const endDateContainer = document.getElementById('end-date-container');
        if (endDateContainer) {
          if (e.target.value === 'date_range') {
            endDateContainer.classList.remove('d-none');
          } else {
            endDateContainer.classList.add('d-none');
          }
        }
      });
      typeSelect.dataset.listenerAttached = 'true';
      console.log('Exception type selector listener attached');
    }

    // Closed toggle
    const closedToggle = document.getElementById('exception-is-closed');
    if (closedToggle && !closedToggle.dataset.listenerAttached) {
      closedToggle.addEventListener('change', (e) => {
        const customHoursSection = document.getElementById('custom-hours-section');
        if (customHoursSection) {
          if (e.target.checked) {
            customHoursSection.style.display = 'none';
          } else {
            customHoursSection.style.display = 'block';
          }
        }
      });
      closedToggle.dataset.listenerAttached = 'true';
      console.log('Closed toggle listener attached');
    }
  }

  /**
   * Loads schedule exceptions from the backend.
   */
  async loadScheduleExceptions() {
    console.log('Loading schedule exceptions');
    try {
      const response = await fetch('/api/admin/schedule-exceptions', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      console.log('Schedule exceptions loaded:', data);
      
      // Handle both array directly or nested in data property
      const exceptions = Array.isArray(data) ? data : (data.exceptions || []);
      this.renderScheduleExceptions(exceptions);
    } catch (error) {
      console.error('Error loading schedule exceptions:', error);
      const container = document.getElementById('schedule-exceptions-list');
      if (container) {
        container.innerHTML = `
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle me-2"></i>
            No se pudieron cargar las excepciones: ${error.message}
          </div>
        `;
      }
    }
  }

  /**
   * Renders schedule exceptions in the UI.
   */
  renderScheduleExceptions(exceptions) {
    const container = document.getElementById('schedule-exceptions-list');
    if (!container) {
      console.warn('Schedule exceptions list container not found');
      return;
    }

    if (!exceptions || exceptions.length === 0) {
      container.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="fas fa-calendar-times fa-3x mb-3"></i>
          <p>No hay excepciones de horario programadas</p>
        </div>
      `;
      return;
    }

    container.innerHTML = exceptions.map(exception => {
      // Handle both camelCase and snake_case
      const isClosed = exception.isClosed !== undefined ? exception.isClosed : exception.is_closed;
      const recurringType = exception.recurringType || exception.recurring_type;
      const startDate = exception.startDate || exception.start_date;
      const endDate = exception.endDate || exception.end_date;
      const customOpenTime = exception.customOpenTime || exception.custom_open_time;
      const customCloseTime = exception.customCloseTime || exception.custom_close_time;
      const exceptionType = exception.type || exception.exception_type;
      
      return `
        <div class="card mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <h6 class="card-title d-flex align-items-center">
                  <i class="fas fa-calendar-times me-2 text-warning"></i>
                  ${exception.reason}
                  <span class="badge bg-${isClosed ? 'danger' : 'info'} ms-2">
                    ${isClosed ? 'Cerrado' : 'Horario especial'}
                  </span>
                  ${recurringType === 'yearly' ? '<span class="badge bg-warning ms-2">Anual</span>' : ''}
                </h6>
                <p class="card-text text-muted mb-2">${exception.description || 'Sin descripción adicional'}</p>
                <div class="d-flex gap-3 text-sm">
                  <span><i class="fas fa-calendar me-1"></i> ${this.formatDateRange(startDate, endDate)}</span>
                  ${!isClosed && customOpenTime ? `
                    <span><i class="fas fa-clock me-1"></i> ${customOpenTime} - ${customCloseTime}</span>
                  ` : ''}
                  <span class="badge bg-secondary">${exceptionType === 'single_day' ? 'Día específico' : 'Rango de fechas'}</span>
                </div>
              </div>
              <div class="btn-group">
                <button class="btn btn-outline-danger btn-sm" onclick="adminPanel.schedule.deleteScheduleException(${exception.id})" title="Eliminar">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    console.log(`Rendered ${exceptions.length} schedule exceptions`);
  }

  /**
   * Saves a schedule exception.
   */
  async saveScheduleException() {
    console.log('Saving schedule exception');

    const formData = {
      type: document.getElementById('exception-type-select')?.value,
      startDate: document.getElementById('schedule-exception-start-date')?.value,
      endDate: document.getElementById('schedule-exception-end-date')?.value,
      isClosed: document.getElementById('exception-is-closed')?.checked || false,
      customOpenTime: document.getElementById('exception-open-time')?.value || null,
      customCloseTime: document.getElementById('exception-close-time')?.value || null,
      customBreakStart: document.getElementById('exception-break-start')?.value || null,
      customBreakEnd: document.getElementById('exception-break-end')?.value || null,
      reason: document.getElementById('exception-reason')?.value,
      description: document.getElementById('schedule-exception-description')?.value || null
    };

    console.log('Form data:', formData);

    // Validation
    if (!formData.type || !formData.startDate || !formData.reason) {
      this.showError('Por favor complete los campos obligatorios (Tipo, Fecha de inicio, Motivo)');
      return;
    }

    if (formData.type === 'date_range' && !formData.endDate) {
      this.showError('Para un rango de fechas debe especificar la fecha de fin');
      return;
    }

    try {
      const response = await fetch('/api/admin/schedule-exceptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('Schedule exception saved:', result);

      this.showSuccess('Excepción de horario guardada exitosamente');

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('addScheduleExceptionModal'));
      if (modal) modal.hide();

      // Reset form
      document.getElementById('add-schedule-exception-form')?.reset();

      // Reload exceptions list
      await this.loadScheduleExceptions();

    } catch (error) {
      console.error('Error saving schedule exception:', error);
      this.showError('Error al guardar la excepción: ' + error.message);
    }
  }

  /**
   * Deletes a schedule exception.
   */
  async deleteScheduleException(id) {
    console.log('Deleting schedule exception:', id);

    if (!confirm('¿Está seguro de eliminar esta excepción de horario?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/schedule-exceptions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      this.showSuccess('Excepción eliminada exitosamente');
      await this.loadScheduleExceptions();

    } catch (error) {
      console.error('Error deleting schedule exception:', error);
      this.showError('Error al eliminar la excepción: ' + error.message);
    }
  }

  /**
   * Helper to format date ranges.
   */
  formatDateRange(start, end) {
    if (!start) return '';
    const startDate = new Date(start).toLocaleDateString('es-ES');
    if (!end || start === end) return startDate;
    const endDate = new Date(end).toLocaleDateString('es-ES');
    return `${startDate} - ${endDate}`;
  }

  /**
   * Loads holiday templates.
   */
  async loadHolidayTemplates() {
    console.log('Loading holiday templates');
    try {
      const response = await fetch('/api/admin/schedule/holiday-templates', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const templates = data.holiday_templates || data.templates || [];
      console.log('Holiday templates loaded:', templates);
      this.renderHolidayTemplates(templates);

    } catch (error) {
      console.error('Error loading holiday templates:', error);
      const container = document.getElementById('holiday-templates-list');
      if (container) {
        container.innerHTML = `
          <div class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>
            No hay plantillas de feriados configuradas
          </div>
        `;
      }
    }
  }

  /**
   * Renders holiday templates.
   */
  renderHolidayTemplates(templates) {
    const container = document.getElementById('holiday-templates-list');
    if (!container) {
      console.warn('Holiday templates list container not found');
      return;
    }

    if (!templates || templates.length === 0) {
      container.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="fas fa-star fa-3x mb-3"></i>
          <p>No hay plantillas de feriados configuradas</p>
        </div>
      `;
      return;
    }

    const monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    container.innerHTML = templates.map(template => {
      const holidayType = template.holidayType || template.holiday_type || 'custom';
      const isActive = template.isActive !== undefined ? template.isActive : template.is_active;
      
      return `
        <div class="card mb-2">
          <div class="card-body py-2">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <strong>${template.name}</strong>
                <span class="badge bg-${isActive ? 'success' : 'secondary'} ms-2">
                  ${isActive ? 'Activo' : 'Inactivo'}
                </span>
                <small class="text-muted ms-2">${template.day} de ${monthNames[template.month]}</small>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    console.log(`Rendered ${templates.length} holiday templates`);
  }

  /**
   * Generates holidays for a specific year.
   */
  async generateYearlyHolidays() {
    const year = document.getElementById('holiday-year-select')?.value;
    
    if (!year) {
      this.showError('Por favor seleccione un año');
      return;
    }

    if (!confirm(`¿Generar feriados para el año ${year}? Esto creará excepciones de horario para todos los feriados activos.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/schedule/generate-holidays/${year}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const result = await response.json();
      this.showSuccess(result.message || `Feriados generados para ${year}`);
      
      // Reload exceptions to show the generated holidays
      await this.loadScheduleExceptions();

    } catch (error) {
      console.error('Error generating holidays:', error);
      this.showError('Error al generar feriados: ' + error.message);
    }
  }

  /**
   * Saves business hours.
   */
  async saveBusinessHours() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const businessHours = days.map(day => {
      const dayLower = day.toLowerCase();
      const isOpen = document.getElementById(`open-${dayLower}`)?.checked || false;
      return {
        dayOfWeek: day,
        isOpen: isOpen,
        openTime: isOpen ? document.getElementById(`start-${dayLower}`)?.value || null : null,
        closeTime: isOpen ? document.getElementById(`end-${dayLower}`)?.value || null : null,
        breakStart: isOpen ? document.getElementById(`break-start-${dayLower}`)?.value || null : null,
        breakEnd: isOpen ? document.getElementById(`break-end-${dayLower}`)?.value || null : null
      };
    });

    const datePicker = document.getElementById('schedule-effective-date');
    const effectiveDate = datePicker ? datePicker.value : null;

    if (!businessHours.some(day => day.isOpen)) {
      this.showError('Debe abrir al menos un día de la semana');
      return;
    }
    if (!effectiveDate) {
      this.showError('Debe seleccionar una fecha de inicio');
      return;
    }

    try {
      this.showLoading();
      const response = await fetch('/api/admin/scheduled-business-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ businessHours, effectiveDate })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al guardar horarios');

      this.showSuccess('Horarios guardados exitosamente');
      await this.loadBusinessHours(effectiveDate);
    } catch (error) {
      console.error('Error saving business hours:', error);
      this.showError('Error al guardar horarios: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Loads business hours.
   */
  async loadBusinessHours(date = null) {
    try {
      this.showLoading();
      const url = date ? `/api/business-hours/${date}` : '/api/business-hours';
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Error loading business hours');

      const data = await response.json();
      const hoursArr = data.businessHours || data.business_hours || [];
      
      if (hoursArr) {
        this.displayBusinessHours(hoursArr);
      } else {
        console.error('Invalid business hours data format:', data);
        this.showError('Formato de datos inválido');
      }
    } catch (error) {
      console.error('Error loading business hours:', error);
      this.showError('Error cargando los horarios');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Displays business hours in the UI.
   */
  displayBusinessHours(businessHours) {
    const container = document.getElementById('business-hours-container');
    if (!container) return;

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    container.innerHTML = days.map((day, index) => {
      const hours = businessHours.find(bh => 
        (bh.dayOfWeek || bh.day_of_week || '').toLowerCase() === day
      ) || {};
      
      const isOpen = hours.isOpen === 1 || hours.isOpen === true || hours.is_open === 1 || hours.is_open === true;
      const openTime = hours.openTime || hours.open_time || '09:00';
      const closeTime = hours.closeTime || hours.close_time || '18:00';

      return `
        <div class="row mb-3 align-items-center ${!isOpen ? 'text-muted' : ''}">
          <div class="col-md-2">
            <strong>${dayNames[index]}</strong>
          </div>
          <div class="col-md-2">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="open-${day}" ${isOpen ? 'checked' : ''}>
              <label class="form-check-label" for="open-${day}">Abierto</label>
            </div>
          </div>
          <div class="col-md-8">
            <div class="row">
              <div class="col-md-3">
                <input type="time" class="form-control form-control-sm" id="start-${day}" value="${openTime}" ${!isOpen ? 'disabled' : ''}>
              </div>
              <div class="col-md-3">
                <input type="time" class="form-control form-control-sm" id="end-${day}" value="${closeTime}" ${!isOpen ? 'disabled' : ''}>
              </div>
              <div class="col-md-3">
                <input type="time" class="form-control form-control-sm" id="break-start-${day}" value="${hours.breakStart || hours.break_start || ''}" ${!isOpen ? 'disabled' : ''}>
              </div>
              <div class="col-md-3">
                <input type="time" class="form-control form-control-sm" id="break-end-${day}" value="${hours.breakEnd || hours.break_end || ''}" ${!isOpen ? 'disabled' : ''}>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.setupBusinessHoursEventListeners();
  }

  /**
   * Sets up business hours toggle listeners.
   */
  setupBusinessHoursEventListeners() {
    const container = document.getElementById('business-hours-container');
    if (!container) return;

    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const day = e.target.id.replace('open-', '');
        const isOpen = e.target.checked;
        
        document.getElementById(`start-${day}`).disabled = !isOpen;
        document.getElementById(`end-${day}`).disabled = !isOpen;
        document.getElementById(`break-start-${day}`).disabled = !isOpen;
        document.getElementById(`break-end-${day}`).disabled = !isOpen;
      });
    });
  }

  /**
   * Initializes the effective date picker.
   */
  initializeEffectiveDatePicker() {
    const datePicker = document.getElementById('schedule-effective-date');
    if (!datePicker) return;

    const today = new Date().toISOString().split('T')[0];
    datePicker.setAttribute('min', today);
    datePicker.value = today;

    datePicker.addEventListener('change', () => this.updateScheduleStatus());
    this.updateScheduleStatus();
  }

  /**
   * Updates schedule status indicator.
   */
  updateScheduleStatus() {
    const datePicker = document.getElementById('schedule-effective-date');
    const statusBadge = document.getElementById('current-schedule-status');
    const statusText = document.getElementById('schedule-status-text');
    
    if (!datePicker || !statusBadge || !statusText) return;

    const selectedDate = new Date(datePicker.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate.getTime() === today.getTime()) {
      statusBadge.className = 'badge bg-warning';
      statusBadge.innerHTML = '<i class="fas fa-clock me-1"></i>Cambios inmediatos';
      statusText.textContent = 'Los cambios se aplicarán inmediatamente al guardar';
    } else if (selectedDate > today) {
      statusBadge.className = 'badge bg-info';
      statusBadge.innerHTML = '<i class="fas fa-calendar-plus me-1"></i>Programado';
      const diffDays = Math.ceil((selectedDate - today) / (1000 * 60 * 60 * 24));
      statusText.textContent = `Los cambios se aplicarán en ${diffDays} día(s)`;
    } else {
      statusBadge.className = 'badge bg-danger';
      statusBadge.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>Fecha inválida';
      statusText.textContent = 'No se puede programar para fechas pasadas';
    }
  }

  /**
   * Initializes main event listeners.
   */
  initScheduleEventListeners() {
    // Other schedule event listeners can go here
    console.log('Base schedule event listeners initialized');
  }
}