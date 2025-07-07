document.addEventListener('DOMContentLoaded', () => {
  // DOM references
  const guestBtn = document.getElementById('guestBtn');
  const registerBtn = document.getElementById('registerBtn');
  const loginBtn = document.getElementById('loginBtn');
  const bABtn = document.getElementById('bABtn');
  const navItems = document.getElementById('nav-items');
  const menuToggle = document.getElementById('menu_toggle');
  const offcanvas = document.getElementById('sideNav');
  const signOutBtn = document.getElementById('logoutBtn');

  const userId = localStorage.getItem('user_id');

  // Navigation menu
  if (navItems) {
    navItems.innerHTML = userId
      ? `
        <li><a href="/appointment.html" class="btn btn-outline-primary w-100 mb-2">Agendar Cita</a></li>
        <li><a href="#" id="logoutBtn" class="btn btn-danger w-100 mb-2">Cerrar Sesión</a></li>
      `
      : `
        <li><a href="/login.html" class="btn btn-outline-success w-100 mb-2">Iniciar Sesión</a></li>
        <li><a href="/appointment.html?guest=true" class="btn btn-outline-primary w-100 mb-2">Agendar como Invitado</a></li>
        <li><a href="/register.html" class="btn btn-outline-secondary w-100 mb-2">Crear Cuenta</a></li>
      `;

    // Re-attach logoutBtn listener after injecting it dynamically
    if (userId) {
      const logoutBtn = document.getElementById('logoutBtn');
      logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem('user_id');
        alert('Sesión cerrada exitosamente.');
        window.location.href = '/index.html';
      });
    }
  }

  // UI control visibility
  if (userId) {
    guestBtn?.style?.setProperty('display', 'none');
    registerBtn?.style?.setProperty('display', 'none');
    loginBtn?.style?.setProperty('display', 'none');
    signOutBtn?.style?.setProperty('display', 'block');
    bABtn?.style?.setProperty('display', 'block');
  } else {
    guestBtn?.style?.setProperty('display', 'block');
    registerBtn?.style?.setProperty('display', 'block');
    loginBtn?.style?.setProperty('display', 'block');
    signOutBtn?.style?.setProperty('display', 'none');
    bABtn?.style?.setProperty('display', 'none');
  }

  // Button click listeners
  registerBtn?.addEventListener('click', () => {
    window.location.href = 'register.html';
  });

  loginBtn?.addEventListener('click', () => {
    window.location.href = 'login.html';
  });

  guestBtn?.addEventListener('click', () => {
    window.location.href = 'appointment.html?guest=true';
  });

  bABtn?.addEventListener('click', () => {
    window.location.href = 'appointment.html';
  });

  signOutBtn?.addEventListener('click', () => {
    localStorage.removeItem('user_id');
    window.location.href = '/index.html';
  });

  // Offcanvas toggle visibility
  if (offcanvas && menuToggle) {
    offcanvas.addEventListener('show.bs.offcanvas', () => {
      menuToggle.style.display = 'none';
    });

    offcanvas.addEventListener('hidden.bs.offcanvas', () => {
      menuToggle.style.display = 'block';
    });
  }
});
