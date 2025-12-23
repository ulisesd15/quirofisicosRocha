// Auth utility functions
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('userToken') || localStorage.getItem('token');
    this.userId = localStorage.getItem('userId');
    this.userName = localStorage.getItem('userName');
    this.userRole = localStorage.getItem('userRole');
    console.debug('[AuthManager] initialized', { tokenPresent: !!this.token, userId: this.userId, userName: this.userName });
  }

  // Check if user is logged in
  isLoggedIn() {
    // Consider the user logged in if a token exists. User details may be loaded/validated separately.
    return !!this.token;
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
    this.userName = user.fullName;
    this.userRole = user.role;
    
    localStorage.setItem('userToken', token);
    localStorage.setItem('token', token); // Keep both for compatibility
    localStorage.setItem('userId', user.id);
    /**
     * auth.js
     *
     * Provides an AuthManager class for handling authentication and user session management.
     * - Handles login, logout, token storage, and user info storage in localStorage.
     * - Provides utility methods for checking login status, admin status, and making authenticated API requests.
     * - Exposes a global authManager instance for use throughout the app.
     * - On page load, auto-validates the token if the user appears to be logged in.
     */

    localStorage.setItem('userName', user.fullName);
    localStorage.setItem('userEmail', user.email);
      /**
       * Loads token and user info from localStorage.
       */
    localStorage.setItem('userPhone', user.phone);
    localStorage.setItem('userRole', user.role || 'user');
  }

  // Clear login data
  logout() {
    this.token = null;
      /**
       * Returns true if a token and userId are present.
       */
    this.userId = null;
    this.userName = null;
    this.userRole = null;
    
      /**
       * Returns headers for authenticated API requests.
       */
    localStorage.removeItem('userToken');
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userRole');
      /**
       * Stores token and user info in both the instance and localStorage.
       */
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

  // Get user data (alias for getUserInfo for compatibility)
  getUserData() {
    return {
      /**
       * Clears token and user info from both the instance and localStorage.
       */
      id: this.userId,
      name: this.userName,
      email: localStorage.getItem('userEmail'),
      phone: localStorage.getItem('userPhone'),
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
    // Return fields expected across the codebase. Some parts expect `fullName`.
    return {
      id: this.userId,
      fullName: this.userName || localStorage.getItem('userName'),
      name: this.userName || localStorage.getItem('userName'),
      email: localStorage.getItem('userEmail'),
      phone: localStorage.getItem('userPhone'),
      role: this.userRole || localStorage.getItem('userRole'),
      token: this.token
    };
  }

      /**
       * Returns a more complete user info object (id, name, email, phone, role, token).
       */
  // Get token for API calls
  getToken() {
    return this.token;
  }

  // Validate token by making an API call
  async validateToken() {
    if (!this.token) return false;

    try {
      const response = await fetch('/api/auth/profile', {
      /**
       * Returns true if the user’s role is 'admin'.
       */
        headers: this.getAuthHeaders()
      });

      if (response.ok) {
      /**
       * Returns the current user object if logged in, otherwise null.
       */
        const user = await response.json();
        // Update user info in case it changed
        this.userName = user.fullName;
        localStorage.setItem('userName', user.fullName);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userPhone', user.phone);
        return true;
      } else {
        // Token is invalid, clear storage
      /**
       * Returns the current token.
       */
        this.logout();
        return false;
      }
    } catch (error) {
      /**
       * Validates the token by making an API call; updates user info or logs out if invalid.
       */
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
      /**
       * Makes an authenticated API request; logs out and redirects if unauthorized.
       */
}

// Create global auth manager instance
window.authManager = new AuthManager();

// Auto-validate token on page load if user appears to be logged in
document.addEventListener('DOMContentLoaded', async () => {
  console.debug('[AuthManager] DOMContentLoaded - isLoggedIn:', window.authManager.isLoggedIn());
  if (window.authManager.isLoggedIn()) {
    const valid = await window.authManager.validateToken();
    console.debug('[AuthManager] token validation result:', valid);
  }
  // window.authManager.updateNavigation(); // Removed, not needed
});
