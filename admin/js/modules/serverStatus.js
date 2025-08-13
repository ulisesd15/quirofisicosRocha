// admin/js/modules/serverStatus.js
export class ServerStatusModule {
  constructor() {}

  

 async checkServerStatus() {
    try {
      const response = await fetch('/api/server/status');
      if (!response.ok) throw new Error('Failed to fetch server status');

      const status = await response.json();
      this.renderServerStatus(status);
    } catch (error) {
      console.error('Error checking server status:', error);
    }
  }

  renderServerStatus(status) {
    if (!this.statusElement) return;

    this.statusElement.innerHTML = `
      <div class="alert alert-${status.is_healthy ? 'success' : 'danger'}">
        <strong>Server Status:</strong> ${status.is_healthy ? 'Online' : 'Offline'}
      </div>
    `;
  }
}
