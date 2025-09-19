export class UsersModule {
  constructor() {
    this.currentPage = 1;
    this.itemsPerPage = 10;
  }

  getAuthToken() {
    return localStorage.getItem('token') || localStorage.getItem('token') || '';
  }

  getUserRole() {
    return localStorage.getItem('user_role') || '';
  }

  isAdmin() {
    return this.getUserRole() === 'admin';
  }

  showError(message) {
    this.showAlert(message, 'danger');
  }

  showSuccess(message) {
    this.showAlert(message, 'success');
  }

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

  showLoading() {
    const spinner = document.getElementById('users-loading-spinner');
    if (spinner) spinner.style.display = 'block';
  }

  hideLoading() {
    const spinner = document.getElementById('users-loading-spinner');
    if (spinner) spinner.style.display = 'none';
  }

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

  async saveUserChanges() {
    if (!this.isAdmin()) {
      this.showError('Acceso denegado. Solo administradores pueden actualizar usuarios.');
      return;
    }
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
      const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
      modal.hide();
      await this.refreshCurrentSection();
      this.showSuccess('Usuario actualizado correctamente');
    } catch (error) {
      console.error('Error saving user:', error);
      this.showError('Error guardando los cambios');
    }
  }

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
      document.getElementById('edit-user-name').value = user.name;
      document.getElementById('edit-user-email').value = user.email;
      document.getElementById('edit-user-phone').value = user.phone || '';
      document.getElementById('edit-user-role').value = user.role || 'user';
      const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
      modal.show();
    } catch (error) {
      console.error('Error loading user:', error);
      this.showError('Error cargando el usuario');
    }
  }

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
      this.updateUsersCount(data.pagination.total_records);
    } catch (error) {
      console.error('Error loading users:', error);
      this.showError('Error cargando los usuarios');
    } finally {
      this.hideLoading();
    }
  }

  displayUsers(users) {
    const usersTableBody = document.getElementById('users-table');
    if (!usersTableBody) return;
    usersTableBody.innerHTML = '';
    users.forEach(user => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.id}</td>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.phone || 'N/A'}</td>
        <td>${user.role}</td>
        <td>${user.created_at ? new Date(user.created_at).toLocaleDateString('es-MX') : 'N/A'}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-outline-primary btn-sm" onclick="usersModule.editUser(${user.id})" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm" onclick="usersModule.deleteUser(${user.id})" title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      usersTableBody.appendChild(row);
    });
  }

  updateUsersCount(count) {
    const countElement = document.getElementById('users-total-count');
    if (countElement) {
      countElement.textContent = `Total: ${count} usuarios`;
    }
  }

  showAddUserModal() {
    alert('Funcionalidad de agregar usuario - pendiente de implementar');
  }

  clearUsersFilters() {
    const searchInput = document.getElementById('users-search');
    if (searchInput) searchInput.value = '';
    const roleFilter = document.getElementById('users-role-filter');
    if (roleFilter) roleFilter.value = '';
    this.currentPage = 1;
    this.loadUsers();
  }
}