
const menuToggle = document.getElementById('menu_toggle');




document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = Object.fromEntries(new FormData(e.target).entries());
  const { full_name, phone, email, password, confirm_password } = data;
  // Helper validation functions
  const isPasswordStrong = (password) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(password);

  const isValidPhone = (phone) => /^\d{10}$/.test(phone);
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Validations
  if (!full_name || !phone || !email || !password || !confirm_password) {
    return alert('Faltan campos requeridos');
  }

  if (password !== confirm_password) {
    return alert('Las contraseñas no coinciden');
  }

  if (!isPasswordStrong(password)) {
    return alert('La contraseña debe tener al menos 6 caracteres, incluyendo 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial');
  }

  if (!isValidPhone(phone)) {
    return alert('El teléfono debe tener 10 dígitos');
  }

  if (!isValidEmail(email)) {
    return alert('Correo electrónico inválido');
  } else {

    try {
      const res = await fetch('api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            full_name: data.full_name,
            phone: data.phone,
            email: data.email,
            password: data.password
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