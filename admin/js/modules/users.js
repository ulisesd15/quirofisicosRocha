// admin/js/modules/users.js
export class UsersModule {
  constructor() {}
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

  async editUser(id) {
    await this.users.edit(id);
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
    await this.users.delete(id);
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
