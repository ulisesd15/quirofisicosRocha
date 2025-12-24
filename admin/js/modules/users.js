/**
 * users.js
 *
 * Handles user management logic for the admin panel.
 * - Fetches, displays, edits, verifies, and deletes users.
 * - Supports pagination, filtering, and role-based access control.
 * - Provides UI updates for user actions and error handling.
 * - Exports a singleton UsersModule for use in the admin UI.
 */

export class UsersModule {
  /**
   * Loads unverified users and displays them in the UI.
   */
  async loadUnverifiedUsers() {
    if (!this.isAdmin()) {
      this.showError('Acceso denegado. Solo administradores pueden ver usuarios no verificados.');
      return;
    }
    try {
      const response = await fetch('/api/admin/users/unverified', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      if (!response.ok) throw new Error('Error cargando usuarios no verificados');
      const data = await response.json();
      this.displayUnverifiedUsers(data.users);
    } catch (error) {
      console.error('Error loading unverified users:', error);
      this.showError('Error cargando usuarios no verificados');
    }
  }

  /**
   * Renders the unverified users table in the UI.
   */
  displayUnverifiedUsers(users) {
    const tableBody = document.getElementById('unverified-users-table');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    users.forEach(user => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.id}</td>
        <td>${user.fullName}</td>
        <td>${user.email}</td>
        <td>${user.phone || 'N/A'}</td>
        <td>
          <button class="btn btn-success btn-sm" onclick="usersModule.verifyUser(${user.id})">Verificar</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  /**
   * Verifies a user by ID and refreshes the unverified users list.
   */
  async verifyUser(id) {
    if (!this.isAdmin()) {
      this.showError('Acceso denegado. Solo administradores pueden verificar usuarios.');
      return;
    }
    try {
      const response = await fetch(`/api/admin/users/${id}/verify`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      if (!response.ok) throw new Error('Error verificando usuario');
      this.showSuccess('Usuario verificado correctamente');
      await this.loadUnverifiedUsers();
    } catch (error) {
      console.error('Error verifying user:', error);
      this.showError('Error verificando el usuario');
    }
  }
  /**
   * Initializes UsersModule with default pagination settings.
   */
  constructor() {
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.searchTimeout = null;
  }

  /**
   * Sets up event listeners for search and filter controls.
   */
  setupSearchListeners() {
    // Search input with debounce
    const searchInput = document.getElementById('users-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
          this.currentPage = 1; // Reset to first page on new search
          this.loadUsers();
        }, 500); // 500ms debounce
      });

      // Also trigger on Enter key
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          clearTimeout(this.searchTimeout);
          this.currentPage = 1;
          this.loadUsers();
        }
      });
    }

    // Search button
    const searchBtn = document.getElementById('search-users-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        this.currentPage = 1;
        this.loadUsers();
      });
    }

    // Role filter - instant change
    const roleFilter = document.getElementById('users-role-filter');
    if (roleFilter) {
      roleFilter.addEventListener('change', () => {
        this.currentPage = 1;
        this.loadUsers();
      });
    }

    // Clear filters button
    const clearBtn = document.getElementById('clear-users-filters-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearUsersFilters();
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refresh-users-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadUsers();
      });
    }

    console.log('Users search listeners initialized');
  }

  /**
   * Retrieves the current authentication token from localStorage.
   */
  getAuthToken() {
    return localStorage.getItem('user_token') || localStorage.getItem('token') || '';
  }

  /**
   * Retrieves the current user's role from localStorage.
   */
  getUserRole() {
    return localStorage.getItem('user_role') || '';
  }

  /**
   * Checks if the current user is an admin.
   */
  isAdmin() {
    return this.getUserRole() === 'admin';
  }

  /**
   * Displays an error alert message in the UI.
   */
  showError(message) {
    this.showAlert(message, 'danger');
  }

  /**
   * Displays a success alert message in the UI.
   */
  showSuccess(message) {
    this.showAlert(message, 'success');
  }

  /**
   * Displays an alert message of a given type in the UI.
   */
  showAlert(message, type = 'info') {
    let alertContainer = document.getElementById('users-alert-container');
    if (!alertContainer) {
      alertContainer = document.createElement('div');
      alertContainer.id = 'users-alert-container';
      alertContainer.style.position = 'fixed';
      alertContainer.style.top = '70px';
      alertContainer.style.right = '30px';
      alertContainer.style.zIndex = '9999';
      document.body.appendChild(alertContainer);
    }
    alertContainer.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
    setTimeout(() => {
      alertContainer.innerHTML = '';
    }, 3000);
  }

  /**
   * Shows the loading spinner for user actions.
   */
  showLoading() {
    const spinner = document.getElementById('users-loading-spinner');
    if (spinner) spinner.style.display = 'block';
  }

  /**
   * Hides the loading spinner for user actions.
   */
  hideLoading() {
    const spinner = document.getElementById('users-loading-spinner');
    if (spinner) spinner.style.display = 'none';
  }

  /**
   * Deletes a user by ID and refreshes the users list.
   */
  async deleteUser(id) {
    if (!this.isAdmin()) {
      this.showError('Acceso denegado. Solo administradores pueden eliminar usuarios.');
      return;
    }
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      if (!response.ok) throw new Error('Error deleting user');
      this.showSuccess('Usuario eliminado correctamente');
      await this.loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      this.showError('Error eliminando el usuario');
    }
  }

  /**
   * Saves changes to a user after editing.
   */
  async saveUserChanges() {
    if (!this.isAdmin()) {
      this.showError('Acceso denegado. Solo administradores pueden actualizar usuarios.');
      return;
    }
    try {
      const id = document.getElementById('edit-user-id').value;
      const data = {
        fullName: document.getElementById('edit-user-name').value,
        email: document.getElementById('edit-user-email').value,
        phone: document.getElementById('edit-user-phone').value,
        role: document.getElementById('edit-user-role').value,
        provider: document.getElementById('edit-user-provider')?.value || 'local'
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
  const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
  modal.hide();
  await this.loadUsers();
  this.showSuccess('Usuario actualizado correctamente');
    } catch (error) {
      console.error('Error saving user:', error);
      this.showError('Error guardando los cambios');
    }
  }

  /**
   * Loads a user's data into the edit modal for editing.
   */
  async editUser(id) {
    if (!this.isAdmin()) {
      this.showError('Acceso denegado. Solo administradores pueden editar usuarios.');
      return;
    }
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      if (!response.ok) throw new Error('Error loading user');
      const data = await response.json();
      const user = data.user;
      document.getElementById('edit-user-id').value = user.id;
      document.getElementById('edit-user-name').value = user.fullName;
      document.getElementById('edit-user-email').value = user.email;
      document.getElementById('edit-user-phone').value = user.phone || '';
      document.getElementById('edit-user-role').value = user.role || 'user';
      
      // Set provider field if it exists in the form
      const providerField = document.getElementById('edit-user-provider');
      if (providerField) {
        providerField.value = user.provider || user.authProvider || 'local';
      }
      
      const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
      modal.show();
    } catch (error) {
      console.error('Error loading user:', error);
      this.showError('Error cargando el usuario');
    }
  }

  /**
   * updates user inside of edit modal
   */
  /**
   * Updates user info from the edit modal using the given id.
   */
  async updateUser(id) {
    if (!this.isAdmin()) {
      this.showError('Acceso denegado. Solo administradores pueden actualizar usuarios.');
      return;
    }
    try {
      const data = {
        fullName: document.getElementById('edit-user-name').value,
        email: document.getElementById('edit-user-email').value,
        phone: document.getElementById('edit-user-phone').value,
        role: document.getElementById('edit-user-role').value,
        provider: document.getElementById('edit-user-provider')?.value || 'local'
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
      const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
      if (modal) modal.hide();
      await this.loadUsers();
      this.showSuccess('Usuario actualizado correctamente');
    } catch (error) {
      console.error('Error updating user:', error);
      this.showError('Error guardando los cambios');
    }
  }

  /**
   * Loads users with pagination and filtering, and displays them in the UI.
   */
  async loadUsers() {
    if (!this.isAdmin()) {
      this.showError('Acceso denegado. Solo administradores pueden ver usuarios.');
      this.hideLoading();
      return;
    }
    this.showLoading();
    const search = document.getElementById('users-search').value || '';
    const roleFilter = document.getElementById('users-role-filter').value || '';
    const page = Number.isInteger(this.currentPage) && this.currentPage > 0 ? this.currentPage : 1;
    const limit = Number.isInteger(this.itemsPerPage) && this.itemsPerPage > 0 ? this.itemsPerPage : 10;
    try {
      const response = await fetch(`/api/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&role=${encodeURIComponent(roleFilter)}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      if (!response.ok) throw new Error('Error loading users');
      const data = await response.json();
      console.log('Users API response:', data);
      this.displayUsers(data.users);
      
      // Handle both camelCase and snake_case pagination response
      const totalRecords = data.pagination.totalRecords || data.pagination.total_records || 0;
      this.updateUsersCount(totalRecords);
    } catch (error) {
      console.error('Error loading users:', error);
      this.showError('Error cargando los usuarios');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Renders the users list in the UI.
   */
  async displayUsers(users) {
    const usersTableBody = document.getElementById('users-table');
    if (!usersTableBody) {
      console.error('Error: The element with ID "users-table" was not found in the DOM.');
      this.showError('Error de UI: No se pudo encontrar el contenedor de la lista de usuarios.');
      return;
    }
    usersTableBody.innerHTML = ''; // Clear current list

    if (!users || users.length === 0) {
      usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-muted">No users found.</td></tr>';
      return;
    }

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.fullName}</td>
            <td>${user.email}</td>
            <td>${user.phone || 'N/A'}</td>
            <td><span class="badge bg-secondary">${user.role}</span></td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-outline-secondary" onclick="window.usersModule.editUser(${user.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="window.usersModule.deleteUser(${user.id})"><i class="fas fa-trash"></i></button>
            </td>
        `;
        usersTableBody.appendChild(row);
    });
  }

  /**
   * Updates the displayed total user count in the UI.
   */
  updateUsersCount(count) {
    const countElement = document.getElementById('users-total-count');
    if (countElement) {
      countElement.textContent = `Total: ${count} usuarios`;
    }
  }

  /**
   * Shows the add user modal (not yet implemented).
   */
  showAddUserModal() {
    alert('Funcionalidad de agregar usuario - pendiente de implementar');
  }

  /**
   * Clears user search filters and reloads the users list.
   */
  clearUsersFilters() {
    const searchInput = document.getElementById('users-search');
    if (searchInput) searchInput.value = '';
    const roleFilter = document.getElementById('users-role-filter');
    if (roleFilter) roleFilter.value = '';
    this.currentPage = 1;
    this.loadUsers();
  }
}