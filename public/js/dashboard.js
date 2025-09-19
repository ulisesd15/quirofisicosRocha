// public/js/dashboard.js
// Utility to get JWT from localStorage
function getToken() {
  return localStorage.getItem('token') || localStorage.getItem('user_token');
}

// Example: Fetch dashboard stats with JWT
async function fetchDashboardStats() {
  const token = getToken();
  if (!token) {
    alert('Sesión expirada. Por favor, inicie sesión nuevamente.');
    return;
  }
  try {
    const response = await fetch('/api/admin/dashboard/stats', {
      headers: {
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
    // ... update dashboard UI ...
  } catch (err) {
    alert('Sesión expirada. Por favor, inicie sesión nuevamente.');
    console.error('Dashboard stats error:', err);
  }
}

// Call this when dashboard loads
fetchDashboardStats();
