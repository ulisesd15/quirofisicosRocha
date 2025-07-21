
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
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, phone, email, password })
    });

    const result = await res.json();
    console.log('Register response:', result);

    if (res.ok) {
      // Use AuthManager to handle login
      window.authManager.login(result.token, result.user);
      alert(result.message || 'Registro exitoso');
      window.location.href = '/appointment.html'; // Redirect after successful register
    } else {
      alert(`Error: ${result.error || 'No se pudo registrar'}`);
    }

  } catch (error) {
    console.error('Error al registrar:', error);
    alert('Error al registrar. Inténtalo de nuevo más tarde.');
  }
});

document.getElementById('google-login').addEventListener('click', () => {
  window.location.href = '/api/auth/google';
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