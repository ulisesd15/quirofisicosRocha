document.addEventListener('DOMContentLoaded', () => {
  // Handle login form submission
  const loginForm = document.getElementById('loginForm');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const email = formData.get('email');
      const password = formData.get('password');
      
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Use AuthManager to handle login
          if (window.authManager) {
            window.authManager.login(data.token, data.user);
          }
          
          alert(data.message);
          
          // Redirect based on user role
          if (data.user.role === 'admin') {
            window.location.href = '/admin/adminOptions.html';
          } else {
            window.location.href = '/appointment.html';
          }
        } else {
          const messageEl = document.getElementById('loginMessage');
          if (messageEl) {
            messageEl.textContent = data.error;
          }
        }
      } catch (error) {
        console.error('Login error:', error);
        const messageEl = document.getElementById('loginMessage');
        if (messageEl) {
          messageEl.textContent = 'Error al iniciar sesión';
        }
      }
    });
  }

  // Quick Admin Login Button
  const quickAdminBtn = document.getElementById('quickAdminLogin');
  
  if (quickAdminBtn) {
    quickAdminBtn.addEventListener('click', async () => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: 'admin@quirofisicosrocha.com', 
            password: 'admin123' 
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Use AuthManager to handle login
          if (window.authManager) {
            window.authManager.login(data.token, data.user);
          }
          
          // alert('Admin login successful! Redirecting to admin panel...');
          window.location.href = '/admin/adminOptions.html';
        } else {
          alert('Admin login failed: ' + data.error);
        }
      } catch (error) {
        console.error('Admin login error:', error);
        alert('Error during admin login');
      }
    });
  }

  // Google login handler
  const googleLoginBtn = document.getElementById('google-login');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => {
      window.location.href = '/api/auth/google';
    });
  }

  // Navigation menu handlers
  const menuToggle = document.getElementById('menu_toggle');
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
