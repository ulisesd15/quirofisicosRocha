
const menuToggle = document.getElementById('menu_toggle');



document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    
    try{
      const res = await fetch('api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: data.full_name,
          username: data.username,
          email: data.email,
          phone: data.phone
        })

      });console.log(data);

      const result = await res.json();
      console.log(result);
    if (res.ok) {
      // Store user_id so it's available later
      localStorage.setItem('user_id', result.userId);

      window.location.href = '/appointment.html'; // redirect
      e.target.reset();
    }
    else {
        alert(`Error: ${result.message || 'No se pudo registrar'}`);
      }
    } catch (error) {
      console.error('Error al registrar:', error);
      alert('Error al registrar. Inténtalo de nuevo más tarde.');
    }
 

  });


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