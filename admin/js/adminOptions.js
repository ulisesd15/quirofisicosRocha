/**
 * Admin Panel JavaScript
 * Handles all admin functionality including dashboard, users, appointments, schedules, and settings
 */

class AdminPanel {
  constructor() {
    this.currentSection = 'dashboard';
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.searchTimeout = null;
    this.isLoading = false;
    
    this.init();
  }

  async init() {
    console.log('AdminPanel init started');
    
    // Check admin authentication
    try {
      await this.checkAdminAuth();
      console.log('Admin auth check completed successfully');
    } catch (error) {
      console.error('Admin auth check failed:', error);
      return;
    }
    
    // Initialize event listeners
    this.initEventListeners();
    
    // Load initial dashboard data
    await this.loadDashboard();
  }

  async checkAdminAuth() {
    try {
      // Check if we have auth manager instance
      if (!window.authManager) {
        console.error('AuthManager not found, redirecting to login');
        window.location.href = '../login.html';
        return;
      }

      const user = window.authManager.getCurrentUser();
      if (!user) {
        console.log('No user found, redirecting to login');
        window.location.href = '../login.html';
        return;
      }

      if (user.role !== 'admin') {
        console.log('User is not admin, redirecting');
        alert('Acceso denegado. No tienes permisos de administrador.');
        window.location.href = '../index.html';
        return;
      }

      // Verify admin role with backend
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${window.authManager.getToken()}`
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          alert('Acceso denegado. No tienes permisos de administrador.');
          window.location.href = '../index.html';
          return;
        }
        throw new Error('Error verificando autenticación');
      }

      // Set admin name in navbar
      document.getElementById('admin-name').textContent = user.name;
      
    } catch (error) {
      console.error('Error checking admin auth:', error);
      window.location.href = '../login.html';
    }
  }

  initEventListeners() {
    // Navigation
    document.querySelectorAll('[data-section]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchSection(e.target.dataset.section);
      });
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
      window.authManager.logout();
      window.location.href = '../login.html';
    });

    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', () => {
      this.refreshCurrentSection();
    });

    // Search functionality
    this.initSearchListeners();
    
    // Modal listeners
    this.initModalListeners();
    
    // Filter listeners
    this.initFilterListeners();
  }

  initSearchListeners() {
    const searchInputs = ['appointments-search', 'users-search'];
    
    searchInputs.forEach(inputId => {
      const input = document.getElementById(inputId);
      if (input) {
        input.addEventListener('input', (e) => {
          clearTimeout(this.searchTimeout);
          this.searchTimeout = setTimeout(() => {
            this.handleSearch(inputId, e.target.value);
          }, 300);
        });
      }
    });

    // Search buttons
    document.getElementById('search-appointments-btn')?.addEventListener('click', () => {
      this.handleSearch('appointments-search', document.getElementById('appointments-search').value);
    });
    
    document.getElementById('search-users-btn')?.addEventListener('click', () => {
      this.handleSearch('users-search', document.getElementById('users-search').value);
    });
  }

  initFilterListeners() {
    document.getElementById('appointments-status-filter')?.addEventListener('change', (e) => {
      this.currentPage = 1;
      this.loadAppointments();
    });

    document.getElementById('appointments-date-filter')?.addEventListener('change', (e) => {
      this.currentPage = 1;
      this.loadAppointments();
    });
  }

  initModalListeners() {
    // Save appointment changes
    document.getElementById('save-appointment-btn')?.addEventListener('click', () => {
      this.saveAppointmentChanges();
    });

    // Save user changes
    document.getElementById('save-user-btn')?.addEventListener('click', () => {
      this.saveUserChanges();
    });

    // Save business hours
    document.getElementById('save-business-hours')?.addEventListener('click', () => {
      this.saveBusinessHours();
    });

    // Save clinic settings
    document.getElementById('save-settings')?.addEventListener('click', () => {
      this.saveClinicSettings();
    });
  }

  async switchSection(section) {
    if (this.isLoading) return;

    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');

    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(sec => {
      sec.classList.add('d-none');
    });

    // Show target section
    document.getElementById(`${section}-section`).classList.remove('d-none');

    // Update page title
    const titles = {
      dashboard: 'Dashboard',
      appointments: 'Gestión de Citas',
      users: 'Gestión de Usuarios',
      schedule: 'Horarios de Atención',
      settings: 'Configuración'
    };
    document.getElementById('page-title').textContent = titles[section];

    this.currentSection = section;
    this.currentPage = 1;

    // Load section data
    await this.loadSectionData(section);
  }

  async loadSectionData(section) {
    switch (section) {
      case 'dashboard':
        await this.loadDashboard();
        break;
      case 'appointments':
        await this.loadAppointments();
        break;
      case 'users':
        await this.loadUsers();
        break;
      case 'schedule':
        await this.loadBusinessHours();
        break;
      case 'settings':
        await this.loadClinicSettings();
        break;
    }
  }

  async refreshCurrentSection() {
    await this.loadSectionData(this.currentSection);
  }

  async loadDashboard() {
    try {
      this.showLoading();
      
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${window.authManager.getToken()}`
        }
      });

      if (!response.ok) throw new Error('Error loading dashboard');
      
      const data = await response.json();
      
      // Update stats cards
      document.getElementById('total-users').textContent = data.totalUsers || 0;
      document.getElementById('total-appointments').textContent = data.totalAppointments || 0;
      document.getElementById('today-appointments').textContent = data.todayAppointments || 0;
      document.getElementById('pending-appointments').textContent = data.pendingAppointments || 0;
      
      // Load recent appointments
      this.displayRecentAppointments(data.recentAppointments || []);
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
      this.showError('Error cargando el dashboard');
    } finally {
      this.hideLoading();
    }
  }

  displayRecentAppointments(appointments) {
    const tbody = document.getElementById('recent-appointments');
    
    if (appointments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay citas recientes</td></tr>';
      return;
    }

    tbody.innerHTML = appointments.map(apt => `
      <tr>
        <td>${this.formatDate(apt.appointment_date)}</td>
        <td>${apt.appointment_time}</td>
        <td>${apt.name}</td>
        <td><span class="badge bg-${apt.status}">${this.getStatusText(apt.status)}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="adminPanel.editAppointment(${apt.id})">
            <i class="fas fa-edit"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  async loadAppointments() {
    try {
      this.showLoading();
      
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: this.itemsPerPage
      });

      // Add filters
      const search = document.getElementById('appointments-search')?.value;
      const status = document.getElementById('appointments-status-filter')?.value;
      const date = document.getElementById('appointments-date-filter')?.value;

      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (date) params.append('date', date);

      const response = await fetch(`/api/admin/appointments?${params}`, {
        headers: {
          'Authorization': `Bearer ${window.authManager.getToken()}`
        }
      });

      if (!response.ok) throw new Error('Error loading appointments');
      
      const data = await response.json();
      
      this.displayAppointments(data.appointments);
      this.updatePagination('appointments', data.pagination);
      
    } catch (error) {
      console.error('Error loading appointments:', error);
      this.showError('Error cargando las citas');
    } finally {
      this.hideLoading();
    }
  }

  displayAppointments(appointments) {
    const tbody = document.getElementById('appointments-table');
    
    if (appointments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No se encontraron citas</td></tr>';
      return;
    }

    tbody.innerHTML = appointments.map(apt => `
      <tr>
        <td>${apt.id}</td>
        <td>${this.formatDate(apt.appointment_date)}</td>
        <td>${apt.appointment_time}</td>
        <td>${apt.name}</td>
        <td>
          ${apt.email ? `<div>${apt.email}</div>` : ''}
          ${apt.phone ? `<div class="text-muted">${apt.phone}</div>` : ''}
        </td>
        <td><span class="badge bg-${apt.status}">${this.getStatusText(apt.status)}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="adminPanel.editAppointment(${apt.id})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="adminPanel.deleteAppointment(${apt.id})">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  async loadUsers() {
    try {
      this.showLoading();
      
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: this.itemsPerPage
      });

      const search = document.getElementById('users-search')?.value;
      if (search) params.append('search', search);

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${window.authManager.getToken()}`
        }
      });

      if (!response.ok) throw new Error('Error loading users');
      
      const data = await response.json();
      
      this.displayUsers(data.users);
      this.updatePagination('users', data.pagination);
      
    } catch (error) {
      console.error('Error loading users:', error);
      this.showError('Error cargando los usuarios');
    } finally {
      this.hideLoading();
    }
  }

  displayUsers(users) {
    const tbody = document.getElementById('users-table');
    
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No se encontraron usuarios</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(user => `
      <tr>
        <td>${user.id}</td>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.phone || '-'}</td>
        <td>
          <span class="badge ${user.provider === 'google' ? 'bg-danger' : 'bg-secondary'}">
            ${user.provider === 'google' ? 'Google' : 'Local'}
          </span>
        </td>
        <td>${this.formatDate(user.created_at)}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="adminPanel.editUser(${user.id})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="adminPanel.deleteUser(${user.id})">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  async loadBusinessHours() {
    try {
      this.showLoading();
      
      const response = await fetch('/api/admin/business-hours', {
        headers: {
          'Authorization': `Bearer ${window.authManager.getToken()}`
        }
      });

      if (!response.ok) throw new Error('Error loading business hours');
      
      const data = await response.json();
      this.displayBusinessHours(data.businessHours);
      
    } catch (error) {
      console.error('Error loading business hours:', error);
      this.showError('Error cargando los horarios');
    } finally {
      this.hideLoading();
    }
  }

  displayBusinessHours(businessHours) {
    const container = document.getElementById('business-hours-container');
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    container.innerHTML = days.map((day, index) => {
      const hours = businessHours.find(bh => bh.day_of_week === day) || {};
      
      return `
        <div class="business-hours-day ${!hours.is_open ? 'closed' : ''}" data-day="${day}">
          <div class="row align-items-center">
            <div class="col-md-3">
              <h6>${dayNames[index]}</h6>
              <div class="form-check">
                <input class="form-check-input" type="checkbox" 
                       id="open-${day}" ${hours.is_open ? 'checked' : ''}>
                <label class="form-check-label" for="open-${day}">
                  Abierto
                </label>
              </div>
            </div>
            <div class="col-md-9">
              <div class="time-inputs">
                <label class="form-label">Desde:</label>
                <input type="time" class="form-control" 
                       id="start-${day}" value="${hours.open_time || '09:00'}"
                       ${!hours.is_open ? 'disabled' : ''}>
                <label class="form-label">Hasta:</label>
                <input type="time" class="form-control" 
                       id="end-${day}" value="${hours.close_time || '18:00'}"
                       ${!hours.is_open ? 'disabled' : ''}>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Add event listeners for checkboxes
    days.forEach(day => {
      const checkbox = document.getElementById(`open-${day}`);
      const startTime = document.getElementById(`start-${day}`);
      const endTime = document.getElementById(`end-${day}`);
      const dayDiv = document.querySelector(`[data-day="${day}"]`);

      checkbox.addEventListener('change', () => {
        const isOpen = checkbox.checked;
        startTime.disabled = !isOpen;
        endTime.disabled = !isOpen;
        dayDiv.classList.toggle('closed', !isOpen);
      });
    });
  }

  async loadClinicSettings() {
    try {
      this.showLoading();
      
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${window.authManager.getToken()}`
        }
      });

      if (!response.ok) throw new Error('Error loading settings');
      
      const data = await response.json();
      this.displayClinicSettings(data.settings);
      
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showError('Error cargando la configuración');
    } finally {
      this.hideLoading();
    }
  }

  displayClinicSettings(settings) {
    const form = document.getElementById('clinic-settings-form');
    const settingsMap = {};
    settings.forEach(setting => {
      settingsMap[setting.setting_key] = setting.setting_value;
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
        <h6>Notificaciones</h6>
        <div class="form-check mb-3">
          <input class="form-check-input" type="checkbox" id="email_notifications" 
                 ${settingsMap.email_notifications === 'true' ? 'checked' : ''}>
          <label class="form-check-label" for="email_notifications">
            Enviar notificaciones por email
          </label>
        </div>
        <div class="form-check mb-3">
          <input class="form-check-input" type="checkbox" id="sms_notifications" 
                 ${settingsMap.sms_notifications === 'true' ? 'checked' : ''}>
          <label class="form-check-label" for="sms_notifications">
            Enviar notificaciones por SMS
          </label>
        </div>
      </div>
    `;
  }

  // Edit/Delete Functions
  async editAppointment(id) {
    try {
      const response = await fetch(`/api/admin/appointments/${id}`, {
        headers: {
          'Authorization': `Bearer ${window.authManager.getToken()}`
        }
      });

      if (!response.ok) throw new Error('Error loading appointment');
      
      const data = await response.json();
      const appointment = data.appointment;

      // Populate modal
      document.getElementById('edit-appointment-id').value = appointment.id;
      document.getElementById('edit-appointment-name').value = appointment.name;
      document.getElementById('edit-appointment-email').value = appointment.email || '';
      document.getElementById('edit-appointment-phone').value = appointment.phone || '';
      document.getElementById('edit-appointment-date').value = appointment.appointment_date;
      document.getElementById('edit-appointment-time').value = appointment.appointment_time;
      document.getElementById('edit-appointment-status').value = appointment.status;
      document.getElementById('edit-appointment-note').value = appointment.note || '';

      // Show modal
      const modal = new bootstrap.Modal(document.getElementById('editAppointmentModal'));
      modal.show();

    } catch (error) {
      console.error('Error loading appointment:', error);
      this.showError('Error cargando la cita');
    }
  }

  async saveAppointmentChanges() {
    try {
      const id = document.getElementById('edit-appointment-id').value;
      const data = {
        name: document.getElementById('edit-appointment-name').value,
        email: document.getElementById('edit-appointment-email').value,
        phone: document.getElementById('edit-appointment-phone').value,
        appointment_date: document.getElementById('edit-appointment-date').value,
        appointment_time: document.getElementById('edit-appointment-time').value,
        status: document.getElementById('edit-appointment-status').value,
        note: document.getElementById('edit-appointment-note').value
      };

      const response = await fetch(`/api/admin/appointments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.authManager.getToken()}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Error updating appointment');

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('editAppointmentModal'));
      modal.hide();

      // Reload data
      await this.refreshCurrentSection();
      this.showSuccess('Cita actualizada correctamente');

    } catch (error) {
      console.error('Error saving appointment:', error);
      this.showError('Error guardando los cambios');
    }
  }

  async deleteAppointment(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta cita?')) return;

    try {
      const response = await fetch(`/api/admin/appointments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${window.authManager.getToken()}`
        }
      });

      if (!response.ok) throw new Error('Error deleting appointment');

      await this.refreshCurrentSection();
      this.showSuccess('Cita eliminada correctamente');

    } catch (error) {
      console.error('Error deleting appointment:', error);
      this.showError('Error eliminando la cita');
    }
  }

  async editUser(id) {
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        headers: {
          'Authorization': `Bearer ${window.authManager.getToken()}`
        }
      });

      if (!response.ok) throw new Error('Error loading user');
      
      const data = await response.json();
      const user = data.user;

      // Populate modal
      document.getElementById('edit-user-id').value = user.id;
      document.getElementById('edit-user-name').value = user.name;
      document.getElementById('edit-user-email').value = user.email;
      document.getElementById('edit-user-phone').value = user.phone || '';
      document.getElementById('edit-user-role').value = user.role || 'user';

      // Show modal
      const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
      modal.show();

    } catch (error) {
      console.error('Error loading user:', error);
      this.showError('Error cargando el usuario');
    }
  }

  async saveUserChanges() {
    try {
      const id = document.getElementById('edit-user-id').value;
      const data = {
        name: document.getElementById('edit-user-name').value,
        email: document.getElementById('edit-user-email').value,
        phone: document.getElementById('edit-user-phone').value,
        role: document.getElementById('edit-user-role').value
      };

      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.authManager.getToken()}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Error updating user');

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
      modal.hide();

      // Reload data
      await this.refreshCurrentSection();
      this.showSuccess('Usuario actualizado correctamente');

    } catch (error) {
      console.error('Error saving user:', error);
      this.showError('Error guardando los cambios');
    }
  }

  async deleteUser(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${window.authManager.getToken()}`
        }
      });

      if (!response.ok) throw new Error('Error deleting user');

      await this.refreshCurrentSection();
      this.showSuccess('Usuario eliminado correctamente');

    } catch (error) {
      console.error('Error deleting user:', error);
      this.showError('Error eliminando el usuario');
    }
  }

  async saveBusinessHours() {
    try {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const businessHours = [];

      days.forEach(day => {
        const isOpen = document.getElementById(`open-${day}`).checked;
        const openTime = document.getElementById(`start-${day}`).value;
        const closeTime = document.getElementById(`end-${day}`).value;

        businessHours.push({
          day_of_week: day,
          is_open: isOpen,
          open_time: isOpen ? openTime : null,
          close_time: isOpen ? closeTime : null
        });
      });

      const response = await fetch('/api/admin/business-hours', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.authManager.getToken()}`
        },
        body: JSON.stringify({ businessHours })
      });

      if (!response.ok) throw new Error('Error saving business hours');

      this.showSuccess('Horarios guardados correctamente');

    } catch (error) {
      console.error('Error saving business hours:', error);
      this.showError('Error guardando los horarios');
    }
  }

  async saveClinicSettings() {
    try {
      const settings = [
        { key: 'clinic_name', value: document.getElementById('clinic_name').value },
        { key: 'clinic_phone', value: document.getElementById('clinic_phone').value },
        { key: 'clinic_address', value: document.getElementById('clinic_address').value },
        { key: 'clinic_email', value: document.getElementById('clinic_email').value },
        { key: 'appointment_duration', value: document.getElementById('appointment_duration').value },
        { key: 'advance_booking_days', value: document.getElementById('advance_booking_days').value },
        { key: 'auto_confirm_appointments', value: document.getElementById('auto_confirm_appointments').checked },
        { key: 'email_notifications', value: document.getElementById('email_notifications').checked },
        { key: 'sms_notifications', value: document.getElementById('sms_notifications').checked }
      ];

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.authManager.getToken()}`
        },
        body: JSON.stringify({ settings })
      });

      if (!response.ok) throw new Error('Error saving settings');

      this.showSuccess('Configuración guardada correctamente');

    } catch (error) {
      console.error('Error saving settings:', error);
      this.showError('Error guardando la configuración');
    }
  }

  // Utility Functions
  handleSearch(inputId, query) {
    this.currentPage = 1;
    
    if (inputId.includes('appointments')) {
      this.loadAppointments();
    } else if (inputId.includes('users')) {
      this.loadUsers();
    }
  }

  updatePagination(section, pagination) {
    const paginationContainer = document.getElementById(`${section}-pagination`);
    
    if (!pagination || pagination.totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let paginationHTML = '';
    
    // Previous button
    if (pagination.currentPage > 1) {
      paginationHTML += `
        <li class="page-item">
          <a class="page-link" href="#" onclick="adminPanel.goToPage('${section}', ${pagination.currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
          </a>
        </li>
      `;
    }

    // Page numbers
    for (let i = Math.max(1, pagination.currentPage - 2); 
         i <= Math.min(pagination.totalPages, pagination.currentPage + 2); 
         i++) {
      paginationHTML += `
        <li class="page-item ${i === pagination.currentPage ? 'active' : ''}">
          <a class="page-link" href="#" onclick="adminPanel.goToPage('${section}', ${i})">${i}</a>
        </li>
      `;
    }

    // Next button
    if (pagination.currentPage < pagination.totalPages) {
      paginationHTML += `
        <li class="page-item">
          <a class="page-link" href="#" onclick="adminPanel.goToPage('${section}', ${pagination.currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
          </a>
        </li>
      `;
    }

    paginationContainer.innerHTML = paginationHTML;
  }

  goToPage(section, page) {
    this.currentPage = page;
    
    if (section === 'appointments') {
      this.loadAppointments();
    } else if (section === 'users') {
      this.loadUsers();
    }
  }

  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  getStatusText(status) {
    const statusMap = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      completed: 'Completada',
      cancelled: 'Cancelada'
    };
    return statusMap[status] || status;
  }

  showLoading() {
    this.isLoading = true;
    document.body.classList.add('loading');
  }

  hideLoading() {
    this.isLoading = false;
    document.body.classList.remove('loading');
  }

  showSuccess(message) {
    this.showAlert(message, 'success');
  }

  showError(message) {
    this.showAlert(message, 'danger');
  }

  showAlert(message, type) {
    // Remove existing alerts
    document.querySelectorAll('.alert').forEach(alert => alert.remove());

    const alertHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;

    const mainContent = document.querySelector('main');
    mainContent.insertAdjacentHTML('afterbegin', alertHTML);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      const alert = document.querySelector('.alert');
      if (alert) {
        alert.remove();
      }
    }, 5000);
  }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.adminPanel = new AdminPanel();
});
