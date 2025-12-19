/**
 * adminPanel.js
 *
 * Main entry point for the Quirofísicos Rocha admin dashboard UI.
 * - Initializes and manages all admin modules (dashboard, appointments, users, schedule, settings, etc.).
 * - Handles tab navigation, event listeners, notifications, and section switching.
 * - Provides utilities for business hours, closures, password management, and user verification.
 * - Centralizes admin-side logic for maintainability and modularity.
 */

import { DashboardModule } from './modules/dashboard.js';
import { AppointmentsModule } from './modules/appointments.js';
import { UsersModule } from './modules/users.js';
import { ScheduleModule } from './modules/schedule.js';
import { SettingsModule } from './modules/settings.js';
import { UserVerificationModule } from './modules/userVerification.js';
import { ServerStatusModule } from './modules/serverStatus.js';

/**
 * Displays a notification message in the admin UI.
 * @param {string} message - The message to display.
 * @param {string} [type='info'] - The type of notification ('info', 'success', 'error').
 * @param {number} [timeout=3500] - How long to show the notification (ms).
 */
function showNotification(message, type = 'info', timeout = 3500) {
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
  const alertType = type === 'success' ? 'alert-success' : type === 'error' ? 'alert-danger' : 'alert-info';
  const notification = document.createElement('div');
  notification.className = `alert ${alertType} fade show`; 
  notification.innerHTML = `<i class="fas fa-info-circle me-2"></i>${message}`;
  container.appendChild(notification);
  setTimeout(() => {
    notification.classList.remove('show');
    notification.classList.add('hide');
    setTimeout(() => notification.remove(), 500);
  }, timeout);
}

/**
 * Restores visibility to all admin sections (for error recovery).
 */
function refreshAllAdminSections() {
  const sections = document.querySelectorAll('.admin-section');
  sections.forEach(sec => sec.classList.remove('d-none'));
  showNotification('Secciones recargadas', 'info');
}

/**
 * Main class for managing the admin panel UI and logic.
 */
