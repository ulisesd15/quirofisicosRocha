
const menuToggle = document.getElementById('menu_toggle');

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  document.getElementById('registerMessage').textContent = ''; // Clear previous messages
  document.getElementById('registerMessage').className = 'text-danger text-center mb-3'; // Reset to error styling

  const data = Object.fromEntries(new FormData(e.target).entries());
  const { full_name, phone, email, password, confirm_password } = data;

  // Helper validation functions
  const isPasswordStrong = (password) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(password);

  const isValidPhone = (phone) => /^\d{10}$/.test(phone);
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Validations
  if (!full_name || !phone || !email || !password || !confirm_password) {
    document.getElementById('registerMessage').textContent = 'Faltan campos requeridos';
    return;
  }

  if (password !== confirm_password) {
    document.getElementById('registerMessage').textContent = 'Las contraseñas no coinciden';
    return;
  }

  if (!isPasswordStrong(password)) {
    document.getElementById('registerMessage').textContent = 'La contraseña debe tener al menos 6 caracteres, incluyendo 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial';
    return;
  }

  if (!isValidPhone(phone)) {
    document.getElementById('registerMessage').textContent = 'El teléfono debe tener 10 dígitos';
    return;
  }

  if (!isValidEmail(email)) {
    document.getElementById('registerMessage').textContent = 'Correo electrónico inválido';
    return;
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
      if (window.authManager) {
        window.authManager.login(result.token, result.user);
      } else {
        // Fallback: store manually if AuthManager not available
        localStorage.setItem('user_token', result.token);
        localStorage.setItem('token', result.token);
        localStorage.setItem('user_id', result.user.id);
        localStorage.setItem('user_name', result.user.full_name);
        localStorage.setItem('user_email', result.user.email);
        localStorage.setItem('user_phone', result.user.phone);
        localStorage.setItem('user_role', result.user.role || 'user');
      }
      document.getElementById('registerMessage').textContent = '';
      document.getElementById('registerMessage').className = 'text-success text-center mb-3';
      document.getElementById('registerMessage').textContent = result.message || 'Registro exitoso';
      setTimeout(() => {
        window.location.href = '/appointment.html'; // Redirect after successful register
      }, 1500);
    } else {
      document.getElementById('registerMessage').textContent = result.error || 'No se pudo registrar';
    }

  } catch (error) {
    console.error('Error al registrar:', error);
    document.getElementById('registerMessage').textContent = 'Error al registrar. Inténtalo de nuevo más tarde.';
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