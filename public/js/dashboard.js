// public/js/dashboard.js
/**
 * dashboard.js
 *
 * Handles fetching and displaying admin dashboard statistics.
 * - Retrieves JWT from localStorage or AuthManager for authenticated API requests.
 * - Fetches dashboard stats from the backend and updates the UI with totals for appointments, users, and revenue.
 * - Alerts and handles session expiration or authorization errors.
 */

// Utility to get JWT from localStorage
/**
 * Retrieves the JWT token from localStorage (supports both legacy and current keys).
 * @returns {string|null} The JWT token, or null if not found.
 */
function getToken() {
  return localStorage.getItem('token') || localStorage.getItem('userToken');
}

// Example: Fetch dashboard stats with JWT
/**
 * Fetches dashboard statistics from the backend API and updates the dashboard UI.
 * Handles session expiration and authorization errors.
 */
async function fetchDashboardStats() {
  const token = getToken();
  if (!token) {
    alert('Sesión expirada. Por favor, inicie sesión nuevamente.');
    return;
  }
  try {
    const response = await fetch('/api/admin/dashboard/stats', {
      headers: window.authManager ? window.authManager.getAuthHeaders() : {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error('No autorizado o sesión expirada');
    }
    const data = await response.json();
    // Use data for dashboard rendering
    console.log('Dashboard stats:', data);
    document.getElementById('totalAppointments').innerText = data.totalAppointments || 0;
    document.getElementById('totalUsers').innerText = data.totalUsers || 0;
    document.getElementById('totalRevenue').innerText = '$' + (data.totalRevenue || 0);
  } catch (err) {
    alert('Sesión expirada. Por favor, inicie sesión nuevamente.');
    console.error('Dashboard stats error:', err);
  }
}

// Call this when dashboard loads
fetchDashboardStats();
