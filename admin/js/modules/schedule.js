// admin/js/modules/schedule.js
export class ScheduleModule {
  

  // --- END WEEKLY VIEW AUTO-ADVANCE FEATURE ---
  getAuthToken() {
  return localStorage.getItem('token') || localStorage.getItem('user_token') || '';
  }


  showError(message) {
    alert(message);
  }

  // showSuccess already defined above, remove duplicate

  showLoading() {
    const spinner = document.getElementById('users-loading-spinner');
    if (spinner) spinner.style.display = 'block';
  }

  hideLoading() {
    const spinner = document.getElementById('users-loading-spinner');
    if (spinner) spinner.style.display = 'none';
  }

  showSuccess(message) {
    // Simple implementation using alert, can be replaced with a toast/notification
    alert(message);
  }

  
  constructor() {}

  activateFirstTab(sectionType) {
    // Example implementation: activate the first tab in the schedule section
    const firstTab = document.querySelector(`#${sectionType}-tabs .nav-link`);
    const firstContent = document.querySelector(`#${sectionType}-tab-content .tab-pane`);
    if (firstTab && firstContent) {
      document.querySelectorAll(`#${sectionType}-tabs .nav-link`).forEach(tab => tab.classList.remove('active'));
      document.querySelectorAll(`#${sectionType}-tab-content .tab-pane`).forEach(pane => pane.classList.remove('active', 'show'));
      firstTab.classList.add('active');
      firstContent.classList.add('active', 'show');
    }
  }
  

