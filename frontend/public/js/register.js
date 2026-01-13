/**
 * register.js
 *
 * Handles the registration page logic for new user sign-up:
 * - Validates registration form fields and provides user feedback.
 * - Submits registration data to the backend and handles the response.
 * - Supports Google OAuth registration.
 * - Redirects to the appointment page if already logged in.
 * - Manages navigation menu toggle visibility for mobile/offcanvas UI.
 */

const menuToggle = document.getElementById('menu_toggle');

/**
 * Handles registration form submission:
 * - Validates input fields.
 * - Submits data to backend.
 * - Handles success and error feedback.
 */
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  document.getElementById('registerMessage').textContent = ''; // Clear previous messages
  document.getElementById('registerMessage').className = 'text-danger text-center mb-3'; // Reset to error styling

  const data = Object.fromEntries(new FormData(e.target).entries());
  const { fullName, phone, email, password, confirmPassword } = data;

  // Helper validation functions
  const isPasswordStrong = (password) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(password);

  const isValidPhone = (phone) => /^\d{10}$/.test(phone);
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Validations
  if (!fullName || !phone || !email || !password || !confirmPassword) {
    document.getElementById('registerMessage').textContent = 'Faltan campos requeridos';
    return;
  }

  if (password !== confirmPassword) {
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
      body: JSON.stringify({ fullName, phone, email, password })
    });

    const result = await res.json();
    console.log('Register response:', result);

    if (res.ok) {
      // Use AuthManager to handle login
      if (window.authManager) {
        window.authManager.login(result.token, result.user);
      } else {
        // Fallback: store manually if AuthManager not available
        localStorage.setItem('userToken', result.token);
        localStorage.setItem('user_token', result.token); // For admin compatibility
        localStorage.setItem('token', result.token);
        localStorage.setItem('userId', result.user.id);
        localStorage.setItem('userName', result.user.fullName);
        localStorage.setItem('userEmail', result.user.email);
        localStorage.setItem('userPhone', result.user.phone);
        localStorage.setItem('userRole', result.user.role || 'user');
      }
      
      document.getElementById('registerMessage').textContent = '';
      document.getElementById('registerMessage').className = 'text-success text-center mb-3';
      document.getElementById('registerMessage').textContent = result.message || 'Registro exitoso';
      
      setTimeout(() => {
        // Redirect based on user role
        if (result.user.role === 'admin') {
          window.location.href = '/admin/adminOptions.html';
        } else {
          window.location.href = '/appointment.html';
        }
      }, 1500);
    } else {
      document.getElementById('registerMessage').textContent = result.error || 'No se pudo registrar';
    }

  } catch (error) {
    console.error('Error al registrar:', error);
    document.getElementById('registerMessage').textContent = 'Error al registrar. Inténtalo de nuevo más tarde.';
  }
});

/**
 * Handles Google OAuth registration button click by redirecting to the backend Google auth endpoint.
 */
document.getElementById('google-login').addEventListener('click', () => {
  window.location.href = '/api/auth/google';
});

/**
 * On DOMContentLoaded, redirects if already logged in and manages menu toggle visibility for offcanvas UI.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  const token = localStorage.getItem('token') || localStorage.getItem('userToken');
  if (token) {
    window.location.href = '/appointment.html'; // or your dashboard page
    return;
  }
  
  const menuToggle = document.querySelector('#menu_toggle');
  const offcanvas = document.getElementById('sideNav');

  // Hide toggle button when offcanvas opens
  if (offcanvas && menuToggle) {
    offcanvas.addEventListener('show.bs.offcanvas', () => {
      menuToggle.style.display = 'none';
    });

    // Show toggle button again when offcanvas closes
    offcanvas.addEventListener('hidden.bs.offcanvas', () => {
      menuToggle.style.display = 'block';
    });
  }
});
