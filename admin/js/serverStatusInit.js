// admin/js/serverStatusInit.js
import { ServerStatusModule } from './modules/serverStatus.js';

document.addEventListener('DOMContentLoaded', () => {
  const serverStatus = new ServerStatusModule();
  serverStatus.checkServerStatus();
});
