
// Auth utility functions
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('token') || localStorage.getItem('userToken');
    this.userId =  localStorage.getItem('userId');
    this.userName = localStorage.getItem('userName');
    this.userRole =  localStorage.getItem('userRole');
    console.debug('[AuthManager] initialized', { tokenPresent: !!this.token, userId: this.userId, userName: this.userName });
  }

  // Check if user is logged in
  isLoggedIn() {
    return Boolean(this.getToken());
  }

  // Get current token dynamically
  getToken() {
    return localStorage.getItem('token') || localStorage.getItem('userToken');
  }

  // Get auth headers for API requests
  getAuthHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Store login data consistently (supports both formats to prevent mismatches)
  login(token, user) {
    this.token = token;
    this.userId = user.id;
    this.userName = user.fullName || user.name;
    this.userRole = user.role;

    localStorage.setItem("userToken", token);
    localStorage.setItem("userId", String(user.id));
    localStorage.setItem("userName", user.fullName || user.name || "");
    localStorage.setItem("userEmail", user.email || "");
    localStorage.setItem("userPhone", user.phone || "");
    localStorage.setItem("userRole", user.role || "user");

    // Store the complete user object
    localStorage.setItem("user", JSON.stringify(user));

    // Tell React components that authentication changed
    window.dispatchEvent(new Event("authChange"));

    console.debug("[AuthManager] Login successful", { tokenPresent: !!token, user });
  }

  // Clear login data completely
  logout() {
    this.token = null;
    this.userId = null;
    this.userName = null;
    this.userRole = null;
    
    localStorage.removeItem('token');
    localStorage.removeItem('userToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');

    // Notify React components
    window.dispatchEvent(new Event("authChange"));
    console.debug("[AuthManager] Logout successful");
  }

  // Get user info
  getUserInfo() {
    return {
      id: this.userId ||  localStorage.getItem('userId'),
      name: this.userName || localStorage.getItem('userName'),
      role: this.userRole || localStorage.getItem('userRole'),
      token: this.getToken()
    };
  }

  // Get user data (alias for compatibility)
  getUserData() {
    return {
      id: this.userId || localStorage.getItem('userId'),
      name: this.userName || localStorage.getItem('userName'),
      email: localStorage.getItem('userEmail'),
      phone: localStorage.getItem('userPhone'),
      role: this.userRole || localStorage.getItem('userRole'),
      token: this.getToken()
    };
  }

  // Check if current user is admin
  isAdmin() {
    const role = this.userRole || localStorage.getItem('userRole');
    return role === 'admin';
  }

  // Get current user object
  getCurrentUser() {
    if (!this.isLoggedIn()) return null;

    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (error) {
        console.error("Error parsing stored user JSON:", error);
      }
    }

    return {
      id: this.userId || localStorage.getItem('userId'),
      fullName: this.userName || localStorage.getItem('userName'),
      name: this.userName || localStorage.getItem('userName'),
      email:  localStorage.getItem('userEmail'),
      phone:  localStorage.getItem('userPhone'),
      role: this.userRole || localStorage.getItem('userRole') || 'user',
      token: this.getToken()
    };
  }

  // Validate token by making an API call
  async validateToken() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await fetch('/api/auth/profile', {
        headers: this.getAuthHeaders()
      });

      // Reject non-JSON answers (e.g. a dev server without an /api proxy
      // answering with the SPA's index.html) instead of letting
      // response.json() throw and look like an auth failure.
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && !contentType.includes('application/json')) {
        console.error('Token validation error: expected JSON from /api/auth/profile, got', contentType);
        return false;
      }

      if (response.ok) {
        const user = await response.json();
        this.userName = user.fullName || user.name;
        localStorage.setItem('userName', user.fullName || user.name);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userPhone', user.phone || '');
        localStorage.setItem('userRole', user.role || 'user');
        return true;
      } else {
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

    // If unauthorized, logout user and redirect to React login route
    if (response.status === 401 || response.status === 403) {
      this.logout();
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    return response;
  }
}

// Create global auth manager instance
window.authManager = new AuthManager();

// Auto-validate token on page load if user appears to be logged in
document.addEventListener('DOMContentLoaded', async () => {
  if (window.authManager.isLoggedIn()) {
    await window.authManager.validateToken();
  }
});
