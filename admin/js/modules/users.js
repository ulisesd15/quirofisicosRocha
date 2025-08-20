// admin/js/modules/users.js
export class UsersModule {
  getAuthToken() {
    return localStorage.getItem('token') || localStorage.getItem('user_token') || '';
  }

  showError(message) {
    alert(message);
  }

  showLoading() {
    const spinner = document.getElementById('users-loading-spinner');
    if (spinner) spinner.style.display = 'block';
  }

  hideLoading() {
    const spinner = document.getElementById('users-loading-spinner');
    if (spinner) spinner.style.display = 'none';
  }


  
  constructor() {
    this.currentPage = 1;
    this.itemsPerPage = 10;
  }
  // Add usuarios/users logic here
  
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

  async loadUsers() {
    this.showLoading();
    const search = document.getElementById('users-search').value || '';
    const roleFilter = document.getElementById('users-role-filter').value || '';
    
    try {
      const response = await fetch(`/api/admin/users?page=${this.currentPage}&search=${encodeURIComponent(search)}&role=${encodeURIComponent(roleFilter)}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Error loading users');

      const data = await response.json();
      this.displayUsers(data.users);
      this.updateUsersCount(data.totalCount);

    } catch (error) {
      console.error('Error loading users:', error);
      this.showError('Error cargando los usuarios');
    } finally {
      this.hideLoading();
    }
  }

  displayUsers(users) {
    const usersTableBody = document.getElementById('users-table-body');
    if (!usersTableBody) return;

    usersTableBody.innerHTML = ''; // Clear existing rows

    users.forEach(user => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.phone || 'N/A'}</td>
        <td>${user.role}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="usersModule.editUser(${user.id})">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="usersModule.deleteUser(${user.id})">Eliminar</button>
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

  

}
