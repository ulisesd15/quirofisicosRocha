// Auth utility functions
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('user_token') || localStorage.getItem('token');
    this.userId = localStorage.getItem('user_id');
    this.userName = localStorage.getItem('user_name');
    this.userRole = localStorage.getItem('user_role');
  }

  // Check if user is logged in
  isLoggedIn() {
    return !!(this.token && this.userId);
  }

  // Get auth headers for API requests
  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
  }

  // Store login data
  login(token, user) {
    this.token = token;
    this.userId = user.id;
    this.userName = user.full_name;
    this.userRole = user.role;
    
    localStorage.setItem('user_token', token);
    localStorage.setItem('token', token); // Keep both for compatibility
    localStorage.setItem('user_id', user.id);
    localStorage.setItem('user_name', user.full_name);
    localStorage.setItem('user_role', user.role || 'user');
  }

  // Clear login data
  logout() {
    this.token = null;
    this.userId = null;
    this.userName = null;
    this.userRole = null;
    
    localStorage.removeItem('user_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
  }

  // Get user info
  getUserInfo() {
    return {
      id: this.userId,
      name: this.userName,
      role: this.userRole,
      token: this.token
    };
  }

  // Check if current user is admin
  isAdmin() {
    return this.userRole === 'admin';
  }

  // Get current user object
  getCurrentUser() {
    if (!this.isLoggedIn()) return null;
    return {
      id: this.userId,
      name: this.userName,
      role: this.userRole
    };
  }

  // Get token for API calls
  getToken() {
    return this.token;
  }

  // Validate token by making an API call
  async validateToken() {
    if (!this.token) return false;

    try {
      const response = await fetch('/api/auth/profile', {
        headers: this.getAuthHeaders()
      });

      if (response.ok) {
        const user = await response.json();
        // Update user info in case it changed
        this.userName = user.full_name;
        localStorage.setItem('user_name', user.full_name);
        return true;
      } else {
        // Token is invalid, clear storage
        this.logout();
        return false;
      }
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  // Make authenticated API request
  async apiRequest(url, options = {}) {
    const config = {
      headers: this.getAuthHeaders(),
      ...options
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);

    // If unauthorized, logout user
    if (response.status === 401 || response.status === 403) {
      this.logout();
      window.location.href = '/login.html';
      throw new Error('Session expired');
    }

    return response;
  }

  // Update navigation based on auth state
  updateNavigation() {
    const navItems = document.getElementById('nav-items');
    if (!navItems) return;

    if (this.isLoggedIn()) {
      const adminButton = this.isAdmin() ? 
        `<li><a href="/adminOptions.html" class="btn btn-warning w-100 mb-2">
          <i class="fas fa-user-shield"></i> Panel Admin
        </a></li>` : '';
      
      navItems.innerHTML = `
        <li><a href="/appointment.html" class="btn btn-outline-primary w-100 mb-2">Agendar Cita</a></li>
        ${adminButton}
        <li><a href="#" id="logoutBtn" class="btn btn-danger w-100 mb-2">Cerrar Sesión</a></li>
        <li><span class="text-muted small">Hola, ${this.userName || 'Usuario'}</span></li>
      `;

      // Add logout event listener
      document.addEventListener('click', (e) => {
        if (e.target.id === 'logoutBtn') {
          this.logout();
          alert('Sesión cerrada exitosamente.');
          window.location.href = '/index.html';
        }
      });
    } else {
      navItems.innerHTML = `
        <li><a href="/login.html" class="btn btn-outline-success w-100 mb-2">Iniciar Sesión</a></li>
        <li><a href="/appointment.html?guest=true" class="btn btn-outline-primary w-100 mb-2">Agendar como Invitado</a></li>
        <li><a href="/register.html" class="btn btn-outline-secondary w-100 mb-2">Crear Cuenta</a></li>
      `;
    }
  }
}

// Create global auth manager instance
window.authManager = new AuthManager();

// Auto-validate token on page load if user appears to be logged in
document.addEventListener('DOMContentLoaded', async () => {
  if (window.authManager.isLoggedIn()) {
    await window.authManager.validateToken();
  }
  window.authManager.updateNavigation();
});
