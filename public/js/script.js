const guestBtn = document.getElementById('guestBtn');
const registerBtn = document.getElementById('registerBtn');
const loginBtn = document.getElementById('loginBtn');
const signOutBtn = document.getElementById('signOutBtn');
const menuToggle = document.getElementById('menu_toggle');

document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.getElementById('nav-items');
    const userId = localStorage.getItem('user_id');

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

    document.addEventListener('click', (e) => {
      if (e.target.id === 'logoutBtn') {
        localStorage.removeItem('user_id');
        alert('Sesión cerrada exitosamente.');
        window.location.href = '/index.html';
      }
    });
  });

document.getElementById('registerBtn').addEventListener('click', () => {
    window.location.href = 'register.html';
  });
  
  document.getElementById('guestBtn').addEventListener('click', () => {
    window.location.href = 'appointment.html?guest=true';
  });
  
  //hides guest button if user_id is in localStorage
  if (localStorage.getItem('user_id')) {
    guestBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    loginBtn.style.display = 'none';
    signOutBtn.style.display = 'block';
  }
//login

document.getElementById('loginBtn').addEventListener('click', () => {
  window.location.href = 'login.html';
});

document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('#menu_toggle');
  const offcanvas = document.getElementById('sideNav');

  // Hide toggle button when offcanvas opens
  offcanvas.addEventListener('show.bs.offcanvas', () => {
    menuToggle.style.display = 'none';
  });

  // Show toggle button again when offcanvas closes
  offcanvas.addEventListener('hidden.bs.offcanvas', () => {
    menuToggle.style.display = 'block';
  });
});
// Redirect to appointment page if user_id is in localStorage
//   if (localStorage.getItem('user_id')) {
//     window.location.href = 'appointment.html';
// }