class AdminPanel {
  /**
   * Initializes event listeners for the SMS tab (notification settings).
   */
  initializeSMSTabListeners() {
    // Only initialize once to prevent duplicate listeners
    if (this.initializedTabListeners && this.initializedTabListeners.sms) {
      console.log('SMS tab listeners already initialized');
      return;
    }
    this.initializedTabListeners = this.initializedTabListeners || {};
    // Add event listener for Send Reminders tab
    const sendRemindersTab = document.getElementById('send-reminders-tab');
    if (sendRemindersTab) {
      sendRemindersTab.addEventListener('shown.bs.tab', () => {
        // Render notification settings when the tab is shown
        if (window.adminPanel && window.adminPanel.userVerification && typeof window.adminPanel.userVerification.renderNotificationSettings === 'function') {
          window.adminPanel.userVerification.renderNotificationSettings();
        }
      });
    }
    this.initializedTabListeners.sms = true;
    console.log('SMS tab listeners initialized');
  }
  /**
   * Constructs the AdminPanel and initializes modules, event listeners, and UI state.
   */
  constructor() {
    this.dashboard = new DashboardModule();
    this.appointments = new AppointmentsModule();
    this.users = new UsersModule();
  this.schedule = new ScheduleModule();
    this.settings = new SettingsModule();
    this.userVerification = new UserVerificationModule();
    this.serverStatus = new ServerStatusModule();
    window.usersModule = this.users;
    this.isMobile = window.innerWidth < 780;
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth < 780;
      document.body.classList.toggle('mobile-admin', this.isMobile);
    });
    document.body.classList.toggle('mobile-admin', this.isMobile);
    this.initEventListeners();
    this.verifyAdminAccess(); // Add this line to verify role on load
    // Sidebar hamburger toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebarToggle && sidebar && !sidebarToggle.hasAttribute('data-listener-added')) {
      sidebarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('show');
      });
      sidebarToggle.setAttribute('data-listener-added', 'true');
      // Hide sidebar when clicking outside (mobile only)
      document.addEventListener('click', (e) => {
        if (window.innerWidth < 992 && sidebar.classList.contains('show')) {
          if (!sidebar.contains(e.target) && e.target !== sidebarToggle) {
            sidebar.classList.remove('show');
          }
        }
      });
    }

      // Automatically log scheduled business hours when admin panel loads
      document.addEventListener('DOMContentLoaded', () => {
        this.schedule.loadBusinessHours();
      });

      // Log business hours button event
      document.addEventListener('DOMContentLoaded', () => {
        const logBtn = document.getElementById('log-business-hours-btn');
        if (logBtn) {
          logBtn.addEventListener('click', () => {
            this.schedule.loadBusinessHours();
          });
        }
      });
  }

  /**
   * Verifies the user's role by fetching their profile from the server.
   * This ensures that role changes (like promotion to admin) are reflected
   * without requiring a manual logout/login.
   */
  async verifyAdminAccess() {
    const token = localStorage.getItem('user_token') || localStorage.getItem('token');
    if (!token) return; // The inline script in adminOptions.html will handle this.

    try {
      const response = await fetch('/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Session invalid or expired.');
      }

      const user = await response.json();
      if (user.role !== 'admin') {
        alert('Acceso denegado. Tu rol ha cambiado y ya no tienes permisos de administrador.');
        window.location.href = '/login.html';
      } else {
        // Role is confirmed, update localStorage just in case it was stale.
        localStorage.setItem('user_role', user.role);
      }
    } catch (error) {
      console.error('Admin access verification failed:', error);
      window.location.href = '/login.html';
    }
  }
  /**
   * Loads unverified users for verification tab.
   */
  async loadUserVerification() {
    console.log('Loading user verification data');
    // Load unverified users if this function exists globally
    if (window.loadUnverifiedUsers) {
      await window.loadUnverifiedUsers();
    } else {
      console.warn('loadUnverifiedUsers function not found globally');
    }
  }

  /**
   * Sends appointment reminders to users.
   */
  async sendAppointmentReminders() {
    console.log('Sending appointment reminders');
    if (window.sendAppointmentReminders) {
      await window.sendAppointmentReminders();
    } else {
      console.warn('sendAppointmentReminders function not found globally');
    }
  }

  /**
   * Loads annual closure days from the backend and displays them.
   */
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
  /**
   * Adds a new annual closure day (full day, recurring or not).
   */
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

  /**
   * Loads yearly closures (placeholder for future backend support).
   */
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

  /**
   * Adds a new yearly closure (supports custom hours).
   */
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
  /**
   * Saves scheduled business hours to the backend.
   */
  async saveScheduledBusinessHours() {
    try {
      // this.showLoading();
      
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
  /**
   * Changes the admin password after validating input fields.
   */
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
  /**
   * Validates the business hours schedule data for correctness.
   */
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
  /**
   * Shows the password change modal dialog.
   */
  showPasswordChangeModal() {
    const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    document.getElementById('admin-password-form').reset();
    modal.show();
  }

  /**
   * Generates HTML preview for the scheduled business hours.
   */
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

  /**
   * Initializes event listeners for settings forms and date pickers.
   */
  initializeSettingsEventListeners() {
    // Set default dates for forms
    const today = new Date().toISOString().split('T')[0];
    const closureDateInput = document.getElementById('closure-date-settings');
    
    if (closureDateInput) {
      closureDateInput.min = today;
    }
  }

  /**
   * Initializes event listeners for yearly closures UI.
   */
  initializeYearlyClosuresEventListeners() {
    // Add yearly closure button
    const addYearlyClosureBtn = document.getElementById('add-yearly-closure-btn');
    if (addYearlyClosureBtn) {
      addYearlyClosureBtn.addEventListener('click', () => this.addYearlyClosure());
    }
  }
  
  /**
   * Displays the list of annual closures in the UI.
   */
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

  /**
   * Activates the first tab in a given admin section.
   */
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

  /**
   * Initializes event listeners for the settings tab.
   */
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

  /**
   * Initializes event listeners for annual exceptions in settings.
   */
  initializeAnnualExceptionsSettingsEventListeners() {
    // Add yearly closure button
    const addAnnualClosureBtn = document.getElementById('add-annual-closure-btn-settings');
    if (addAnnualClosureBtn) {
      addAnnualClosureBtn.addEventListener('click', () => this.addAnnualClosure('settings'));
    }
  }

  /**
   * Initializes all main event listeners for navigation and UI actions.
   */
  initEventListeners() {
    // Navigation/tab switching logic here
    const tabLinks = document.querySelectorAll('.nav-link[data-section]');
    tabLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.getAttribute('data-section');
        this.showSection(section);
          // Hide sidebar on mobile after tab click
          const sidebar = document.getElementById('admin-sidebar');
          if (window.innerWidth < 992 && sidebar && sidebar.classList.contains('show')) {
            sidebar.classList.remove('show');
          }
      });
    });

  // Initialize SMS tab listeners for notification settings
  this.initializeSMSTabListeners();


    // Dashboard card navigation
    document.querySelectorAll('.dashboard-card[data-navigate]').forEach(card => {
      card.addEventListener('click', () => {
        const section = card.getAttribute('data-navigate');
        if (section) {
          this.showSection(section);
        }
      });
    });

    // Wire up 'Ver todas' button to navigate to users tab
    document.querySelectorAll('[data-navigate="users"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSection('users');
      });
    });

    // Show dashboard by default
    this.showSection('dashboard');

    // Fallback logging for missing DOM elements
    [
      'page-title', 'admin-sidebar', 'citas-pendientes-card', 'dashboard-header',
      'save-user-btn', 'logout-btn', 'admin-name'
    ].forEach(id => {
      if (!document.getElementById(id)) {
        console.warn(`[AdminPanel] Missing DOM element: #${id}`);
      }
    });
  }

  /**
   * Shows the specified admin section and updates UI state.
   */
  showSection(section) {
    // Force hide page title unless dashboard is selected
    const pageTitle = document.getElementById('page-title');
    if (!pageTitle) {
      console.warn('[AdminPanel] Missing #page-title element');
    } else {
      pageTitle.classList.add('d-none');
      if (section === 'dashboard') {
        pageTitle.classList.remove('d-none');
      }
    }
    // Hide all sections
    const allSections = document.querySelectorAll('.admin-section');
    if (allSections.length === 0) {
      console.warn('[AdminPanel] No .admin-section elements found');
    }
    allSections.forEach(sec => sec.classList.add('d-none'));

    // Hide Citas Pendientes card and dashboard header unless dashboard is shown
    const citasPendientes = document.getElementById('citas-pendientes-card');
    const dashboardHeader = document.getElementById('dashboard-header');
    if (!citasPendientes) {
      console.warn('[AdminPanel] Missing #citas-pendientes-card element');
    }
    if (!dashboardHeader) {
      console.warn('[AdminPanel] Missing #dashboard-header element');
    }
    if (citasPendientes) {
      if (section === 'dashboard') {
        citasPendientes.classList.remove('d-none');
      } else {
        citasPendientes.classList.add('d-none');
      }
    }
    // Force hide dashboard header unless dashboard is selected
    if (dashboardHeader) {
      dashboardHeader.classList.add('d-none');
      if (section === 'dashboard') {
        dashboardHeader.classList.remove('d-none');
      }
    }

    // Show the selected section
    const target = document.getElementById(`${section}-section`);
    if (!target) {
      console.warn(`[AdminPanel] Missing section element: #${section}-section`);
      showNotification(`No se encontró la sección: ${section}`, 'error');
      return;
    }
    target.classList.remove('d-none');

    // Update sidebar active tab
    const tabLinks = document.querySelectorAll('.nav-link[data-section]');
    tabLinks.forEach(link => {
      if (link.getAttribute('data-section') === section) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Optionally, call module-specific load logic
    switch (section) {
      case 'dashboard':
        this.dashboard.load?.(); break;
      case 'appointments':
        this.appointments.loadAppointments?.(); break;
      case 'users':
        this.users.loadUsers?.(); break;
      case 'schedule':
        if (this.schedule && typeof this.schedule.loadScheduleSection === 'function') {
          this.schedule.loadScheduleSection();
        }
        break;
      case 'settings':
        this.settings.loadClinicSettings?.(); break;
      case 'user-verification':
        this.userVerification.load?.(); break;
      case 'server-status':
        this.serverStatus.load?.(); break;
    }
  }

  /**
   * Initializes event listeners for SMS management tab.
   */
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
    const sendRemindersBtn = document.getElementById('send_reminders_btn');
    if (sendRemindersBtn && !sendRemindersBtn.hasAttribute('data-listener-added')) {
      sendRemindersBtn.addEventListener('click', () => {
        this.sendAppointmentReminders();
      });
      sendRemindersBtn.setAttribute('data-listener-added', 'true');
    }
  }

  /**
   * Initializes send reminders tab functionality.
   */
  initializeSendReminders() {
    console.log('Initializing send reminders functionality');
    // Any specific initialization for send reminders tab
  }
}

