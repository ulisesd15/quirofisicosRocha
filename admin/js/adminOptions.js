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
    
    // Track initialized tab listeners to prevent duplicates
    this.initializedTabListeners = {
      schedule: false,
      settings: false,
      sms: false
    };
    
    this.init();
  }

  // Helper method to get authentication token consistently
  getAuthToken() {
    return window.authManager?.getToken() || localStorage.getItem('user_token') || localStorage.getItem('token');
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
    
    // Check for URL hash navigation
    const hash = window.location.hash.replace('#', '');
    if (hash && ['dashboard', 'appointments', 'users', 'schedule', 'settings'].includes(hash)) {
      console.log('Navigating to section from URL hash:', hash);
      await this.switchSection(hash);
    } else {
      // Load initial dashboard data
      await this.loadDashboard();
    }
  }

  async checkAdminAuth() {
    try {
      const token = this.getAuthToken();
      
      if (!token) {
        console.error('No authentication token found, redirecting to login');
        window.location.href = '../login.html';
        return;
      }

      // Verify admin role with backend first
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Admin auth failed:', response.status, response.statusText);
        if (response.status === 401) {
          console.log('Token invalid, redirecting to login');
          // Clear invalid token
          localStorage.removeItem('user_token');
          localStorage.removeItem('token');
          window.location.href = '../login.html';
          return;
        }
        if (response.status === 403) {
          alert('Acceso denegado. No tienes permisos de administrador.');
          window.location.href = '../index.html';
          return;
        }
        throw new Error(`Error verificando autenticación: ${response.status}`);
      }

      // Check localStorage for user data
      const userRole = localStorage.getItem('user_role');
      const userName = localStorage.getItem('user_name');
      
      if (userRole !== 'admin') {
        console.log('User role is not admin, redirecting');
        alert('Acceso denegado. No tienes permisos de administrador.');
        window.location.href = '../index.html';
        return;
      }

      // Set admin name in navbar
      if (userName) {
        document.getElementById('admin-name').textContent = userName;
      }
      
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

    // Dashboard cards navigation
    document.querySelectorAll('.dashboard-card[data-navigate]').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const section = card.dataset.navigate;
        const filter = card.dataset.filter;
        
        if (section === 'user-verification') {
          this.navigateToUserVerification();
        } else if (filter) {
          this.navigateToSection(section, filter);
        } else {
          this.navigateToSection(section);
        }
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

    // Users role filter
    document.getElementById('users-role-filter')?.addEventListener('change', (e) => {
      this.currentPage = 1;
      this.loadUsers();
    });

    // Users refresh button
    document.getElementById('refresh-users-btn')?.addEventListener('click', () => {
      this.currentPage = 1;
      this.loadUsers();
    });

    // Add user button
    document.getElementById('add-user-btn')?.addEventListener('click', () => {
      this.showAddUserModal();
    });

    // Clear users filters button
    document.getElementById('clear-users-filters-btn')?.addEventListener('click', () => {
      this.clearUsersFilters();
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

    // Reset business hours
    document.getElementById('reset-business-hours')?.addEventListener('click', () => {
      this.loadBusinessHours();
    });

    // Save clinic settings
    document.getElementById('save-settings')?.addEventListener('click', () => {
      this.saveClinicSettings();
    });
  }

  async switchSection(section) {
    console.log('switchSection called with:', section);
    if (this.isLoading) {
      console.log('Already loading, skipping section switch');
      return;
    }

    try {
      // Update navigation
      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
      });
      const navLink = document.querySelector(`[data-section="${section}"]`);
      console.log('Nav link found:', navLink);
      if (navLink) {
        navLink.classList.add('active');
      }

      // Hide all sections
      document.querySelectorAll('.admin-section').forEach(sec => {
        sec.classList.add('d-none');
      });

      // Show target section
      const targetSection = document.getElementById(`${section}-section`);
      console.log('Target section:', targetSection);
      if (targetSection) {
        targetSection.classList.remove('d-none');
      } else {
        console.error('Target section not found:', `${section}-section`);
      }

      // Update page title
      const titles = {
        dashboard: 'Dashboard',
        appointments: 'Gestión de Citas',
        users: 'Gestión de Usuarios',
        schedule: 'Horarios de Atención',
        settings: 'Configuración',
        'sms-management': 'Verificación de Usuarios'
      };
      const titleElement = document.getElementById('page-title');
      if (titleElement) {
        titleElement.textContent = titles[section];
      }

      this.currentSection = section;
      this.currentPage = 1;

      console.log('Loading section data...');
      // Load section data
      await this.loadSectionData(section);
      console.log('Section switch completed');
    } catch (error) {
      console.error('Error in switchSection:', error);
    }
  }

  async navigateToSection(section, filter = null) {
    // Set the filter before switching sections
    this.currentFilter = filter;
    
    // Switch to the target section
    await this.switchSection(section);
    
    // Apply specific filtering if needed
    if (filter && section === 'appointments') {
      await this.applyAppointmentFilter(filter);
    }
  }

  async navigateToUserVerification() {
    // Navigate to SMS management section - user verification is now the default active tab
    await this.switchSection('sms-management');
  }

  async applyAppointmentFilter(filter) {
    try {
      let url = '/api/admin/appointments';
      let params = new URLSearchParams();
      
      const today = new Date();
      const formatDate = (date) => date.toISOString().split('T')[0];
      
      switch (filter) {
        case 'today':
          params.append('date', formatDate(today));
          break;
        case 'pending':
          // Get appointments for the rest of the week (tomorrow onwards)
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          const endOfWeek = new Date(today);
          endOfWeek.setDate(today.getDate() + (7 - today.getDay())); // End of current week
          
          params.append('start_date', formatDate(tomorrow));
          params.append('end_date', formatDate(endOfWeek));
          params.append('status', 'pending');
          break;
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (!response.ok) throw new Error('Error loading filtered appointments');
      
      const appointments = await response.json();
      this.displayAppointments(appointments.appointments || appointments);
      
      // Update the appointments header to show the filter
      const filterTitles = {
        today: 'Citas de Hoy',
        pending: 'Citas Pendientes (Resto de la Semana)'
      };
      
      if (filter && filterTitles[filter]) {
        const cardTitle = document.querySelector('#appointments-section .card-header h5');
        if (cardTitle) {
          cardTitle.innerHTML = `<i class="fas fa-calendar-check me-2"></i>${filterTitles[filter]}`;
        }
      }
      
    } catch (error) {
      console.error('Error applying appointment filter:', error);
      this.showError('Error al filtrar las citas');
    }
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
        await this.loadScheduleSection(); // Enhanced schedule loading
        break;
      case 'settings':
        // Settings data is loaded by individual tab functions when tabs are activated
        console.log('Settings section loaded');
        
        // Ensure the first tab (general settings) is active
        this.activateFirstTab('settings');
        
        // Load only the general settings tab data by default
        await this.loadClinicSettings();
        
        // Initialize settings tab event listeners
        this.initializeSettingsTabListeners();
        break;
      case 'sms-management':
        // SMS management data is loaded by the individual functions
        // when the tabs are activated
        console.log('SMS management section loaded');
        
        // Ensure the first tab (user verification) is active
        this.activateFirstTab('sms-management');
        
        // Load initial tab (user verification)
        await this.loadUserVerification();
        
        // Initialize SMS tab listeners
        this.initializeSMSTabListeners();
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
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.showError('Sesión expirada. Por favor, inicie sesión nuevamente.');
          window.location.href = '/login.html';
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update stats cards with error handling
      this.updateStatsCard('total-users', data.totalUsers);
      this.updateStatsCard('total-appointments', data.totalAppointments);
      this.updateStatsCard('today-appointments', data.todayAppointments);
      this.updateStatsCard('pending-users', data.pendingAppointments);
      
      // Load recent appointments
      this.displayRecentAppointments(data.recentAppointments || []);
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
      this.showError('Error cargando el dashboard: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  updateStatsCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value || 0;
    }
  }

  displayRecentAppointments(appointments) {
    const tbody = document.getElementById('recent-appointments');
    
    if (appointments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay citas recientes</td></tr>';
      return;
    }

    tbody.innerHTML = appointments.map(apt => {
      const statusClass = this.getStatusBadgeClass(apt.status);
      const statusText = this.getStatusText(apt.status);
      
      return `
        <tr>
          <td>${this.formatDate(apt.appointment_date)}</td>
          <td>${apt.appointment_time}</td>
          <td>${apt.name}</td>
          <td><span class="badge ${statusClass}">${statusText}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="adminPanel.editAppointment(${apt.id})">
              <i class="fas fa-edit"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async loadAppointments() {
    try {
      this.showLoading();
      
      // Reset header to default if no filter is active
      if (!this.currentFilter) {
        const cardTitle = document.querySelector('#appointments-section .card-header h5');
        if (cardTitle) {
          cardTitle.innerHTML = `<i class="fas fa-calendar-check me-2"></i>Gestión de Citas`;
        }
      }
      
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
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Error loading appointments');
      
      const data = await response.json();
      
      this.displayAppointments(data.appointments);
      this.updatePagination('appointments', data.pagination);
      
      // Clear the current filter after normal load
      this.currentFilter = null;
      
    } catch (error) {
      console.error('Error loading appointments:', error);
      this.showError('Error cargando las citas');
    } finally {
      this.hideLoading();
    }
  }

  async navigateToScheduleTab(tabName) {
    console.log('navigateToScheduleTab called with:', tabName);
    try {
      // First switch to schedule section
      console.log('Switching to schedule section...');
      await this.switchSection('schedule');
      
      // Then activate the specific tab
      const tabButton = document.getElementById(`${tabName}-tab`);
      const tabContent = document.getElementById(`${tabName}`);
      
      console.log('Tab button:', tabButton);
      console.log('Tab content:', tabContent);
      
      if (tabButton && tabContent) {
        // Remove active from all tabs
        document.querySelectorAll('#schedule-tabs .nav-link').forEach(tab => {
          tab.classList.remove('active');
        });
        document.querySelectorAll('#schedule-tab-content .tab-pane').forEach(pane => {
          pane.classList.remove('show', 'active');
        });
        
        // Activate target tab
        tabButton.classList.add('active');
        tabContent.classList.add('show', 'active');
        
        console.log('Tab activated, loading data...');
        // Load specific data for the tab
        await this.loadScheduleTabData(tabName);
      } else {
        console.error('Tab elements not found:', { tabButton, tabContent });
      }
    } catch (error) {
      console.error('Error in navigateToScheduleTab:', error);
    }
  }

  async loadScheduleTabData(tabName) {
    switch (tabName) {
      case 'business-days':
        await this.loadBusinessDayExceptions();
        break;
      case 'weekly-hours':
        await this.loadBusinessHours();
        // Initialize temporary hours functionality
        this.initTemporaryHoursToggle();
        break;
      case 'week-appointments':
        await this.loadWeekExceptions();
        await this.initWeekSelector();
        break;
      case 'pending-appointments':
        await this.loadPendingAppointmentsManagement();
        break;
    }
  }

  displayAppointments(appointments) {
    const tbody = document.getElementById('appointments-table');
    
    if (appointments.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <i class="fas fa-calendar-times"></i>
            <h5>No hay citas</h5>
            <p>No se encontraron citas que coincidan con los criterios de búsqueda.</p>
          </td>
        </tr>
      `;
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
          <div class="action-buttons">
            <button class="btn btn-outline-primary btn-sm" onclick="adminPanel.editAppointment(${apt.id})" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm" onclick="adminPanel.deleteAppointment(${apt.id})" title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
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

      const roleFilter = document.getElementById('users-role-filter')?.value;
      if (roleFilter) params.append('role', roleFilter);

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Error loading users');
      
      const data = await response.json();
      
      this.displayUsers(data.users);
      this.updatePagination('users', data.pagination);
      this.updateUsersCount(data.pagination.total_records);
      
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
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <i class="fas fa-users"></i>
            <h5>No hay usuarios</h5>
            <p>No se encontraron usuarios que coincidan con los criterios de búsqueda.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = users.map(user => `
      <tr>
        <td>${user.id}</td>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.phone || '-'}</td>
        <td>
          <span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}">
            ${user.role === 'admin' ? 'Administrador' : 'Usuario'}
          </span>
          ${user.provider === 'google' ? '<small class="d-block text-muted">Google</small>' : '<small class="d-block text-muted">Local</small>'}
        </td>
        <td>${this.formatDate(user.created_at)}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-outline-primary btn-sm" onclick="adminPanel.editUser(${user.id})" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm" onclick="adminPanel.deleteUser(${user.id})" title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  updateUsersCount(count) {
    const countElement = document.getElementById('users-total-count');
    if (countElement) {
      countElement.textContent = `Total: ${count} usuarios`;
    }
  }

  showAddUserModal() {
    // For now, show a simple alert. You can implement a proper modal later
    alert('Funcionalidad de agregar usuario - pendiente de implementar');
  }

  clearUsersFilters() {
    // Clear search input
    const searchInput = document.getElementById('users-search');
    if (searchInput) searchInput.value = '';

    // Clear role filter
    const roleFilter = document.getElementById('users-role-filter');
    if (roleFilter) roleFilter.value = '';

    // Reset to first page and reload
    this.currentPage = 1;
    this.loadUsers();
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

  // Edit/Delete Functions
  async editAppointment(id) {
    try {
      const response = await fetch(`/api/admin/appointments/${id}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
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
          'Authorization': `Bearer ${this.getAuthToken()}`
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
          'Authorization': `Bearer ${this.getAuthToken()}`
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
          'Authorization': `Bearer ${this.getAuthToken()}`
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
          'Authorization': `Bearer ${this.getAuthToken()}`
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
          'Authorization': `Bearer ${this.getAuthToken()}`
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
      this.showLoading();
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const businessHours = [];

      days.forEach(day => {
        const checkbox = document.getElementById(`open-${day}`);
        const startTime = document.getElementById(`start-${day}`);
        const endTime = document.getElementById(`end-${day}`);
        const breakStart = document.getElementById(`break-start-${day}`);
        const breakEnd = document.getElementById(`break-end-${day}`);

        if (!checkbox || !startTime || !endTime || !breakStart || !breakEnd) {
          console.error(`Missing elements for day: ${day}`);
          return;
        }

        const isOpen = checkbox.checked;
        const openTime = startTime.value;
        const closeTime = endTime.value;
        const breakStartTime = breakStart.value;
        const breakEndTime = breakEnd.value;

        console.log(`Saving ${day}: open=${isOpen}, times=${openTime}-${closeTime}, break=${breakStartTime}-${breakEndTime}`);

        businessHours.push({
          day_of_week: day,
          is_open: isOpen,
          open_time: isOpen ? openTime : null,
          close_time: isOpen ? closeTime : null,
          break_start: isOpen && breakStartTime ? breakStartTime : null,
          break_end: isOpen && breakEndTime ? breakEndTime : null
        });
      });

      console.log('Sending business hours data:', businessHours);

      const response = await fetch('/api/admin/business-hours', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ businessHours })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error saving business hours: ${errorText}`);
      }

      this.showSuccess('Horarios guardados correctamente');
      // Reload to reflect changes
      await this.loadBusinessHours();

    } catch (error) {
      console.error('Error saving business hours:', error);
      this.showError('Error guardando los horarios: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  async saveClinicSettings() {
    try {
      const settings = [
        // General clinic settings
        { key: 'clinic_name', value: document.getElementById('clinic_name').value },
        { key: 'clinic_phone', value: document.getElementById('clinic_phone').value },
        { key: 'clinic_address', value: document.getElementById('clinic_address').value },
        { key: 'clinic_email', value: document.getElementById('clinic_email').value },
        
        // Appointment settings
        { key: 'appointment_duration', value: document.getElementById('appointment_duration').value },
        { key: 'advance_booking_days', value: document.getElementById('advance_booking_days').value },
        { key: 'auto_confirm_appointments', value: document.getElementById('auto_confirm_appointments').checked },
        
        // Main notification toggles
        { key: 'email_notifications', value: document.getElementById('email_notifications').checked },
        { key: 'sms_notifications', value: document.getElementById('sms_notifications').checked },
        
        // Email notification options
        { key: 'email_appointment_confirmation', value: document.getElementById('email_appointment_confirmation')?.checked || false },
        { key: 'email_appointment_reminder', value: document.getElementById('email_appointment_reminder')?.checked || false },
        { key: 'email_appointment_changes', value: document.getElementById('email_appointment_changes')?.checked || false },
        
        // SMS notification options
        { key: 'sms_appointment_confirmation', value: document.getElementById('sms_appointment_confirmation')?.checked || false },
        { key: 'sms_appointment_reminder', value: document.getElementById('sms_appointment_reminder')?.checked || false },
        { key: 'sms_appointment_changes', value: document.getElementById('sms_appointment_changes')?.checked || false },
        
        // Timing and schedule settings
        { key: 'reminder_hours_before', value: document.getElementById('reminder_hours_before')?.value || '24' },
        { key: 'business_hours_only', value: document.getElementById('business_hours_only')?.checked || false }
      ];

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ settings })
      });

      if (!response.ok) throw new Error('Error saving settings');

      this.showSuccess('Configuración de notificaciones guardada correctamente');

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

  getStatusBadgeClass(status) {
    const statusClasses = {
      pending: 'bg-warning text-dark',
      confirmed: 'bg-success',
      completed: 'bg-primary',
      cancelled: 'bg-danger'
    };
    return statusClasses[status] || 'bg-secondary';
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

  // =================
  // ENHANCED SCHEDULE MANAGEMENT
  // =================

  async loadScheduleSection() {
    console.log('Loading comprehensive schedule section');
    
    // Ensure the first tab (business hours) is active
    this.activateFirstTab('schedule');
    
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
    
    // Initialize tab-specific event listeners
    this.initScheduleTabListeners();
    
    console.log('Schedule section loading complete');
  }

  initializeEffectiveDatePicker() {
    const datePicker = document.getElementById('schedule-effective-date');
    if (!datePicker) return;

    // Set minimum date to today
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    datePicker.setAttribute('min', todayString);
    
    // Set default value to today
    datePicker.value = todayString;
    
    // Add event listener for date changes
    datePicker.addEventListener('change', () => {
      this.updateScheduleStatus();
    });
    
    // Update initial status
    this.updateScheduleStatus();
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
    if (this.initializedTabListeners.schedule) {
      console.log('Schedule tab listeners already initialized');
      return;
    }
    
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

  // =================
  // BUSINESS HOURS MANAGEMENT
  // =================

  async loadBusinessHours() {
    try {
      const response = await fetch('/api/admin/schedule/business-hours', {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to load business hours');

      const data = await response.json();
      this.renderBusinessHours(data.business_hours || data);
    } catch (error) {
      console.error('Error loading business hours:', error);
      this.showError('Error al cargar horarios de negocio');
    }
  }

  renderBusinessHours(businessHours) {
    const container = document.getElementById('business-hours-container');
    if (!container) return;

    const daysOfWeek = [
      { key: 'Monday', label: 'Lunes' },
      { key: 'Tuesday', label: 'Martes' },
      { key: 'Wednesday', label: 'Miércoles' },
      { key: 'Thursday', label: 'Jueves' },
      { key: 'Friday', label: 'Viernes' },
      { key: 'Saturday', label: 'Sábado' },
      { key: 'Sunday', label: 'Domingo' }
    ];

    const businessHoursMap = {};
    businessHours.forEach(day => {
      businessHoursMap[day.day_of_week] = day;
    });

    container.innerHTML = daysOfWeek.map(day => {
      const dayData = businessHoursMap[day.key] || {
        day_of_week: day.key,
        is_open: false,
        open_time: '09:00',
        close_time: '18:00',
        break_start: '13:00',
        break_end: '14:00'
      };

      return `
        <div class="card mb-3" data-day="${day.key}">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0">${day.label}</h6>
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="is-open-${day.key}" 
                     ${dayData.is_open ? 'checked' : ''} onchange="adminPanel.toggleDayHours('${day.key}')">
              <label class="form-check-label" for="is-open-${day.key}">Abierto</label>
            </div>
          </div>
          <div class="card-body ${!dayData.is_open ? 'd-none' : ''}" id="hours-${day.key}">
            <div class="row">
              <div class="col-md-3">
                <label class="form-label small">Apertura</label>
                <input type="time" class="form-control" id="open-${day.key}" value="${dayData.open_time || '09:00'}">
              </div>
              <div class="col-md-3">
                <label class="form-label small">Cierre</label>
                <input type="time" class="form-control" id="close-${day.key}" value="${dayData.close_time || '18:00'}">
              </div>
              <div class="col-md-3">
                <label class="form-label small">Inicio almuerzo</label>
                <input type="time" class="form-control" id="break-start-${day.key}" value="${dayData.break_start || '13:00'}">
              </div>
              <div class="col-md-3">
                <label class="form-label small">Fin almuerzo</label>
                <input type="time" class="form-control" id="break-end-${day.key}" value="${dayData.break_end || '14:00'}">
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  async saveAnnouncement() {
    console.log('saveAnnouncement called');
    
    const formData = {
      title: document.getElementById('announcement-title').value,
      message: document.getElementById('announcement-content').value,
      announcement_type: document.getElementById('announcement-type').value,
      priority: document.getElementById('announcement-priority').value,
      start_date: document.getElementById('announcement-start-date').value,
      end_date: document.getElementById('announcement-end-date').value,
      show_on_homepage: document.getElementById('announcement-active').checked,
      show_on_booking: false
    };

    console.log('Form data:', formData);
    console.log('Auth token:', this.getAuthToken());

    if (!formData.title || !formData.message || !formData.start_date) {
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

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (!response.ok) throw new Error(`Failed to save announcement: ${responseText}`);

      this.showSuccess('Anuncio guardado exitosamente');
      
      // Close modal and refresh list
      const modal = bootstrap.Modal.getInstance(document.getElementById('addAnnouncementModal'));
      modal.hide();
      document.getElementById('add-announcement-form').reset();
      
      await this.loadAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      this.showError('Error al guardar anuncio: ' + error.message);
    }
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

  // =================
  // UTILITY FUNCTIONS
  // =================

  formatDateRange(startDate, endDate) {
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    if (!endDate || startDate === endDate) {
      return formatDate(startDate);
    }
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }

  getAnnouncementColor(type) {
    const colors = {
      'info': 'primary',
      'warning': 'warning',
      'success': 'success',
      'danger': 'danger'
    };
    return colors[type] || 'primary';
  }

  getAnnouncementTypeLabel(type) {
    const labels = {
      'info': 'Información',
      'warning': 'Advertencia',
      'success': 'Buenas noticias',
      'danger': 'Urgente'
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

  // =================
  // EXISTING FUNCTIONS CONTINUATION
  // =================

  toggleDayHours(day) {
    const hoursContainer = document.getElementById(`hours-${day}`);
    const checkbox = document.getElementById(`is-open-${day}`);
    
    if (checkbox.checked) {
      hoursContainer.classList.remove('d-none');
    } else {
      hoursContainer.classList.add('d-none');
    }
  }

  // =================
  // SCHEDULE EXCEPTIONS MANAGEMENT
  // =================

  async loadScheduleExceptions() {
    try {
      const response = await fetch('/api/admin/schedule-exceptions', {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to load schedule exceptions');

      const exceptions = await response.json();
      this.renderScheduleExceptions(exceptions);
    } catch (error) {
      console.error('Error loading schedule exceptions:', error);
      this.showError('Error al cargar excepciones de horario');
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

  async saveScheduleException() {
    console.log('saveScheduleException called');
    
    const formData = {
      exception_type: document.getElementById('exception-type-select').value,
      start_date: document.getElementById('exception-start-date').value,
      end_date: document.getElementById('exception-end-date').value,
      is_closed: document.getElementById('exception-is-closed').checked,
      custom_open_time: document.getElementById('exception-open-time').value,
      custom_close_time: document.getElementById('exception-close-time').value,
      custom_break_start: document.getElementById('exception-break-start').value,
      custom_break_end: document.getElementById('exception-break-end').value,
      reason: document.getElementById('exception-reason').value,
      description: document.getElementById('exception-description').value,
      recurring_type: document.getElementById('exception-recurring').checked ? 'yearly' : null
    };

    console.log('Form data collected:', formData);
    console.log('Auth token:', this.getAuthToken());

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
      console.log('Sending DELETE request to:', `/api/admin/schedule-exceptions/${id}`);
      console.log('Auth token:', this.getAuthToken());
      
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

  // =================
  // HOLIDAY TEMPLATES MANAGEMENT
  // =================

  async loadHolidayTemplates(context = 'main') {
    try {
      const response = await fetch('/api/admin/schedule/holiday-templates', {
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
          'Authorization': `Bearer ${this.getAuthToken()}`
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
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
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

  resetHolidayTemplateForm() {
    document.getElementById('holidayTemplateForm').reset();
    document.getElementById('holiday-template-id').value = '';
    document.getElementById('custom-hours-section').classList.add('d-none');
    document.getElementById('addHolidayTemplateModalLabel').innerHTML = 
      '<i class="fas fa-star me-2"></i>Nueva Plantilla de Feriado';
  }

  // =================
  // ANNOUNCEMENTS MANAGEMENT
  // =================

  async loadAnnouncements() {
    try {
      const response = await fetch('/api/admin/announcements', {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to load announcements');

      const announcements = await response.json();
      this.renderAnnouncements(announcements);
    } catch (error) {
      console.error('Error loading announcements:', error);
      this.showError('Error al cargar anuncios');
    }
  }

  renderAnnouncements(announcements) {
    const container = document.getElementById('announcements-list');
    if (!container) return;

    if (announcements.length === 0) {
      container.innerHTML = '<div class="text-center text-muted py-4">No hay anuncios activos</div>';
      return;
    }

    container.innerHTML = announcements.map(announcement => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
              <h6 class="card-title d-flex align-items-center">
                <i class="fas fa-bullhorn me-2 text-${this.getAnnouncementColor(announcement.announcement_type)}"></i>
                ${announcement.title}
                <span class="badge bg-${this.getAnnouncementColor(announcement.announcement_type)} ms-2">
                  ${this.getAnnouncementTypeLabel(announcement.announcement_type)}
                </span>
                <span class="badge bg-secondary ms-1">
                  ${this.getPriorityLabel(announcement.priority)}
                </span>
              </h6>
              <p class="card-text">${announcement.message}</p>
              <div class="d-flex gap-3 text-sm text-muted">
                <span><i class="fas fa-calendar"></i> ${this.formatDateRange(announcement.start_date, announcement.end_date)}</span>
                ${announcement.show_on_homepage ? '<span class="badge bg-success">En página principal</span>' : ''}
                ${announcement.show_on_booking ? '<span class="badge bg-info">En reservas</span>' : ''}
                <span class="text-muted">Por: ${announcement.created_by_name || 'Admin'}</span>
              </div>
            </div>
            <div class="btn-group">
              <button class="btn btn-outline-primary btn-sm" onclick="adminPanel.editAnnouncement(${announcement.id})">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-outline-danger btn-sm" onclick="adminPanel.deleteAnnouncement(${announcement.id})">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  async loadScheduledClosures() {
    try {
      const response = await fetch('/api/admin/schedule/closures', {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to load scheduled closures');

      const closures = await response.json();
      this.renderScheduledClosures(closures);
    } catch (error) {
      console.error('Error loading scheduled closures:', error);
      this.showError('Error al cargar cierres programados');
    }
  }

  renderScheduledClosures(closures) {
    const container = document.getElementById('closures-list');
    if (!container) return;

    if (closures.length === 0) {
      container.innerHTML = '<div class="text-center text-muted py-4">No hay cierres programados</div>';
      return;
    }

    container.innerHTML = closures.map(closure => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h6 class="card-title">${closure.title}</h6>
              <p class="card-text text-muted">${closure.description || 'Sin descripción'}</p>
              <div class="d-flex gap-3 text-sm">
                <span><i class="fas fa-calendar"></i> ${this.formatDateRange(closure.start_date, closure.end_date)}</span>
                ${closure.start_time ? `<span><i class="fas fa-clock"></i> ${closure.start_time} - ${closure.end_time}</span>` : '<span><i class="fas fa-calendar-day"></i> Todo el día</span>'}
                <span class="badge bg-${this.getClosureTypeColor(closure.closure_type)}">${this.getClosureTypeLabel(closure.closure_type)}</span>
                ${closure.is_recurring ? '<span class="badge bg-info">Anual</span>' : ''}
              </div>
            </div>
            <button class="btn btn-outline-danger btn-sm" onclick="adminPanel.deleteScheduledClosure(${closure.id})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  async saveScheduledClosure() {
    const formData = {
      title: document.getElementById('closure-title').value,
      description: document.getElementById('closure-description').value,
      start_date: document.getElementById('closure-start-date').value,
      end_date: document.getElementById('closure-end-date').value,
      start_time: document.getElementById('closure-start-time').value,
      end_time: document.getElementById('closure-end-time').value,
      closure_type: document.getElementById('closure-type').value,
      is_recurring: document.getElementById('closure-recurring').checked
    };

    if (!formData.title || !formData.start_date || !formData.end_date) {
      this.showError('Faltan campos obligatorios');
      return;
    }

    try {
      const response = await fetch('/api/admin/schedule/closures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save closure');

      this.showSuccess('Cierre programado guardado exitosamente');
      
      // Close modal and reload data
      const modal = bootstrap.Modal.getInstance(document.getElementById('addClosureModal'));
      modal.hide();
      document.getElementById('add-closure-form').reset();
      
      await this.loadScheduledClosures();
    } catch (error) {
      console.error('Error saving scheduled closure:', error);
      this.showError('Error al guardar cierre programado');
    }
  }

  async deleteScheduledClosure(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este cierre programado?')) return;

    try {
      const response = await fetch(`/api/admin/schedule/closures/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to delete closure');

      this.showSuccess('Cierre eliminado exitosamente');
      await this.loadScheduledClosures();
    } catch (error) {
      console.error('Error deleting scheduled closure:', error);
      this.showError('Error al eliminar cierre');
    }
  }

  async loadScheduleOverrides() {
    try {
      const response = await fetch('/api/admin/schedule/overrides', {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to load schedule overrides');

      const overrides = await response.json();
      this.renderScheduleOverrides(overrides);
    } catch (error) {
      console.error('Error loading schedule overrides:', error);
      this.showError('Error al cargar horarios especiales');
    }
  }

  renderScheduleOverrides(overrides) {
    const container = document.getElementById('overrides-list');
    if (!container) return;

    if (overrides.length === 0) {
      container.innerHTML = '<div class="text-center text-muted py-4">No hay horarios especiales configurados</div>';
      return;
    }

    container.innerHTML = overrides.map(override => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h6 class="card-title">${this.formatDate(override.date)} - ${override.day_of_week}</h6>
              <p class="card-text text-muted">${override.reason || 'Sin motivo especificado'}</p>
              <div class="d-flex gap-3 text-sm">
                ${override.is_open ? 
                  `<span><i class="fas fa-clock"></i> ${override.open_time} - ${override.close_time}</span>
                   ${override.break_start ? `<span><i class="fas fa-coffee"></i> Descanso: ${override.break_start} - ${override.break_end}</span>` : ''}` 
                  : '<span class="badge bg-danger">Cerrado</span>'}
              </div>
            </div>
            <button class="btn btn-outline-danger btn-sm" onclick="adminPanel.deleteScheduleOverride(${override.id})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  async saveScheduleOverride() {
    const isOpen = document.getElementById('override-is-open').checked;
    const formData = {
      date: document.getElementById('override-date').value,
      reason: document.getElementById('override-reason').value,
      is_open: isOpen,
      open_time: isOpen ? document.getElementById('override-open-time').value : null,
      close_time: isOpen ? document.getElementById('override-close-time').value : null,
      break_start: isOpen ? document.getElementById('override-break-start').value : null,
      break_end: isOpen ? document.getElementById('override-break-end').value : null
    };

    if (!formData.date) {
      this.showError('La fecha es obligatoria');
      return;
    }

    try {
      const response = await fetch('/api/admin/schedule/overrides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save override');

      this.showSuccess('Horario especial guardado exitosamente');
      
      // Close modal and reload data
      const modal = bootstrap.Modal.getInstance(document.getElementById('addOverrideModal'));
      modal.hide();
      document.getElementById('add-override-form').reset();
      
      await this.loadScheduleOverrides();
    } catch (error) {
      console.error('Error saving schedule override:', error);
      this.showError('Error al guardar horario especial');
    }
  }

  async deleteScheduleOverride(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este horario especial?')) return;

    try {
      const response = await fetch(`/api/admin/schedule/overrides/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to delete override');

      this.showSuccess('Horario especial eliminado exitosamente');
      await this.loadScheduleOverrides();
    } catch (error) {
      console.error('Error deleting schedule override:', error);
      this.showError('Error al eliminar horario especial');
    }
  }

  async loadBlockedTimeSlots() {
    try {
      const response = await fetch('/api/admin/schedule/blocked-slots', {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to load blocked time slots');

      const blockedSlots = await response.json();
      this.renderBlockedTimeSlots(blockedSlots);
    } catch (error) {
      console.error('Error loading blocked time slots:', error);
      this.showError('Error al cargar horas bloqueadas');
    }
  }

  renderBlockedTimeSlots(blockedSlots) {
    const container = document.getElementById('blocked-slots-list');
    if (!container) return;

    if (blockedSlots.length === 0) {
      container.innerHTML = '<div class="text-center text-muted py-4">No hay horas bloqueadas</div>';
      return;
    }

    // Group by date
    const groupedSlots = blockedSlots.reduce((acc, slot) => {
      const date = slot.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(slot);
      return acc;
    }, {});

    container.innerHTML = Object.entries(groupedSlots).map(([date, slots]) => `
      <div class="card mb-3">
        <div class="card-header">
          <h6 class="mb-0">${this.formatDate(date)}</h6>
        </div>
        <div class="card-body">
          ${slots.map(slot => `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
              <div>
                <span class="fw-bold">${slot.start_time} - ${slot.end_time}</span>
                <span class="badge bg-${this.getBlockTypeColor(slot.block_type)} ms-2">${this.getBlockTypeLabel(slot.block_type)}</span>
                ${slot.reason ? `<br><small class="text-muted">${slot.reason}</small>` : ''}
              </div>
              <button class="btn btn-outline-danger btn-sm" onclick="adminPanel.deleteBlockedTimeSlot(${slot.id})">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  async saveBlockedTimeSlot() {
    const formData = {
      date: document.getElementById('blocked-date').value,
      start_time: document.getElementById('blocked-start-time').value,
      end_time: document.getElementById('blocked-end-time').value,
      reason: document.getElementById('blocked-reason').value,
      block_type: document.getElementById('blocked-type').value
    };

    if (!formData.date || !formData.start_time || !formData.end_time) {
      this.showNotification('Fecha, hora inicio y hora fin son obligatorios', 'error');
      return;
    }

    try {
      const response = await fetch('/api/admin/schedule/blocked-slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save blocked slot');

      this.showSuccess('Hora bloqueada guardada exitosamente');
      
      // Close modal and reload data
      const modal = bootstrap.Modal.getInstance(document.getElementById('addBlockedSlotModal'));
      modal.hide();
      document.getElementById('add-blocked-slot-form').reset();
      
      await this.loadBlockedTimeSlots();
    } catch (error) {
      console.error('Error saving blocked time slot:', error);
      this.showError('Error al guardar hora bloqueada');
    }
  }

  async deleteBlockedTimeSlot(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta hora bloqueada?')) return;

    try {
      const response = await fetch(`/api/admin/schedule/blocked-slots/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to delete blocked slot');

      this.showSuccess('Hora bloqueada eliminada exitosamente');
      await this.loadBlockedTimeSlots();
    } catch (error) {
      console.error('Error deleting blocked time slot:', error);
      this.showError('Error al eliminar hora bloqueada');
    }
  }

  // Helper functions
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  formatDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (startDate === endDate) {
      return this.formatDate(startDate);
    }
    
    return `${start.toLocaleDateString('es-ES')} - ${end.toLocaleDateString('es-ES')}`;
  }

  getClosureTypeColor(type) {
    const colors = {
      holiday: 'success',
      vacation: 'info',
      maintenance: 'warning',
      emergency: 'danger',
      other: 'secondary'
    };
    return colors[type] || 'secondary';
  }

  getClosureTypeLabel(type) {
    const labels = {
      holiday: 'Feriado',
      vacation: 'Vacaciones',
      maintenance: 'Mantenimiento',
      emergency: 'Emergencia',
      other: 'Otro'
    };
    return labels[type] || 'Otro';
  }

  getBlockTypeColor(type) {
    const colors = {
      appointment: 'primary',
      break: 'info',
      maintenance: 'warning',
      personal: 'success',
      other: 'secondary'
    };
    return colors[type] || 'secondary';
  }

  getBlockTypeLabel(type) {
    const labels = {
      appointment: 'Cita',
      break: 'Descanso',
      maintenance: 'Mantenimiento',
      personal: 'Personal',
      other: 'Otro'
    };
    return labels[type] || 'Otro';
  }

  // =================
  // BUSINESS DAYS MANAGEMENT
  // =================

  async loadBusinessDaysConfig() {
    try {
      const response = await fetch('/api/admin/schedule/business-days', {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to load business days config');

      const businessDays = await response.json();
      this.renderBusinessDaysConfig(businessDays);
    } catch (error) {
      console.error('Error loading business days config:', error);
      this.showError('Error al cargar configuración de días');
    }
  }

  renderBusinessDaysConfig(businessDays) {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    dayNames.forEach(day => {
      const checkbox = document.getElementById(`day-${day.toLowerCase()}`);
      if (checkbox) {
        const dayConfig = businessDays.find(bd => bd.day_of_week === day);
        checkbox.checked = dayConfig ? dayConfig.is_open : false;
      }
    });

    // Add event listener for save button
    document.getElementById('save-standard-days')?.addEventListener('click', () => this.saveBusinessDaysConfig());
  }

  async saveBusinessDaysConfig() {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const days = dayNames.map(day => ({
      day_of_week: day,
      is_open: document.getElementById(`day-${day.toLowerCase()}`)?.checked || false
    }));

    try {
      const response = await fetch('/api/admin/schedule/business-days', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ days })
      });

      if (!response.ok) throw new Error('Failed to save business days');

      this.showSuccess('Configuración de días guardada exitosamente');
    } catch (error) {
      console.error('Error saving business days config:', error);
      this.showError('Error al guardar configuración de días');
    }
  }

  async loadWeekExceptions() {
    try {
      const response = await fetch('/api/admin/schedule/week-exceptions', {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to load week exceptions');

      const exceptions = await response.json();
      this.renderWeekExceptions(exceptions);
    } catch (error) {
      console.error('Error loading week exceptions:', error);
      this.showError('Error al cargar excepciones semanales');
    }
  }

  renderWeekExceptions(exceptions) {
    const container = document.getElementById('week-exceptions-list');
    if (!container) return;

    if (exceptions.length === 0) {
      container.innerHTML = '<div class="text-center text-muted py-3">No hay excepciones configuradas</div>';
      return;
    }

    container.innerHTML = exceptions.map(exception => `
      <div class="card mb-2">
        <div class="card-body py-2">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <strong>Semana del ${this.formatDate(exception.week_start_date)}</strong>
              <br><small class="text-muted">${exception.description || 'Sin descripción'}</small>
              <br><small>Días abiertos: ${exception.days_open.join(', ')}</small>
            </div>
            <button class="btn btn-outline-danger btn-sm" onclick="adminPanel.deleteWeekException(${exception.id})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Add event listeners
    document.getElementById('save-week-exception')?.addEventListener('click', () => this.saveWeekException());
  }

  async saveWeekException() {
    const formData = {
      week_start_date: document.getElementById('exception-week-start').value,
      description: document.getElementById('exception-description').value,
      days_open: Array.from(document.querySelectorAll('#exception-week-days input:checked')).map(cb => cb.value)
    };

    if (!formData.week_start_date) {
      this.showError('La fecha de inicio es obligatoria');
      return;
    }

    try {
      const response = await fetch('/api/admin/schedule/week-exceptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save week exception');

      this.showSuccess('Excepción semanal guardada exitosamente');
      
      const modal = bootstrap.Modal.getInstance(document.getElementById('addWeekExceptionModal'));
      modal.hide();
      document.getElementById('add-week-exception-form').reset();
      
      await this.loadWeekExceptions();
    } catch (error) {
      console.error('Error saving week exception:', error);
      this.showError('Error al guardar excepción semanal');
    }
  }

  async deleteWeekException(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta excepción semanal?')) return;

    try {
      const response = await fetch(`/api/admin/schedule/week-exceptions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to delete week exception');

      this.showSuccess('Excepción eliminada exitosamente');
      await this.loadWeekExceptions();
    } catch (error) {
      console.error('Error deleting week exception:', error);
      this.showError('Error al eliminar excepción');
    }
  }

  // =================
  // USER APPROVAL SYSTEM
  // =================

  async loadApprovalSettings() {
    try {
      const response = await fetch('/api/admin/approval/settings', {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to load approval settings');

      const settings = await response.json();
      this.renderApprovalSettings(settings);
    } catch (error) {
      console.error('Error loading approval settings:', error);
      this.showError('Error al cargar configuración de aprobación');
    }
  }

  renderApprovalSettings(settings) {
    document.getElementById('approval-system-enabled').checked = settings.approval_system_enabled || false;
    document.getElementById('require-approval-guests').checked = settings.require_approval_guests || false;
    document.getElementById('require-approval-first-time').checked = settings.require_approval_first_time || false;
    document.getElementById('approval-message').value = settings.approval_message || '';

    document.getElementById('save-approval-settings')?.addEventListener('click', () => this.saveApprovalSettings());
  }

  async saveApprovalSettings() {
    const formData = {
      approval_system_enabled: document.getElementById('approval-system-enabled').checked,
      require_approval_guests: document.getElementById('require-approval-guests').checked,
      require_approval_first_time: document.getElementById('require-approval-first-time').checked,
      approval_message: document.getElementById('approval-message').value
    };

    try {
      const response = await fetch('/api/admin/approval/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save approval settings');

      this.showSuccess('Configuración de aprobación guardada exitosamente');
    } catch (error) {
      console.error('Error saving approval settings:', error);
      this.showError('Error al guardar configuración de aprobación');
    }
  }

  async loadPendingUsers() {
    try {
      const response = await fetch('/api/admin/approval/pending-users', {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to load pending users');

      const users = await response.json();
      this.renderPendingUsers(users);
    } catch (error) {
      console.error('Error loading pending users:', error);
      this.showError('Error al cargar usuarios pendientes');
    }
  }

  renderPendingUsers(users) {
    const container = document.getElementById('pending-users-list');
    if (!container) return;

    if (users.length === 0) {
      container.innerHTML = '<div class="text-center text-muted py-3">No hay usuarios pendientes de aprobación</div>';
      return;
    }

    container.innerHTML = users.map(user => `
      <div class="card mb-2">
        <div class="card-body py-2">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <strong>${user.full_name}</strong>
              <br><small class="text-muted">${user.email}</small>
              ${user.phone ? `<br><small class="text-muted">${user.phone}</small>` : ''}
              <br><small class="text-muted">Solicitado: ${this.formatDate(user.requested_at)}</small>
            </div>
            <div class="btn-group">
              <button class="btn btn-success btn-sm" onclick="adminPanel.approveUser(${user.id})">
                <i class="fas fa-check"></i> Aprobar
              </button>
              <button class="btn btn-danger btn-sm" onclick="adminPanel.rejectUser(${user.id})">
                <i class="fas fa-times"></i> Rechazar
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  async approveUser(id) {
    const notes = prompt('Notas adicionales (opcional):');
    
    try {
      const response = await fetch(`/api/admin/approval/users/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ notes })
      });

      if (!response.ok) throw new Error('Failed to approve user');

      this.showSuccess('Usuario aprobado exitosamente');
      await this.loadPendingUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      this.showError('Error al aprobar usuario');
    }
  }

  async rejectUser(id) {
    const notes = prompt('Motivo del rechazo:');
    if (!notes) return;
    
    try {
      const response = await fetch(`/api/admin/approval/users/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ notes })
      });

      if (!response.ok) throw new Error('Failed to reject user');

      this.showNotification('Usuario rechazado', 'warning');
      await this.loadPendingUsers();
    } catch (error) {
      console.error('Error rejecting user:', error);
      this.showError('Error al rechazar usuario');
    }
  }

  // =================
  // ANNOUNCEMENTS MANAGEMENT
  // =================

  async loadAnnouncements() {
    try {
      const response = await fetch('/api/admin/announcements', {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to load announcements');

      const announcements = await response.json();
      this.renderAnnouncements(announcements);
    } catch (error) {
      console.error('Error loading announcements:', error);
      this.showError('Error al cargar anuncios');
    }
  }

  renderAnnouncements(announcements) {
    const container = document.getElementById('announcements-list');
    if (!container) return;

    if (announcements.length === 0) {
      container.innerHTML = '<div class="text-center text-muted py-4">No hay anuncios configurados</div>';
      return;
    }

    container.innerHTML = announcements.map(announcement => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
              <div class="d-flex align-items-center mb-2">
                <h6 class="card-title mb-0">${announcement.title}</h6>
                <span class="badge bg-${this.getAnnouncementTypeColor(announcement.type)} ms-2">${this.getAnnouncementTypeLabel(announcement.type)}</span>
                <span class="badge bg-${this.getAnnouncementPriorityColor(announcement.priority)} ms-1">${this.getAnnouncementPriorityLabel(announcement.priority)}</span>
                ${announcement.is_active ? '<span class="badge bg-success ms-1">Activo</span>' : '<span class="badge bg-secondary ms-1">Inactivo</span>'}
              </div>
              <p class="card-text text-muted mb-2">${announcement.content}</p>
              <div class="d-flex gap-3 text-sm">
                <span><i class="fas fa-calendar"></i> ${this.formatDateRange(announcement.start_date, announcement.end_date)}</span>
                <span><i class="fas fa-user"></i> ${announcement.created_by_name}</span>
              </div>
            </div>
            <div class="btn-group">
              <button class="btn btn-outline-primary btn-sm" onclick="adminPanel.editAnnouncement(${announcement.id})">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-outline-danger btn-sm" onclick="adminPanel.deleteAnnouncement(${announcement.id})">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    // Add event listener for save button
    document.getElementById('save-announcement')?.addEventListener('click', () => this.saveAnnouncement());
  }

  async deleteAnnouncement(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este anuncio?')) return;

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

  // Helper functions for announcements
  getAnnouncementTypeColor(type) {
    const colors = { info: 'info', warning: 'warning', success: 'success', urgent: 'danger' };
    return colors[type] || 'secondary';
  }

  getAnnouncementTypeLabel(type) {
    const labels = { info: 'Información', warning: 'Advertencia', success: 'Buenas Noticias', urgent: 'Urgente' };
    return labels[type] || 'Otro';
  }

  getAnnouncementPriorityColor(priority) {
    const colors = { low: 'secondary', normal: 'primary', high: 'warning' };
    return colors[priority] || 'secondary';
  }

  getAnnouncementPriorityLabel(priority) {
    const labels = { low: 'Baja', normal: 'Normal', high: 'Alta' };
    return labels[priority] || 'Normal';
  }

  // =================
  // NEW SCHEDULE FUNCTIONALITY
  // =================

  async loadBusinessDayExceptions() {
    try {
      const response = await fetch('/api/admin/schedule/closures', {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to load business day exceptions');

      const exceptions = await response.json();
      this.renderBusinessDayExceptions(exceptions);
    } catch (error) {
      console.error('Error loading business day exceptions:', error);
      this.showError('Error al cargar excepciones de días laborales');
    }
  }

  renderBusinessDayExceptions(exceptions) {
    const container = document.getElementById('business-day-exceptions-list');
    if (!container) return;

    if (exceptions.length === 0) {
      container.innerHTML = '<div class="text-center text-muted py-4">No hay excepciones programadas</div>';
      return;
    }

    container.innerHTML = exceptions.map(exception => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h6 class="card-title">${exception.title}</h6>
              <p class="card-text text-muted">${exception.description || 'Sin descripción'}</p>
              <div class="d-flex gap-3 text-sm">
                <span><i class="fas fa-calendar"></i> ${this.formatDateRange(exception.start_date, exception.end_date)}</span>
                <span class="badge bg-${this.getClosureTypeColor(exception.closure_type)}">${this.getClosureTypeLabel(exception.closure_type)}</span>
                ${exception.is_recurring ? '<span class="badge bg-info">Anual</span>' : ''}
              </div>
            </div>
            <button class="btn btn-outline-danger btn-sm" onclick="adminPanel.deleteBusinessDayException(${exception.id})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  async saveBusinessDayException() {
    const scheduleAdjustment = document.querySelector('input[name="schedule-adjustment"]:checked').value;
    
    const formData = {
      title: document.getElementById('exception-title').value,
      description: document.getElementById('exception-description').value,
      start_date: document.getElementById('exception-start-date').value,
      end_date: document.getElementById('exception-end-date').value,
      closure_type: scheduleAdjustment === 'closed' ? 'closed' : 'custom_hours',
      is_recurring: document.getElementById('exception-recurring').checked
    };

    // Add custom hours if selected
    if (scheduleAdjustment === 'custom') {
      formData.custom_open_time = document.getElementById('custom-open-time').value;
      formData.custom_close_time = document.getElementById('custom-close-time').value;
      
      if (!formData.custom_open_time || !formData.custom_close_time) {
        this.showError('Debe especificar horarios de apertura y cierre para horario personalizado');
        return;
      }
    }

    if (!formData.title || !formData.start_date || !formData.end_date) {
      this.showError('Faltan campos obligatorios');
      return;
    }

    try {
      const response = await fetch('/api/admin/schedule/closures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save business day exception');

      this.showSuccess('Ajuste de horario guardado exitosamente');
      
      // Close modal and reload data
      const modal = bootstrap.Modal.getInstance(document.getElementById('addBusinessDayExceptionModal'));
      modal.hide();
      document.getElementById('add-business-day-exception-form').reset();
      // Reset radio buttons and hide custom hours section
      document.getElementById('closed-all-day').checked = true;
      document.getElementById('custom-hours-section').style.display = 'none';
      
      await this.loadBusinessDayExceptions();
    } catch (error) {
      console.error('Error saving business day exception:', error);
      this.showError('Error al guardar la excepción');
    }
  }

  async deleteBusinessDayException(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta excepción?')) return;

    try {
      const response = await fetch(`/api/admin/schedule/closures/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to delete business day exception');

      this.showSuccess('Excepción eliminada exitosamente');
      await this.loadBusinessDayExceptions();
    } catch (error) {
      console.error('Error deleting business day exception:', error);
      this.showError('Error al eliminar la excepción');
    }
  }

  initTemporaryHoursToggle() {
    const toggle = document.getElementById('temporary-hours-enabled');
    const rangeDiv = document.getElementById('temporary-hours-range');
    
    if (toggle && rangeDiv) {
      toggle.addEventListener('change', function() {
        rangeDiv.style.display = this.checked ? 'block' : 'none';
      });
    }
  }

  async initWeekSelector() {
    const weekSelector = document.getElementById('exception-week-selector');
    if (weekSelector) {
      // Set current week as default
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
      const year = startOfWeek.getFullYear();
      const week = this.getWeekNumber(startOfWeek);
      weekSelector.value = `${year}-W${week.toString().padStart(2, '0')}`;
      
      weekSelector.addEventListener('change', () => {
        this.loadWeekExceptionsForWeek(weekSelector.value);
      });
      
      // Load current week exceptions
      this.loadWeekExceptionsForWeek(weekSelector.value);
    }
  }

  getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  async loadWeekExceptionsForWeek(weekValue) {
    try {
      const response = await fetch(`/api/admin/schedule/week-exceptions?week=${weekValue}`, {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to load week exceptions');

      const exceptions = await response.json();
      this.renderWeekExceptions(exceptions);
    } catch (error) {
      console.error('Error loading week exceptions:', error);
      this.showError('Error al cargar excepciones de la semana');
    }
  }

  renderWeekExceptions(exceptions) {
    const container = document.getElementById('week-exceptions-container');
    if (!container) return;

    if (exceptions.length === 0) {
      container.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="fas fa-calendar-check fa-3x mb-3"></i>
          <p>No hay excepciones para esta semana</p>
          <button class="btn btn-outline-primary" onclick="adminPanel.addWeekException()">
            <i class="fas fa-plus"></i> Agregar Primera Excepción
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = exceptions.map(exception => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="row">
            <div class="col-md-8">
              <h6>${exception.day_name} - ${this.formatDate(exception.date)}</h6>
              <p class="text-muted">${exception.reason || 'Sin motivo especificado'}</p>
              ${exception.is_open ? 
                `<small><i class="fas fa-clock"></i> ${exception.open_time} - ${exception.close_time}</small>` 
                : '<small class="badge bg-danger">Cerrado</small>'}
            </div>
            <div class="col-md-4 text-end">
              <button class="btn btn-outline-primary btn-sm me-2" data-action="edit-week-exception" data-exception-id="${exception.id}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-outline-danger btn-sm" data-action="delete-week-exception" data-exception-id="${exception.id}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  async loadPendingAppointmentsManagement() {
    try {
      const response = await fetch('/api/admin/appointments?status=pending', {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      });

      if (!response.ok) throw new Error('Failed to load pending appointments');

      const data = await response.json();
      this.renderPendingAppointmentsManagement(data.appointments || data);
    } catch (error) {
      console.error('Error loading pending appointments:', error);
      this.showError('Error al cargar citas pendientes');
    }
  }

  renderPendingAppointmentsManagement(appointments) {
    const container = document.getElementById('pending-appointments-container');
    if (!container) return;

    if (appointments.length === 0) {
      container.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="fas fa-calendar-check fa-3x mb-3"></i>
          <p>No hay citas pendientes</p>
        </div>
      `;
      return;
    }

    container.innerHTML = appointments.map(apt => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-4">
              <h6 class="mb-1">${apt.name}</h6>
              <small class="text-muted">
                <i class="fas fa-envelope"></i> ${apt.email || 'Sin email'}<br>
                <i class="fas fa-phone"></i> ${apt.phone || 'Sin teléfono'}
              </small>
            </div>
            <div class="col-md-3">
              <strong>${this.formatDate(apt.appointment_date)}</strong><br>
              <small class="text-muted">${apt.appointment_time}</small>
            </div>
            <div class="col-md-2">
              <span class="badge bg-warning">Pendiente</span>
            </div>
            <div class="col-md-3">
              <div class="btn-group" role="group">
                <button class="btn btn-success btn-sm" onclick="adminPanel.approveAppointment(${apt.id})" title="Aprobar">
                  <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-primary btn-sm" onclick="adminPanel.rescheduleAppointment(${apt.id})" title="Reagendar">
                  <i class="fas fa-calendar-alt"></i>
                </button>
                <button class="btn btn-info btn-sm" onclick="adminPanel.contactClient(${apt.id})" title="Contactar">
                  <i class="fas fa-phone"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="adminPanel.cancelAppointment(${apt.id})" title="Cancelar">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Action methods for pending appointments
  async approveAppointment(appointmentId) {
    if (!confirm('¿Confirmar esta cita?')) return;

    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ status: 'confirmed' })
      });

      if (!response.ok) throw new Error('Error approving appointment');

      this.showSuccess('Cita aprobada exitosamente');
      await this.loadPendingAppointmentsManagement();
    } catch (error) {
      console.error('Error approving appointment:', error);
      this.showError('Error al aprobar la cita');
    }
  }

  async cancelAppointment(appointmentId) {
    if (!confirm('¿Cancelar esta cita?')) return;

    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ status: 'cancelled' })
      });

      if (!response.ok) throw new Error('Error cancelling appointment');

      this.showSuccess('Cita cancelada exitosamente');
      await this.loadPendingAppointmentsManagement();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      this.showError('Error al cancelar la cita');
    }
  }

  rescheduleAppointment(appointmentId) {
    // This could open a modal or redirect to edit appointment
    this.editAppointment(appointmentId);
  }

  contactClient(appointmentId) {
    // This could show contact options (phone, email, SMS)
    alert('Función de contacto en desarrollo. Use los datos mostrados para contactar al cliente.');
  }

  addWeekException() {
    // Initialize the enhanced week exception modal
    this.initializeWeekExceptionModal();
  }

  initializeWeekExceptionModal() {
    // Set up event listeners for the enhanced modal
    const modal = document.getElementById('addWeekExceptionModal');
    
    // Exception type toggle
    const typeClosureRadio = document.getElementById('type-closure');
    const typeScheduleRadio = document.getElementById('type-schedule');
    const closureMode = document.getElementById('closure-mode');
    const scheduleMode = document.getElementById('schedule-mode');

    // Toggle between closure and schedule modes
    const toggleExceptionMode = () => {
      if (typeClosureRadio.checked) {
        closureMode.classList.remove('d-none');
        scheduleMode.classList.add('d-none');
      } else {
        closureMode.classList.add('d-none');
        scheduleMode.classList.remove('d-none');
      }
    };

    typeClosureRadio.addEventListener('change', toggleExceptionMode);
    typeScheduleRadio.addEventListener('change', toggleExceptionMode);

    // Schedule configuration toggles
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
      const enableToggle = document.getElementById(`schedule-${day}-enable`);
      const scheduleConfig = document.getElementById(`${day}-schedule`);
      const closedCheckbox = document.getElementById(`${day}-closed`);
      const hoursInputs = document.getElementById(`${day}-hours`);

      // Toggle schedule configuration visibility
      enableToggle?.addEventListener('change', () => {
        if (enableToggle.checked) {
          scheduleConfig.classList.remove('d-none');
        } else {
          scheduleConfig.classList.add('d-none');
          // Reset form values when disabled
          this.resetDaySchedule(day);
        }
      });

      // Toggle hours inputs when closed checkbox is changed
      closedCheckbox?.addEventListener('change', () => {
        if (closedCheckbox.checked) {
          hoursInputs.classList.add('closed-day');
          // Clear time inputs
          ['open', 'close', 'break-start', 'break-end'].forEach(timeType => {
            const input = document.getElementById(`${day}-${timeType}`);
            if (input) input.value = '';
          });
        } else {
          hoursInputs.classList.remove('closed-day');
          // Set default hours
          this.setDefaultHours(day);
        }
      });
    });

    // Save button handler
    const saveButton = document.getElementById('save-week-exception');
    saveButton.onclick = () => this.saveWeekException();

    // Reset modal when opened
    modal.addEventListener('show.bs.modal', () => {
      this.resetWeekExceptionModal();
    });
  }

  resetDaySchedule(day) {
    const closedCheckbox = document.getElementById(`${day}-closed`);
    if (closedCheckbox) closedCheckbox.checked = false;
    
    ['open', 'close', 'break-start', 'break-end'].forEach(timeType => {
      const input = document.getElementById(`${day}-${timeType}`);
      if (input) input.value = '';
    });
  }

  setDefaultHours(day) {
    // Set default business hours (you can customize these)
    const defaultHours = {
      open: '09:00',
      close: '18:00',
      'break-start': '13:00',
      'break-end': '14:00'
    };

    Object.keys(defaultHours).forEach(timeType => {
      const input = document.getElementById(`${day}-${timeType}`);
      if (input) input.value = defaultHours[timeType];
    });
  }

  resetWeekExceptionModal() {
    // Reset form
    document.getElementById('add-week-exception-form').reset();
    
    // Reset to closure mode
    document.getElementById('type-closure').checked = true;
    document.getElementById('closure-mode').classList.remove('d-none');
    document.getElementById('schedule-mode').classList.add('d-none');

    // Reset all schedule configurations
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(day => {
      const enableToggle = document.getElementById(`schedule-${day}-enable`);
      const scheduleConfig = document.getElementById(`${day}-schedule`);
      
      if (enableToggle) enableToggle.checked = false;
      if (scheduleConfig) scheduleConfig.classList.add('d-none');
      
      this.resetDaySchedule(day);
    });

    // Set default week start date to next Monday
    const nextMonday = this.getNextMonday();
    document.getElementById('exception-week-start').value = nextMonday;
  }

  getNextMonday() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split('T')[0];
  }

  async saveWeekException() {
    try {
      const weekStart = document.getElementById('exception-week-start').value;
      const description = document.getElementById('exception-description').value;
      const exceptionType = document.querySelector('input[name="exception-type"]:checked').value;

      if (!weekStart) {
        this.showError('Por favor seleccione la fecha de inicio de la semana');
        return;
      }

      let exceptionData = {
        week_start: weekStart,
        description: description || 'Excepción semanal',
        type: exceptionType,
        days: {}
      };

      if (exceptionType === 'closure') {
        // Collect closure data
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        days.forEach(day => {
          const checkbox = document.getElementById(`closure-${day}`);
          if (checkbox && checkbox.checked) {
            exceptionData.days[day] = { closed: true };
          }
        });
      } else {
        // Collect schedule data
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        days.forEach(day => {
          const enableToggle = document.getElementById(`schedule-${day}-enable`);
          if (enableToggle && enableToggle.checked) {
            const closedCheckbox = document.getElementById(`${day}-closed`);
            
            if (closedCheckbox && closedCheckbox.checked) {
              exceptionData.days[day] = { closed: true };
            } else {
              exceptionData.days[day] = {
                closed: false,
                open_time: document.getElementById(`${day}-open`).value,
                close_time: document.getElementById(`${day}-close`).value,
                break_start: document.getElementById(`${day}-break-start`).value,
                break_end: document.getElementById(`${day}-break-end`).value
              };
            }
          }
        });
      }

      const response = await fetch('/api/admin/schedule/week-exceptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(exceptionData)
      });

      if (!response.ok) throw new Error('Error saving week exception');

      this.showSuccess('Excepción semanal guardada correctamente');
      
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('addWeekExceptionModal'));
      modal.hide();

      // Refresh the week exceptions list
      this.loadWeekExceptions();

    } catch (error) {
      console.error('Error saving week exception:', error);
      this.showError('Error guardando la excepción semanal');
    }
  }

  searchPendingAppointments() {
    const query = document.getElementById('pending-search')?.value;
    if (query) {
      // Implement search functionality
      console.log('Searching for:', query);
    }
  }

  filterPendingAppointments() {
    const filter = document.getElementById('pending-date-filter')?.value;
    if (filter) {
      // Implement filter functionality
      console.log('Filtering by:', filter);
    }
  }

  refreshPendingAppointments() {
    this.loadPendingAppointmentsManagement();
  }

  // === SETTINGS METHODS ===

  // Day Closing Management
  async addDayClosing() {
    try {
      const date = document.getElementById('closing-date').value;
      const reason = document.getElementById('closing-reason').value;
      const notifyClients = document.getElementById('notify-clients').checked;

      if (!date) {
        alert('Por favor seleccione una fecha');
        return;
      }

      const response = await fetch('/api/admin/settings/day-closings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          date,
          reason: reason || 'Cierre programado',
          notify_clients: notifyClients
        })
      });

      if (!response.ok) throw new Error('Error adding day closing');

      alert('Cierre programado exitosamente');
      this.loadScheduledClosings();
      document.getElementById('day-closing-form').reset();

    } catch (error) {
      console.error('Error adding day closing:', error);
      alert('Error al programar el cierre');
    }
  }

  async changeClosingTime() {
    try {
      const date = document.getElementById('closing-change-date').value;
      const newTime = document.getElementById('new-closing-time').value;
      const reason = document.getElementById('closing-change-reason').value;

      if (!date || !newTime) {
        alert('Por favor complete todos los campos requeridos');
        return;
      }

      const response = await fetch('/api/admin/settings/closing-time-changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          date,
          new_closing_time: newTime,
          reason: reason || 'Cambio de horario'
        })
      });

      if (!response.ok) throw new Error('Error changing closing time');

      alert('Hora de cierre cambiada exitosamente');
      this.loadScheduledClosings();
      document.getElementById('closing-time-form').reset();

    } catch (error) {
      console.error('Error changing closing time:', error);
      alert('Error al cambiar la hora de cierre');
    }
  }

  async loadScheduledClosings() {
    try {
      const response = await fetch('/api/admin/schedule/closures', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Error loading scheduled closings');

      const data = await response.json();
      this.displayScheduledClosings(data.closings);

    } catch (error) {
      console.error('Error loading scheduled closings:', error);
    }
  }

  displayScheduledClosings(closings) {
    const container = document.getElementById('scheduled-closings-list');
    
    if (!closings || closings.length === 0) {
      container.innerHTML = '<p class="text-muted">No hay cierres programados</p>';
      return;
    }

    container.innerHTML = closings.map(closing => `
      <div class="card mb-2">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-1">${this.formatDate(closing.date)}</h6>
              <small class="text-muted">${closing.reason}</small>
              ${closing.type === 'time_change' ? `<br><small class="text-info">Nueva hora de cierre: ${closing.new_closing_time}</small>` : ''}
            </div>
            <div>
              <button class="btn btn-sm btn-outline-danger" onclick="adminPanel.removeScheduledClosing(${closing.id})">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  async removeScheduledClosing(closingId) {
    if (!confirm('¿Está seguro de que desea eliminar este cierre programado?')) return;

    try {
      const response = await fetch(`/api/admin/schedule/closures/${closingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Error removing scheduled closing');

      alert('Cierre eliminado exitosamente');
      this.loadScheduledClosings();

    } catch (error) {
      console.error('Error removing scheduled closing:', error);
      alert('Error al eliminar el cierre');
    }
  }

  // Hours Exceptions Management
  async addHoursException() {
    try {
      const startDate = document.getElementById('exception-start-date').value;
      const endDate = document.getElementById('exception-end-date').value;
      const blockStart = document.getElementById('exception-block-start').value;
      const blockEnd = document.getElementById('exception-block-end').value;
      const reason = document.getElementById('exception-reason').value;

      if (!startDate || !blockStart || !blockEnd) {
        alert('Por favor complete todos los campos requeridos (fecha inicial, hora inicio y hora fin)');
        return;
      }

      // Validate time range
      if (blockStart >= blockEnd) {
        alert('La hora de inicio debe ser anterior a la hora de fin');
        return;
      }

      // Determine exception type based on whether end date is provided
      const exceptionType = endDate ? 'date_range' : 'single_day';
      const finalEndDate = endDate || startDate;

      const response = await fetch('/api/admin/schedule-exceptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          exception_type: exceptionType,
          start_date: startDate,
          end_date: finalEndDate,
          is_closed: false, // We're blocking specific hours, not closing completely
          custom_open_time: blockStart,
          custom_close_time: blockEnd,
          reason: reason || 'Horario bloqueado',
          description: `Bloqueo de horario: ${blockStart} - ${blockEnd}${endDate ? ` (${startDate} a ${endDate})` : ` (${startDate})`}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear la excepción de horario');
      }

      const dateRange = endDate ? `${startDate} a ${endDate}` : startDate;
      alert(`Excepción de horario creada exitosamente:\n${dateRange} de ${blockStart} a ${blockEnd}`);
      
      // Reset form
      document.getElementById('hours-exception-form').reset();
      
      // Reload exceptions list
      this.loadHoursExceptions();

    } catch (error) {
      console.error('Error adding hours exception:', error);
      alert('Error al crear la excepción de horario: ' + error.message);
    }
  }

  consolidateTimeSlots(slots) {
    if (slots.length === 0) return [];
    
    // Sort slots by start time
    slots.sort((a, b) => a.start.localeCompare(b.start));
    
    const ranges = [];
    let currentRange = { start: slots[0].start, end: slots[0].end };
    
    for (let i = 1; i < slots.length; i++) {
      const slot = slots[i];
      
      // If this slot starts exactly when the current range ends, extend the range
      if (slot.start === currentRange.end) {
        currentRange.end = slot.end;
      } else {
        // Gap found, finish current range and start a new one
        ranges.push(currentRange);
        currentRange = { start: slot.start, end: slot.end };
      }
    }
    
    // Add the last range
    ranges.push(currentRange);
    return ranges;
  }

  async loadHoursExceptions() {
    try {
      const response = await fetch('/api/admin/schedule/overrides', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Error loading hours exceptions');

      const data = await response.json();
      this.displayHoursExceptions(data.exceptions || data);

    } catch (error) {
      console.error('Error loading hours exceptions:', error);
      this.showError('Error al cargar excepciones de horario');
    }
  }

  displayHoursExceptions(exceptions) {
    const container = document.getElementById('hours-exceptions-list');
    if (!container) {
      console.warn('Hours exceptions container not found');
      return;
    }

    if (!exceptions || exceptions.length === 0) {
      container.innerHTML = '<div class="text-center text-muted py-4">No hay excepciones de horario configuradas</div>';
      return;
    }

    container.innerHTML = exceptions.map(exception => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="row">
            <div class="col-md-8">
              <h6>${this.formatDate(exception.date)} - ${exception.day_of_week || 'Día especial'}</h6>
              <p class="text-muted">${exception.reason || 'Sin motivo especificado'}</p>
              ${exception.is_open ? 
                `<small><i class="fas fa-clock"></i> ${exception.open_time} - ${exception.close_time}</small>
                 ${exception.break_start ? `<br><small><i class="fas fa-coffee"></i> Descanso: ${exception.break_start} - ${exception.break_end}</small>` : ''}` 
                : '<small class="badge bg-danger">Cerrado</small>'}
            </div>
            <div class="col-md-4 text-end">
              <button class="btn btn-outline-primary btn-sm me-2" data-action="edit-hours-exception" data-exception-id="${exception.id}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-outline-danger btn-sm" data-action="delete-hours-exception" data-exception-id="${exception.id}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  displayScheduleExceptionsList(exceptions, containerId = 'hours-exceptions-list') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Schedule exceptions container '${containerId}' not found`);
      return;
    }

    if (!exceptions || exceptions.length === 0) {
      container.innerHTML = '<div class="text-center text-muted py-4">No hay excepciones programadas</div>';
      return;
    }

    container.innerHTML = exceptions.map(exception => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="row">
            <div class="col-md-8">
              <h6>${this.formatDate(exception.date)} - ${exception.day_of_week || 'Día especial'}</h6>
              <p class="text-muted">${exception.reason || 'Sin motivo especificado'}</p>
              ${exception.is_open ? 
                `<small><i class="fas fa-clock"></i> ${exception.open_time} - ${exception.close_time}</small>
                 ${exception.break_start ? `<br><small><i class="fas fa-coffee"></i> Descanso: ${exception.break_start} - ${exception.break_end}</small>` : ''}` 
                : '<small class="badge bg-danger">Cerrado</small>'}
            </div>
            <div class="col-md-4 text-end">
              <button class="btn btn-outline-primary btn-sm me-2" data-action="edit-schedule-exception" data-exception-id="${exception.id}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-outline-danger btn-sm" data-action="delete-schedule-exception" data-exception-id="${exception.id}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Hours Exceptions Management
  async addHoursException() {
    // Implementation to add hours exception
    try {
      // Add your implementation here
      console.log('Add hours exception functionality');
    } catch (error) {
      console.error('Error adding hours exception:', error);
      this.showError('Error al agregar excepción de horario');
    }
  }

  async editHoursException(exceptionId) {
    // Implementation to edit hours exception
    try {
      console.log('Edit hours exception:', exceptionId);
      // Add your implementation here
    } catch (error) {
      console.error('Error editing hours exception:', error);
      this.showError('Error al editar excepción de horario');
    }
  }

  consolidateTimeSlots(slots) {
    // Implementation to consolidate time slots
    return slots;
  }

  async removeHoursException(exceptionId) {
    if (!confirm('¿Está seguro de que desea eliminar esta excepción de horario?')) return;

    try {
      const response = await fetch(`/api/admin/schedule/overrides/${exceptionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Error removing hours exception');

      alert('Excepción eliminada exitosamente');
      this.loadHoursExceptions();

    } catch (error) {
      console.error('Error removing hours exception:', error);
      alert('Error al eliminar la excepción');
    }
  }

  // User Approvals Management
  async loadPendingUsers() {
    try {
      const response = await fetch('/api/admin/approval/pending-users', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Error loading pending users');

      const data = await response.json();
      this.displayPendingUsers(data.users);

    } catch (error) {
      console.error('Error loading pending users:', error);
    }
  }

  displayPendingUsers(users) {
    const container = document.getElementById('pending-users-list');
    
    // Check if container exists (feature might not be implemented in UI)
    if (!container) {
      console.log('Pending users container not found - feature not implemented in UI');
      return;
    }
    
    if (!users || users.length === 0) {
      container.innerHTML = '<p class="text-muted">No hay usuarios pendientes de aprobación</p>';
      return;
    }

    container.innerHTML = users.map(user => `
      <div class="card mb-2">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-1">${user.name}</h6>
              <small class="text-muted">${user.email}</small>
              <br><small class="text-info">Registrado: ${this.formatDate(user.created_at)}</small>
            </div>
            <div class="btn-group">
              <button class="btn btn-sm btn-success" onclick="adminPanel.approveUser(${user.id})">
                <i class="fas fa-check"></i> Aprobar
              </button>
              <button class="btn btn-sm btn-danger" onclick="adminPanel.rejectUser(${user.id})">
                <i class="fas fa-times"></i> Rechazar
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  async approveUser(userId) {
    try {
      const response = await fetch(`/api/admin/settings/users/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Error approving user');

      alert('Usuario aprobado exitosamente');
      this.loadPendingUsers();
      this.loadRecentApprovals();

    } catch (error) {
      console.error('Error approving user:', error);
      alert('Error al aprobar el usuario');
    }
  }

  async rejectUser(userId) {
    if (!confirm('¿Está seguro de que desea rechazar este usuario?')) return;

    try {
      const response = await fetch(`/api/admin/settings/users/${userId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Error rejecting user');

      alert('Usuario rechazado');
      this.loadPendingUsers();

    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('Error al rechazar el usuario');
    }
  }

  async saveApprovalSettings() {
    try {
      const requireApproval = document.getElementById('require-approval').checked;
      const autoApproveRegulars = document.getElementById('auto-approve-regulars').checked;
      const notificationEmail = document.getElementById('approval-notification-email').value;

      const response = await fetch('/api/admin/settings/approval-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          require_approval: requireApproval,
          auto_approve_regulars: autoApproveRegulars,
          notification_email: notificationEmail
        })
      });

      if (!response.ok) throw new Error('Error saving approval settings');

      alert('Configuración de aprobaciones guardada exitosamente');

    } catch (error) {
      console.error('Error saving approval settings:', error);
      alert('Error al guardar la configuración');
    }
  }

  async loadRecentApprovals() {
    try {
      const response = await fetch('/api/admin/approval/recent', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Error loading recent approvals');

      const data = await response.json();
      this.displayRecentApprovals(data.approvals);

    } catch (error) {
      console.error('Error loading recent approvals:', error);
    }
  }

  displayRecentApprovals(approvals) {
    const container = document.getElementById('recent-approvals-list');
    
    // Check if container exists (feature might not be implemented in UI)
    if (!container) {
      console.log('Recent approvals container not found - feature not implemented in UI');
      return;
    }
    
    if (!approvals || approvals.length === 0) {
      container.innerHTML = '<p class="text-muted">No hay aprobaciones recientes</p>';
      return;
    }

    container.innerHTML = approvals.map(approval => `
      <div class="card mb-2">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-1">${approval.user_name}</h6>
              <small class="text-muted">${approval.user_email}</small>
            </div>
            <div>
              <span class="badge bg-${approval.status === 'approved' ? 'success' : 'danger'}">
                ${approval.status === 'approved' ? 'Aprobado' : 'Rechazado'}
              </span>
              <br><small class="text-muted">${this.formatDate(approval.approved_at)}</small>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  initializeSMSTabListeners() {
    // Only initialize once to prevent duplicate listeners
    if (this.initializedTabListeners.sms) {
      console.log('SMS tab listeners already initialized');
      return;
    }
    
    // Add event listeners for SMS management tabs
    const userVerificationTab = document.getElementById('user-verification-tab');
    const sendRemindersTab = document.getElementById('send-reminders-tab');
    
    if (userVerificationTab) {
      userVerificationTab.addEventListener('shown.bs.tab', async () => {
        console.log('User verification tab activated');
        await this.loadUserVerification();
      });
    }
    
    if (sendRemindersTab) {
      sendRemindersTab.addEventListener('shown.bs.tab', async () => {
        console.log('Send reminders tab activated');
        // Initialize send reminders functionality
        this.initializeSendReminders();
      });
    }
    
    this.initializedTabListeners.sms = true;
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
      this.showNotification('Por favor complete los campos requeridos', 'error');
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
        this.showNotification('Día cerrado agregado exitosamente', 'success');
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
      this.showNotification('Error al agregar día cerrado', 'error');
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
      this.showNotification('Por favor complete los campos requeridos', 'error');
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
        this.showNotification('Por favor especifique las horas personalizadas', 'error');
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
        this.showNotification('Día cerrado agregado exitosamente', 'success');
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
      this.showNotification('Error al agregar día cerrado', 'error');
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
          'Authorization': `Bearer ${localStorage.getItem('user_token') || localStorage.getItem('token')}`
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
          'Authorization': `Bearer ${localStorage.getItem('user_token') || localStorage.getItem('token')}`
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

  // New methods for scheduled business hours functionality
  initScheduleEventListeners() {
    // Preview button handler
    const previewBtn = document.getElementById('preview-schedule-btn');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.showSchedulePreview());
    }

    // Save button handler for scheduled changes
    const saveBtn = document.getElementById('save-business-hours');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveScheduledBusinessHours());
    }
  }

  async showSchedulePreview() {
    const effectiveDate = document.getElementById('schedule-effective-date')?.value;
    if (!effectiveDate) {
      this.showNotification('Por favor selecciona una fecha efectiva', 'error');
      return;
    }

    // Collect current form data
    const scheduleData = this.collectBusinessHoursData();
    
    // Show preview modal or section
    this.displaySchedulePreview(scheduleData, effectiveDate);
  }

  collectBusinessHoursData() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const scheduleData = [];

    days.forEach(day => {
      const dayLower = day.toLowerCase();
      const toggle = document.getElementById(`${dayLower}-toggle`);
      const openTime = document.getElementById(`${dayLower}-open`);
      const closeTime = document.getElementById(`${dayLower}-close`);
      const breakStart = document.getElementById(`${dayLower}-break-start`);
      const breakEnd = document.getElementById(`${dayLower}-break-end`);

      const isOpen = toggle?.checked || false;
      
      scheduleData.push({
        day_of_week: day,
        is_open: isOpen,
        open_time: isOpen ? (openTime?.value || '') : null,
        close_time: isOpen ? (closeTime?.value || '') : null,
        break_start: isOpen ? (breakStart?.value || null) : null,
        break_end: isOpen ? (breakEnd?.value || null) : null
      });
    });

    return scheduleData;
  }

  displaySchedulePreview(scheduleData, effectiveDate) {
    // Create preview content
    const previewContent = this.generatePreviewHTML(scheduleData, effectiveDate);
    
    // Show in a modal or alert
    const previewModal = document.createElement('div');
    previewModal.className = 'modal fade';
    previewModal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Vista Previa del Horario</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            ${previewContent}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            <button type="button" class="btn btn-success" onclick="window.adminPanel.saveScheduledBusinessHours()" data-bs-dismiss="modal">
              Confirmar y Guardar
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(previewModal);
    const modal = new bootstrap.Modal(previewModal);
    modal.show();
    
    // Remove modal from DOM when hidden
    previewModal.addEventListener('hidden.bs.modal', () => {
      document.body.removeChild(previewModal);
    });
  }

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
        this.showNotification('Por favor selecciona una fecha efectiva', 'error');
        return;
      }

      // Validate schedule data
      if (!this.validateScheduleData(scheduleData)) {
        this.showNotification('Por favor verifica los horarios ingresados', 'error');
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
        this.showNotification('Horarios programados guardados exitosamente', 'success');
        
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
      this.showNotification('Error al guardar los horarios programados', 'error');
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

// Global function for backward compatibility with inline onclick handlers
function showSection(section) {
  if (window.adminPanel && window.adminPanel.switchSection) {
    window.adminPanel.switchSection(section);
  } else {
    console.error('AdminPanel not initialized');
  }
}

// ==================== APPOINTMENT APPROVAL & USER VERIFICATION FUNCTIONS ====================

// Function to display pending appointments
async function displayPendingAppointments() {
  try {
    const response = await fetch('/api/admin/appointments/pending', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('user_token') || localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const appointments = await response.json();
    
    const container = document.getElementById('pending-appointments');
    if (!container) {
      console.error('Pending appointments container not found');
      return;
    }
    
    container.innerHTML = '';
    
    if (appointments.length === 0) {
      container.innerHTML = '<p>No hay citas pendientes de aprobación.</p>';
      return;
    }
    
    appointments.forEach(appointment => {
      const appointmentDiv = document.createElement('div');
      appointmentDiv.className = 'appointment-item';
      appointmentDiv.innerHTML = `
        <div class="appointment-details">
          <h4>Cita #${appointment.id}</h4>
          <p><strong>Cliente:</strong> ${appointment.user_name}</p>
          <p><strong>Email:</strong> ${appointment.email}</p>
          <p><strong>Teléfono:</strong> ${appointment.phone || 'No especificado'}</p>
          <p><strong>Fecha:</strong> ${appointment.appointment_date}</p>
          <p><strong>Hora:</strong> ${appointment.appointment_time}</p>
          <p><strong>Servicio:</strong> ${appointment.service}</p>
          <p><strong>Notas:</strong> ${appointment.notes || 'Sin notas'}</p>
          <p><strong>Fecha de solicitud:</strong> ${new Date(appointment.created_at).toLocaleString()}</p>
        </div>
        <div class="appointment-actions">
          <button class="btn-approve" onclick="approveAppointment(${appointment.id})">
            Aprobar y Enviar SMS
          </button>
          <button class="btn-reject" onclick="rejectAppointment(${appointment.id})">
            Rechazar
          </button>
        </div>
      `;
      
      container.appendChild(appointmentDiv);
    });
    
  } catch (error) {
    console.error('Error loading pending appointments:', error);
    const container = document.getElementById('pending-appointments');
    if (container) {
      container.innerHTML = '<p>Error al cargar las citas pendientes.</p>';
    }
  }
}

// Function to approve an appointment
async function approveAppointment(appointmentId) {
  try {
    const response = await fetch(`/api/admin/appointments/${appointmentId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('user_token') || localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Show success message
    showNotification('Cita aprobada y SMS enviado exitosamente', 'success');
    
    // Refresh the pending appointments list
    displayPendingAppointments();
    
  } catch (error) {
    console.error('Error approving appointment:', error);
    showNotification('Error al aprobar la cita', 'error');
  }
}

// Function to reject an appointment (placeholder for future implementation)
async function rejectAppointment(appointmentId) {
  if (!confirm('¿Está seguro de que desea rechazar esta cita?')) {
    return;
  }
  
  // TODO: Implement appointment rejection endpoint
  showNotification('Función de rechazo en desarrollo', 'warning');
}

// Function to display unverified users
async function loadUnverifiedUsers() {
  try {
    const response = await fetch('/api/admin/users-unverified', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('user_token') || localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const users = await response.json();
    
    const container = document.getElementById('unverified-users');
    if (!container) {
      console.error('Unverified users container not found');
      return;
    }
    
    container.innerHTML = '';
    
    if (users.length === 0) {
      container.innerHTML = '<p>No hay usuarios pendientes de verificación.</p>';
      return;
    }
    
    users.forEach(user => {
      const userDiv = document.createElement('div');
      userDiv.className = 'user-item';
      userDiv.innerHTML = `
        <div class="user-details">
          <h4>${user.name}</h4>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Teléfono:</strong> ${user.phone || 'No especificado'}</p>
          <p><strong>Fecha de registro:</strong> ${new Date(user.created_at).toLocaleString()}</p>
          <p><strong>Citas pendientes:</strong> ${user.pending_appointments || 0}</p>
        </div>
        <div class="user-actions">
          <button class="btn-verify" onclick="verifyUser(${user.id})">
            Verificar Usuario
          </button>
        </div>
      `;
      
      container.appendChild(userDiv);
    });
    
  } catch (error) {
    console.error('Error loading unverified users:', error);
    const container = document.getElementById('unverified-users');
    if (container) {
      container.innerHTML = '<p>Error al cargar usuarios no verificados.</p>';
    }
  }
}

// Function to verify a user
async function verifyUser(userId) {
  try {
    const response = await fetch(`/api/admin/users/${userId}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('user_token') || localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Show success message
    showNotification('Usuario verificado y SMS enviado exitosamente', 'success');
    
    // Refresh the unverified users list
    loadUnverifiedUsers();
    
    // Also refresh pending appointments as this user's appointments may now be auto-approved
    displayPendingAppointments();
    
  } catch (error) {
    console.error('Error verifying user:', error);
    showNotification('Error al verificar el usuario', 'error');
  }
}

// Function to send appointment reminders manually
async function sendAppointmentReminders() {
  try {
    const confirmSend = confirm('¿Desea enviar recordatorios SMS a todos los pacientes con citas para mañana?');
    if (!confirmSend) return;
    
    const response = await fetch('/api/admin/appointments/send-reminders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('user_token') || localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const result = await response.json();
    
    showNotification(`Recordatorios enviados: ${result.sent} SMS enviados exitosamente`, 'success');
    
  } catch (error) {
    console.error('Error sending reminders:', error);
    showNotification('Error al enviar recordatorios', 'error');
  }
}

// Function to show notifications
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()">&times;</button>
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// Initialize appointment management when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize admin panel
  window.adminPanel = new AdminPanel();
  
  // Load data if containers exist
  if (document.getElementById('pending-appointments')) {
    displayPendingAppointments();
  }
  
  if (document.getElementById('unverified-users')) {
    loadUnverifiedUsers();
  }
  
  // Set up refresh intervals (every 30 seconds)
  setInterval(() => {
    if (document.getElementById('pending-appointments')) {
      displayPendingAppointments();
    }
    if (document.getElementById('unverified-users')) {
      loadUnverifiedUsers();
    }
  }, 30000);
  
  // Add event listeners for admin dropdown actions
  setTimeout(() => {
    const logoutLink = document.querySelector('a[onclick="window.adminPanel.logout()"]');
    if (logoutLink) {
      logoutLink.addEventListener('click', function(e) {
        e.preventDefault();
        window.adminPanel.logout();
      });
    }
    
    const passwordChangeLink = document.querySelector('a[onclick="window.adminPanel.showPasswordChangeModal()"]');
    if (passwordChangeLink) {
      passwordChangeLink.addEventListener('click', function(e) {
        e.preventDefault();
        window.adminPanel.showPasswordChangeModal();
      });
    }
  }, 100);
});
