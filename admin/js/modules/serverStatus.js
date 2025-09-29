/**
 * serverStatus.js
 *
 * Handles server health/status monitoring for the admin panel.
 * - Fetches and displays server health, uptime, CPU, and memory usage.
 * - Updates the UI with status cards.
 * - Exports a ServerStatusModule for use in the admin UI.
 */

export class ServerStatusModule {
  /**
   * Loads and checks the current server status.
   */
  load() {
    this.checkServerStatus();
  }
  /**
   * Initializes ServerStatusModule (currently empty).
   */
  constructor() {}

  /**
   * Fetches server status from the backend and renders the results.
   */
  async checkServerStatus() {
    try {
      // Wait for section to be visible (DOM update)
      await new Promise(resolve => setTimeout(resolve, 100));
      const section = document.getElementById('server-status-section');
      if (!section || section.classList.contains('d-none')) return;

      const token = localStorage.getItem('token') || localStorage.getItem('user_token');
      const response = await fetch('http://localhost:3001/api/admin/server/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch server status');

      const status = await response.json();
      this.renderServerStatus(status);
    } catch (error) {
      console.error('Error checking server status:', error);
    }
  }

  /**
   * Renders the server status cards in the UI.
   */
  renderServerStatus(status) {
    const container = document.getElementById('server-header-cards');
    if (!container) return;

    container.innerHTML = `
      <div class="row g-3">
        <div class="col-md-3">
          <div class="card text-white bg-${status.is_healthy ? 'success' : 'danger'} mb-3">
            <div class="card-body">
              <h5 class="card-title">Estado</h5>
              <p class="card-text">${status.is_healthy ? 'Online' : 'Offline'}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card mb-3">
            <div class="card-body">
              <h5 class="card-title">Uptime</h5>
              <p class="card-text">${status.uptime || 'N/A'}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card mb-3">
            <div class="card-body">
              <h5 class="card-title">CPU</h5>
              <p class="card-text">${status.cpu_usage !== undefined ? status.cpu_usage + '%' : 'N/A'}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card mb-3">
            <div class="card-body">
              <h5 class="card-title">Memoria</h5>
              <p class="card-text">${status.memory_usage !== undefined ? status.memory_usage + '%' : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Initializes the ServerStatusModule and checks server status on DOMContentLoaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  const serverStatus = new ServerStatusModule();
  serverStatus.checkServerStatus();
});