// Initialize admin panel when DOM is loaded
/**
 * Sets up the AdminPanel and global event listeners on DOMContentLoaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Load upcoming appointments in dashboard
  try {
    if (window.adminPanel && window.adminPanel.appointments && typeof window.adminPanel.appointments.loadUpcomingAppointments === 'function') {
      window.adminPanel.appointments.loadUpcomingAppointments();
    }
  } catch (e) {
    console.error('Error loading upcoming appointments:', e);
  }

  // Add event listener for save-user-btn in Edit User Modal
  const saveUserBtn = document.getElementById('save-user-btn');
  if (saveUserBtn) {
    saveUserBtn.addEventListener('click', function() {
      if (window.usersModule && typeof window.usersModule.saveUserChanges === 'function') {
        window.usersModule.saveUserChanges();
      }
    });
  }

  // Make logout button functional
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('user_token');
      localStorage.removeItem('token');
      window.location.href = '/admin/adminOptions.html';
    });
  }
  // Set admin name in navbar
  try {
    const adminNameSpan = document.getElementById('admin-name');
    const token = localStorage.getItem('user_token') || localStorage.getItem('token');
    if (adminNameSpan && token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      adminNameSpan.textContent = payload.email || payload.name || 'Administrador';
    }
  } catch (e) {
    // fallback
    const adminNameSpan = document.getElementById('admin-name');
    if (adminNameSpan) adminNameSpan.textContent = 'Administrador';
  }
  try {
    console.log('Initializing AdminPanel...');
    window.adminPanel = new AdminPanel();
    console.log('AdminPanel initialized successfully:', window.adminPanel);
  } catch (error) {
    console.error('Failed to initialize AdminPanel:', error);
  }
});