  async loadScheduleSection() {
    console.log('Loading comprehensive schedule section');

    // Ensure the first tab (business hours) is active
    this.activateFirstTab();

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

    // Add event listener for save-business-hours button
    const saveBtn = document.getElementById('save-business-hours');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveBusinessHours());
    }

    // Initialize tab-specific event listeners
    // this.initScheduleTabListeners();

    console.log('Schedule section loading complete');
  }

  async saveBusinessHours() {
    // Collect business hours data from the form
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const businessHours = days.map(day => {
      const dayLower = day.toLowerCase();
      const isOpen = document.getElementById(`open-${dayLower}`)?.checked || false;
      return {
        day_of_week: day,
        is_open: isOpen ? 1 : 0,
        open_time: isOpen ? document.getElementById(`start-${dayLower}`)?.value || null : null,
        close_time: isOpen ? document.getElementById(`end-${dayLower}`)?.value || null : null,
        break_start: isOpen ? document.getElementById(`break-start-${dayLower}`)?.value || null : null,
        break_end: isOpen ? document.getElementById(`break-end-${dayLower}`)?.value || null : null
      };
    });
    // Get effective date from date picker
    const datePicker = document.getElementById('schedule-effective-date');
    const effective_date = datePicker ? datePicker.value : null;

    // Optional: validate data here
    if (!businessHours.some(day => day.is_open)) {
      this.showError('Debe abrir al menos un día de la semana');
      return;
    }
    if (!effective_date) {
      this.showError('Debe seleccionar una fecha de inicio');
      return;
    }
    try {
      this.showLoading();
      const response = await fetch('/admin/scheduled-business-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ businessHours, effective_date })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al guardar horarios');
      this.showSuccess('Horarios guardados exitosamente');
      await this.loadBusinessHours();
    } catch (error) {
      console.error('Error saving business hours:', error);
      this.showError('Error al guardar horarios: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  
  initializeEffectiveDatePicker() {
    const datePicker = document.getElementById('schedule-effective-date');
    if (!datePicker) return;

    // Set minimum date to today, in yyyy-MM-dd
    const today = new Date();
    const currentDay = today.toISOString().split('T')[0];
    datePicker.setAttribute('min', currentDay);
    
    // Set default value to today (yyyy-MM-dd)
    const defaultDate = currentDay;
    datePicker.value = defaultDate;
    
    // Add event listener for date changes
    datePicker.addEventListener('change', () => {
      this.updateScheduleStatus();
    });
    
    // Update initial status
    this.updateScheduleStatus();
  }

  initializeScheduleSpecificEventListeners() {
    // Generate holidays button for schedule section
    const generateBtnSchedule = document.getElementById('generate-holidays-btn-schedule');
    if (generateBtnSchedule) {
      generateBtnSchedule.addEventListener('click', () => this.generateHolidaysForYear('schedule'));
    }
    
    // Add yearly closure button for schedule section
    const addYearlyClosureBtnSchedule = document.getElementById('add-yearly-closure-btn-schedule');
    if (addYearlyClosureBtnSchedule) {
      addYearlyClosureBtnSchedule.addEventListener('click', () => this.addYearlyClosure('schedule'));
    }
    
    // Closure type change event for schedule section
    const closureTypeSelectSchedule = document.getElementById('closure-type-schedule');
    if (closureTypeSelectSchedule) {
      closureTypeSelectSchedule.addEventListener('change', (e) => {
        const customHoursDiv = document.getElementById('custom-hours-schedule');
        if (customHoursDiv) {
          if (e.target.value === 'custom_hours') {
            customHoursDiv.classList.remove('d-none');
          } else {
            customHoursDiv.classList.add('d-none');
          }
        }
      });
    }
  }


  async loadHolidayTemplates(context = 'main') {
    try {
      const response = await fetch('/admin/schedule/holiday-templates', {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to load holiday templates');

      const data = await response.json();
      this.renderHolidayTemplates(data.holiday_templates, context);
    } catch (error) {
      console.error('Error loading holiday templates:', error);
      this.showError('Error al cargar plantillas de feriados');
    }
  }

  renderHolidayTemplates(templates, context = 'main') {
    const containerId = context === 'schedule' ? 'holiday-templates-list-schedule' : 'holiday-templates-list';
    const container = document.getElementById(containerId);
    if (!container) return;

    if (templates.length === 0) {
      container.innerHTML = '<div class="text-center text-muted py-4">No hay plantillas de feriados configuradas</div>';
      return;
    }

    container.innerHTML = templates.map(template => {
      const monthNames = [
        '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      
      const typeLabels = {
        'national': 'Nacional',
        'religious': 'Religioso', 
        'cultural': 'Cultural',
        'custom': 'Personalizado'
      };

      const closureLabels = {
        'full_day': 'Cerrado todo el día',
        'partial': 'Cerrado parcialmente',
        'custom_hours': 'Horarios personalizados'
      };

      const typeColor = {
        'national': 'danger',
        'religious': 'info',
        'cultural': 'warning',
        'custom': 'secondary'
      }[template.holiday_type] || 'secondary';

      return `
        <div class="card mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <h6 class="card-title d-flex align-items-center">
                  <i class="fas fa-star me-2 text-${typeColor}"></i>
                  ${template.name}
                  <span class="badge bg-${typeColor} ms-2">${typeLabels[template.holiday_type]}</span>
                  ${template.is_active ? '<span class="badge bg-success ms-1">Activo</span>' : '<span class="badge bg-secondary ms-1">Inactivo</span>'}
                </h6>
                <div class="row">
                  <div class="col-md-6">
                    <p class="card-text small mb-1">
                      <i class="fas fa-calendar me-1"></i>
                      <strong>Fecha:</strong> ${template.day} de ${monthNames[template.month]}
                    </p>
                    <p class="card-text small mb-1">
                      <i class="fas fa-clock me-1"></i>
                      <strong>Cierre:</strong> ${closureLabels[template.closure_type]}
                    </p>
                  </div>
                  <div class="col-md-6">
                    ${template.description ? `<p class="card-text small mb-1"><i class="fas fa-info-circle me-1"></i>${template.description}</p>` : ''}
                    <p class="card-text small mb-0">
                      <i class="fas fa-sync me-1"></i>
                      <strong>Recurrente:</strong> ${template.is_recurring ? 'Sí' : 'No'}
                    </p>
                  </div>
                </div>
              </div>
              <div class="btn-group">
                <button class="btn btn-sm btn-outline-primary" onclick="window.adminPanel.editHolidayTemplate(${template.id})" title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="window.adminPanel.deleteHolidayTemplate(${template.id})" title="Eliminar">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  
  async generateYearlyHolidays() {
    const year = document.getElementById('holiday-year-select').value;
    
    if (!year) {
      this.showError('Por favor seleccione un año');
      return;
    }

    if (!confirm(`¿Generar feriados para el año ${year}? Esto creará excepciones de horario para todos los feriados activos.`)) {
      return;
    }

    try {
      this.showLoading();

      const response = await fetch(`/api/admin/schedule/generate-holidays/${year}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al generar feriados');
      }

      this.activateFirstTab();
      this.showSuccess(result.message);
      
      // Reload manual exceptions to show the generated holidays
      await this.loadScheduleExceptions();

    } catch (error) {
      console.error('Error generating yearly holidays:', error);
      this.showError('Error al generar feriados: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  activateFirstTab() {
    const firstTab = document.querySelector('.nav-tabs .nav-item:first-child .nav-link');
    if (firstTab) {
      firstTab.click();
    }
  }

  setupHolidayTemplateListeners() {
    // Save holiday template button
    const saveBtn = document.getElementById('save-holiday-template');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveHolidayTemplate());
    }

    // Generate holidays button
    const generateBtn = document.getElementById('generate-holidays-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.generateYearlyHolidays());
    }

    // Closure type change handler
    const closureTypeSelect = document.getElementById('closure-type');
    if (closureTypeSelect) {
      closureTypeSelect.addEventListener('change', (e) => {
        const customHoursSection = document.getElementById('custom-hours-section');
        if (e.target.value === 'custom_hours') {
          customHoursSection.classList.remove('d-none');
        } else {
          customHoursSection.classList.add('d-none');
        }
      });
    }

    // Modal reset on close
    const modal = document.getElementById('addHolidayTemplateModal');
    if (modal) {
      modal.addEventListener('hidden.bs.modal', () => {
        this.resetHolidayTemplateForm();
      });
    }
  }

  initScheduleEventListeners() {
    // Schedule Exceptions
    document.getElementById('save-schedule-exception')?.addEventListener('click', () => this.saveScheduleException());
    
    // Exception type change handler
    document.getElementById('exception-type-select')?.addEventListener('change', (e) => {
      const endDateContainer = document.getElementById('end-date-container');
      if (e.target.value === 'date_range') {
        endDateContainer.style.display = 'block';
      } else {
        endDateContainer.style.display = 'none';
      }
    });

    // Holiday Templates
    document.getElementById('save-holiday-template')?.addEventListener('click', () => this.saveHolidayTemplate());
    
    // Closed toggle handler
    document.getElementById('exception-is-closed')?.addEventListener('change', (e) => {
      const customHoursSection = document.getElementById('custom-hours-section');
      if (e.target.checked) {
        customHoursSection.style.display = 'none';
      } else {
        customHoursSection.style.display = 'block';
      }
    });
    
    // Announcements
    document.getElementById('save-announcement')?.addEventListener('click', () => this.saveAnnouncement());
  }

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
      statusText.textContent = `Los cambios se aplicarán en ${diffDays} día(s) - ${selectedDate.toLocaleDateString('es-ES')}`;
    } else {
      statusBadge.className = 'badge bg-danger';
      statusBadge.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>Fecha inválida';
      statusText.textContent = 'No se puede programar para fechas pasadas';
    }
  }

  initScheduleTabListeners() {
    // Only initialize once to prevent duplicate listeners
    if (this.initScheduleEventListeners) {
      console.log('Schedule tab listeners already initialized');
      return;
    }
    
    this.initScheduleEventListeners = true;
    
    // Business Hours Tab
    const businessHoursTab = document.getElementById('business-hours-tab');
    if (businessHoursTab) {
      businessHoursTab.addEventListener('shown.bs.tab', async () => {
        console.log('Business hours tab activated');
        await this.loadBusinessHours();
      });
    }
    
    // Schedule Exceptions Tab
    const scheduleExceptionsTab = document.getElementById('schedule-exceptions-tab');
    if (scheduleExceptionsTab) {
      scheduleExceptionsTab.addEventListener('shown.bs.tab', async () => {
        console.log('Schedule exceptions tab activated');
        
        // Hide placeholder and show content
        const placeholder = document.getElementById('schedule-exceptions-placeholder');
        const content = document.getElementById('schedule-exceptions-content');
        
        if (placeholder) placeholder.classList.add('d-none');
        if (content) content.classList.remove('d-none');
        
        // Load both holiday templates and manual exceptions
        await Promise.all([
          this.loadHolidayTemplates(),
          this.loadScheduleExceptions()
        ]);
        
        // Set up holiday template event listeners
        this.setupHolidayTemplateListeners();
      });
      
      scheduleExceptionsTab.addEventListener('hidden.bs.tab', () => {
        console.log('Schedule exceptions tab deactivated');
        
        // Show placeholder and hide content
        const placeholder = document.getElementById('schedule-exceptions-placeholder');
        const content = document.getElementById('schedule-exceptions-content');
        
        if (placeholder) placeholder.classList.remove('d-none');
        if (content) content.classList.add('d-none');
      });
    }

    // Annual Holidays Tab
    const annualHolidaysTab = document.getElementById('annual-holidays-tab');
    if (annualHolidaysTab) {
      annualHolidaysTab.addEventListener('shown.bs.tab', async () => {
        console.log('Annual holidays tab activated');
        
        // Load holiday templates initially
        await this.loadHolidayTemplates();
        
        // Initialize subtab listeners for annual holidays
        this.initializeAnnualHolidaysSubtabListeners();
      });
    }

    // Announcements Tab
    const announcementsTab = document.getElementById('announcements-tab');
    if (announcementsTab) {
      announcementsTab.addEventListener('shown.bs.tab', async () => {
        console.log('Announcements tab activated');
        
        // Hide placeholder and show content
        const placeholder = document.getElementById('announcements-placeholder');
        const content = document.getElementById('announcements-content');
        
        if (placeholder) placeholder.classList.add('d-none');
        if (content) content.classList.remove('d-none');
        
        // Load data
        await this.loadAnnouncements();
      });
      
      announcementsTab.addEventListener('hidden.bs.tab', () => {
        console.log('Announcements tab deactivated');
        
        // Show placeholder and hide content
        const placeholder = document.getElementById('announcements-placeholder');
        const content = document.getElementById('announcements-content');
        
        if (placeholder) placeholder.classList.remove('d-none');
        if (content) content.classList.add('d-none');
      });
    }
    
    this.initializedTabListeners.schedule = true;
    console.log('Schedule tab listeners initialized');
  }

  initializeAnnualHolidaysSubtabListeners() {
    // Holiday Templates Subtab
    const holidayTemplatesSubtab = document.getElementById('holiday-templates-subtab');
    if (holidayTemplatesSubtab) {
      holidayTemplatesSubtab.addEventListener('shown.bs.tab', async () => {
        console.log('Holiday templates subtab activated');
        await this.loadHolidayTemplates();
      });
    }
    
    // Yearly Closures Subtab
    const yearlyClosuresSubtab = document.getElementById('yearly-closures-subtab');
    if (yearlyClosuresSubtab) {
      yearlyClosuresSubtab.addEventListener('shown.bs.tab', async () => {
        console.log('Yearly closures subtab activated');
        await this.loadYearlyClosures();
      });
    }
    
    // Set up event listeners for the new schedule-specific elements
    this.initializeScheduleSpecificEventListeners();
  }

  displayBusinessHours(businessHours) {
    const container = document.getElementById('business-hours-container');
    if (!container) {
      console.error('Business hours container not found');
      return;
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // Get the current week's dates
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = currentDay === 0 ? 6 : currentDay - 1; // Calculate offset to get to Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);

    console.log('Displaying business hours for days:', days);
    console.log('Business hours data:', businessHours);

    container.innerHTML = days.map((day, index) => {
      const hours = businessHours.find(bh => bh.day_of_week === day) || {};
      console.log(`Day ${day}:`, hours);
      
      // Calculate the date for this day
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + index);
      const formattedDate = `${String(dayDate.getMonth() + 1).padStart(2, '0')}/${String(dayDate.getDate()).padStart(2, '0')}`;
      
      // Set correct default times based on your requirements
      let defaultOpenTime, defaultCloseTime, defaultBreakStart, defaultBreakEnd;
      
      if (index >= 0 && index <= 4) { // Monday to Friday (weekdays)
        defaultOpenTime = '14:00'; // 2:00 PM
        defaultCloseTime = '17:30'; // 5:30 PM
        defaultBreakStart = '14:00'; // 2:00 PM
        defaultBreakEnd = '15:00'; // 3:00 PM
      } else if (index === 5) { // Saturday
        defaultOpenTime = '12:00'; // 12:00 PM
        defaultCloseTime = '16:30'; // 4:30 PM
        defaultBreakStart = '';
        defaultBreakEnd = '';
      } else { // Sunday
        defaultOpenTime = '12:00';
        defaultCloseTime = '16:30';
        defaultBreakStart = '';
        defaultBreakEnd = '';
      }
      
      const isOpen = hours.is_open === 1 || hours.is_open === true;
      
      return `
        <div class="business-hours-day ${!isOpen ? 'closed' : ''}" data-day="${day}">
          <div class="row align-items-center">
            <div class="col-lg-3 col-md-4">
              <div class="day-header text-center">
                <h6 class="mb-1 text-primary">${dayNames[index]}</h6>
                <small class="text-muted d-block mb-3">${formattedDate}</small>
                <div class="form-check form-switch d-flex justify-content-center align-items-center">
                  <input class="form-check-input business-hours-toggle me-2" type="checkbox" 
                         id="open-${day}" ${isOpen ? 'checked' : ''}
                         data-day="${day}"
                         data-default-open="${defaultOpenTime}" 
                         data-default-close="${defaultCloseTime}"
                         data-default-break-start="${defaultBreakStart}"
                         data-default-break-end="${defaultBreakEnd}">
                  <label class="form-check-label fw-semibold" for="open-${day}">
                    ${isOpen ? 'Abierto' : 'Cerrado'}
                  </label>
                </div>
              </div>
            </div>
            <div class="col-lg-9 col-md-8">
              <div class="time-inputs-row">
                <div class="row g-3">
                  <div class="col-md-3">
                    <label class="form-label small text-muted">Hora de Apertura:</label>
                    <input type="time" class="form-control" 
                           id="start-${day}" value="${hours.open_time || defaultOpenTime}"
                           ${!isOpen ? 'disabled' : ''}>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label small text-muted">Hora de Cierre:</label>
                    <input type="time" class="form-control" 
                           id="end-${day}" value="${hours.close_time || defaultCloseTime}"
                           ${!isOpen ? 'disabled' : ''}>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label small text-muted">Inicio Descanso:</label>
                    <input type="time" class="form-control" 
                           id="break-start-${day}" value="${hours.break_start || defaultBreakStart || ''}"
                           ${!isOpen ? 'disabled' : ''}>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label small text-muted">Fin Descanso:</label>
                    <input type="time" class="form-control" 
                           id="break-end-${day}" value="${hours.break_end || defaultBreakEnd || ''}"
                           ${!isOpen ? 'disabled' : ''}>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Setup event delegation for business hours toggles
    this.setupBusinessHoursEventListeners();
    console.log('Business hours displayed and event listeners setup');
    
    // Additional direct listeners as backup (for debugging)
    setTimeout(() => {
      const toggles = document.querySelectorAll('.business-hours-toggle');
      console.log(`Found ${toggles.length} business hours toggles`);
      toggles.forEach((toggle, index) => {
        console.log(`Toggle ${index}: ${toggle.id}, checked: ${toggle.checked}`);
        
        // Add direct listener as backup
        toggle.addEventListener('change', (e) => {
          console.log(`Direct listener triggered for ${e.target.id}: ${e.target.checked}`);
          const day = e.target.getAttribute('data-day');
          if (day) {
            this.updateBusinessHoursUI(day, e.target.checked, e.target);
          }
        });
      });
    }, 100);
  }

  setupBusinessHoursEventListeners() {
    const container = document.getElementById('business-hours-container');
    if (!container) {
      console.error('Business hours container not found for event listeners');
      return;
    }
    
    // Remove any existing event listeners to avoid duplicates
    if (container._businessHoursChangeListener) {
      container.removeEventListener('change', container._businessHoursChangeListener);
    }
    if (container._businessHoursClickListener) {
      container.removeEventListener('click', container._businessHoursClickListener);
    }

    // Create change listener for toggle switches
    const changeListener = (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('business-hours-toggle')) {
        const checkbox = e.target;
        const day = checkbox.getAttribute('data-day');
        const isOpen = checkbox.checked;
        
        console.log(`Switch toggled for ${day}: ${isOpen ? 'OPEN' : 'CLOSED'}`);
        this.updateBusinessHoursUI(day, isOpen, checkbox);
      }
    };

    // Create click listener for better switch responsiveness
    const clickListener = (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('business-hours-toggle')) {
        console.log('Business hours switch clicked:', e.target.getAttribute('data-day'));
        // Allow default checkbox behavior, change event will handle the rest
      }
    };

    // Add the new event listeners
    container.addEventListener('change', changeListener, true);
    container.addEventListener('click', clickListener, true);
    
    // Store references for cleanup
    container._businessHoursChangeListener = changeListener;
    container._businessHoursClickListener = clickListener;
    
    console.log('Business hours event listeners setup complete');
  }

  updateBusinessHoursUI(day, isOpen, checkbox) {
    // Get related elements
    const startTime = document.getElementById(`start-${day}`);
    const endTime = document.getElementById(`end-${day}`);
    const breakStart = document.getElementById(`break-start-${day}`);
    const breakEnd = document.getElementById(`break-end-${day}`);
    const dayDiv = document.querySelector(`[data-day="${day}"]`);
    const label = document.querySelector(`label[for="open-${day}"]`);
    
    if (!startTime || !endTime || !breakStart || !breakEnd || !dayDiv || !label) {
      console.error(`Missing elements for day ${day}`);
      return;
    }
    
    // Update UI elements
    startTime.disabled = !isOpen;
    endTime.disabled = !isOpen;
    breakStart.disabled = !isOpen;
    breakEnd.disabled = !isOpen;
    dayDiv.classList.toggle('closed', !isOpen);
    
    // Update label text
    label.textContent = isOpen ? 'Abierto' : 'Cerrado';
    
    // Handle time values
    if (isOpen) {
      // Set default times when turning on the switch
      const defaultOpenTime = checkbox.getAttribute('data-default-open');
      const defaultCloseTime = checkbox.getAttribute('data-default-close');
      const defaultBreakStart = checkbox.getAttribute('data-default-break-start');
      const defaultBreakEnd = checkbox.getAttribute('data-default-break-end');
      
      if (!startTime.value || !endTime.value) {
        startTime.value = defaultOpenTime || '';
        endTime.value = defaultCloseTime || '';
        breakStart.value = defaultBreakStart || '';
        breakEnd.value = defaultBreakEnd || '';
      }
    } else {
      // Clear times when closing
      startTime.value = '';
      endTime.value = '';
      breakStart.value = '';
      breakEnd.value = '';
    }
    
    console.log(`Business hours UI updated for ${day}: ${isOpen ? 'OPEN' : 'CLOSED'}`);
  }

  setupNotificationToggles() {
    // Email notifications toggle
    const emailToggle = document.getElementById('email_notifications');
    const emailOptions = document.getElementById('email-options');
    
    if (emailToggle && emailOptions) {
      emailToggle.addEventListener('change', () => {
        emailOptions.style.display = emailToggle.checked ? 'block' : 'none';
        if (!emailToggle.checked) {
          // Uncheck all email sub-options when main toggle is off
          document.getElementById('email_appointment_confirmation').checked = false;
          document.getElementById('email_appointment_reminder').checked = false;
          document.getElementById('email_appointment_changes').checked = false;
        }
      });
    }
    
    // SMS notifications toggle
    const smsToggle = document.getElementById('sms_notifications');
    const smsOptions = document.getElementById('sms-options');
    
    if (smsToggle && smsOptions) {
      smsToggle.addEventListener('change', () => {
        smsOptions.style.display = smsToggle.checked ? 'block' : 'none';
        if (!smsToggle.checked) {
          // Uncheck all SMS sub-options when main toggle is off
          document.getElementById('sms_appointment_confirmation').checked = false;
          document.getElementById('sms_appointment_reminder').checked = false;
          document.getElementById('sms_appointment_changes').checked = false;
        }
      });
    }
  }

  async loadBusinessHours() {
    try {
      this.showLoading();
      console.log('Loading business hours...');
      
      const response = await fetch('/api/admin/business-hours', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Error loading business hours');
      
      const data = await response.json();
      console.log('Business hours data loaded:', data);
      
      // Ensure we have the businessHours array
      if (data && data.businessHours) {
        this.displayBusinessHours(data.businessHours);
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


  
  async saveScheduleException() {
    console.log('saveScheduleException called');
    
    const formData = {
      exception_type: document.getElementById('exception-type-select').value,
      start_date: document.getElementById('schedule-exception-start-date').value,
      end_date: document.getElementById('schedule-exception-end-date').value,
      is_closed: document.getElementById('exception-is-closed').checked,
      custom_open_time: document.getElementById('exception-open-time').value,
      custom_close_time: document.getElementById('exception-close-time').value,
      custom_break_start: document.getElementById('exception-break-start').value,
      custom_break_end: document.getElementById('exception-break-end').value,
      reason: document.getElementById('exception-reason').value,
      description: document.getElementById('schedule-exception-description').value,
      recurring_type: document.getElementById('exception-recurring') ? 
        (document.getElementById('exception-recurring').checked ? 'yearly' : null) : null
    };

    console.log('Form data collected:', formData);
    console.log('Auth token:', localStorage.getItem('token'));

    if (!formData.exception_type || !formData.start_date || !formData.reason) {
      console.log('Validation failed - missing required fields');
      this.showError('Faltan campos obligatorios');
      return;
    }

    if (formData.exception_type === 'date_range' && !formData.end_date) {
      console.log('Validation failed - date range missing end date');
      this.showError('Para un rango de fechas debe especificar la fecha de fin');
      return;
    }

    try {
      console.log('Sending request to /api/admin/schedule-exceptions');
      const response = await fetch('/api/admin/schedule-exceptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (!response.ok) throw new Error(`Failed to save schedule exception: ${responseText}`);

      this.showSuccess('Excepción de horario guardada exitosamente');
      
      // Close modal and refresh list
      const modal = bootstrap.Modal.getInstance(document.getElementById('addScheduleExceptionModal'));
      modal.hide();
      document.getElementById('add-schedule-exception-form').reset();
      
      await this.loadScheduleExceptions();
    } catch (error) {
      console.error('Error saving schedule exception:', error);
      this.showError('Error al guardar excepción de horario: ' + error.message);
    }
  }

  async deleteScheduleException(id) {
    console.log('Delete schedule exception called with ID:', id);
    
    if (!confirm('¿Está seguro de eliminar esta excepción de horario?')) return;

    try {

      const response = await fetch(`/api/admin/schedule-exceptions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      console.log('Delete response status:', response.status);
      const responseText = await response.text();
      console.log('Delete response text:', responseText);

      if (!response.ok) throw new Error(`Failed to delete schedule exception: ${responseText}`);

      this.showSuccess('Excepción eliminada exitosamente');
      await this.loadScheduleExceptions();
    } catch (error) {
      console.error('Error deleting schedule exception:', error);
      this.showError('Error al eliminar excepción: ' + error.message);
    }
  }

  renderScheduleExceptions(exceptions) {
    const container = document.getElementById('schedule-exceptions-list');
    if (!container) return;

    if (exceptions.length === 0) {
      container.innerHTML = '<div class="text-center text-muted py-4">No hay excepciones de horario programadas</div>';
      return;
    }
    container.innerHTML = exceptions.map(exception => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h6 class="card-title d-flex align-items-center">
                <i class="fas fa-calendar-times me-2 text-warning"></i>
                ${exception.reason}
                <span class="badge bg-${exception.is_closed ? 'danger' : 'info'} ms-2">
                  ${exception.is_closed ? 'Cerrado' : 'Horario especial'}
                </span>
                ${exception.recurring_type === 'yearly' ? '<span class="badge bg-warning ms-2">Anual</span>' : ''}
              </h6>
              <p class="card-text text-muted mb-2">${exception.description || 'Sin descripción adicional'}</p>
              <div class="d-flex gap-3 text-sm">
                <span><i class="fas fa-calendar"></i> ${this.formatDateRange(exception.start_date, exception.end_date)}</span>
                ${!exception.is_closed && exception.custom_open_time ? `
                  <span><i class="fas fa-clock"></i> ${exception.custom_open_time} - ${exception.custom_close_time}</span>
                ` : ''}
                <span class="badge bg-secondary">${exception.exception_type === 'single_day' ? 'Día específico' : 'Rango de fechas'}</span>
              </div>
            </div>
            <div class="btn-group">
              <button class="btn btn-outline-primary btn-sm" onclick="adminPanel.editScheduleException(${exception.id})">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-outline-danger btn-sm" onclick="adminPanel.deleteScheduleException(${exception.id})">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  
  async saveHolidayTemplate() {
    try {
      const templateId = document.getElementById('holiday-template-id').value;
      const isEdit = templateId && templateId !== '';

      const data = {
        name: document.getElementById('holiday-name').value.trim(),
        description: document.getElementById('holiday-description').value.trim(),
        month: parseInt(document.getElementById('holiday-month').value),
        day: parseInt(document.getElementById('holiday-day').value),
        holiday_type: document.getElementById('holiday-type').value,
        closure_type: document.getElementById('closure-type').value,
        is_recurring: document.getElementById('is-recurring').checked ? 1 : 0,
        is_active: document.getElementById('is-active').checked ? 1 : 0,
        custom_open_time: document.getElementById('custom-open-time').value || null,
        custom_close_time: document.getElementById('custom-close-time').value || null
      };

      // Validation
      if (!data.name || !data.month || !data.day) {
        this.showError('Nombre, mes y día son campos requeridos');
        return;
      }

      if (data.month < 1 || data.month > 12) {
        this.showError('El mes debe estar entre 1 y 12');
        return;
      }

      if (data.day < 1 || data.day > 31) {
        this.showError('El día debe estar entre 1 y 31');
        return;
      }

      const url = isEdit 
        ? `/api/admin/schedule/holiday-templates/${templateId}`
        : '/api/admin/schedule/holiday-templates';
      
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al guardar plantilla');
      }

      this.showSuccess(result.message);
      
      // Close modal and reload list
      const modal = bootstrap.Modal.getInstance(document.getElementById('addHolidayTemplateModal'));
      modal.hide();
      
      await this.loadHolidayTemplates();

    } catch (error) {
      console.error('Error saving holiday template:', error);
      this.showError('Error al guardar plantilla: ' + error.message);
    }
  }

  async editHolidayTemplate(id) {
    try {
      // Get template data from the rendered list (or fetch from API if needed)
      const response = await fetch('/api/admin/schedule/holiday-templates', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Failed to load template data');

      const data = await response.json();
      const template = data.holiday_templates.find(t => t.id === id);

      if (!template) {
        this.showError('Plantilla no encontrada');
        return;
      }

      // Populate form
      document.getElementById('holiday-template-id').value = template.id;
      document.getElementById('holiday-name').value = template.name;
      document.getElementById('holiday-description').value = template.description || '';
      document.getElementById('holiday-month').value = template.month;
      document.getElementById('holiday-day').value = template.day;
      document.getElementById('holiday-type').value = template.holiday_type;
      document.getElementById('closure-type').value = template.closure_type;
      document.getElementById('is-recurring').checked = template.is_recurring;
      document.getElementById('is-active').checked = template.is_active;
      document.getElementById('custom-open-time').value = template.custom_open_time || '';
      document.getElementById('custom-close-time').value = template.custom_close_time || '';

      // Show/hide custom hours section
      const customHoursSection = document.getElementById('custom-hours-section');
      if (template.closure_type === 'custom_hours') {
        customHoursSection.classList.remove('d-none');
      } else {
        customHoursSection.classList.add('d-none');
      }

      // Update modal title
      document.getElementById('addHolidayTemplateModalLabel').innerHTML = 
        '<i class="fas fa-edit me-2"></i>Editar Plantilla de Feriado';

      // Show modal
      const modal = new bootstrap.Modal(document.getElementById('addHolidayTemplateModal'));
      modal.show();

    } catch (error) {
      console.error('Error loading template for edit:', error);
      this.showError('Error al cargar plantilla para edición');
    }
  }

  async deleteHolidayTemplate(id) {
    if (!confirm('¿Está seguro de que desea eliminar esta plantilla de feriado?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/schedule/holiday-templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al eliminar plantilla');
      }

      this.showSuccess(result.message);
      await this.loadHolidayTemplates();

    } catch (error) {
      console.error('Error deleting holiday template:', error);
      this.showError('Error al eliminar plantilla: ' + error.message);
    }
  }


  async generateHolidaysForYear(context = 'main') {
    const yearSelectId = context === 'schedule' ? 'holiday-year-select-schedule' : 'holiday-year-select-main';
    const year = document.getElementById(yearSelectId)?.value;
    if (!year) {
      this.showNotification('Por favor selecciona un año', 'error');
      return;
    }
    
    try {
      const response = await fetch('/api/admin/schedule/holiday-templates/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ year: parseInt(year) })
      });
      
      if (response.ok) {
        const result = await response.json();
        this.showNotification(`Se generaron ${result.count} feriados para el año ${year}`, 'success');
      } else {
        throw new Error('Error al generar feriados');
      }
    } catch (error) {
      console.error('Error generating holidays:', error);
      this.showNotification('Error al generar feriados', 'error');
    }
  }

  async loadScheduleExceptions() {
    // Load schedule exceptions for the manual exceptions tab
    try {
      const response = await fetch('/api/admin/schedule/exceptions', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (response.ok) {
        const exceptions = await response.json();
        this.displayScheduleExceptionsList(exceptions, 'schedule-exceptions-list-main');
      } else {
        throw new Error('Error loading schedule exceptions');
      }
    } catch (error) {
      console.error('Error loading schedule exceptions:', error);
      const container = document.getElementById('schedule-exceptions-list-main');
      if (container) {
        container.innerHTML = `
          <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Error al cargar las excepciones: ${error.message}
          </div>
        `;
      }
    }
  }


  resetHolidayTemplateForm() {
    document.getElementById('holidayTemplateForm').reset();
    document.getElementById('holiday-template-id').value = '';
    document.getElementById('custom-hours-section').classList.add('d-none');
    document.getElementById('addHolidayTemplateModalLabel').innerHTML = 
      '<i class="fas fa-star me-2"></i>Nueva Plantilla de Feriado';
  }
}