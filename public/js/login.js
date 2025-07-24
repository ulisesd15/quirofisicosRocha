//handle login form submission with async/await
document.getElementById('loginForm').addEventListener('submit', async (e) => {
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
            window.authManager.login(data.token, data.user);
            alert(data.message);
            window.location.href = '/appointment.html';
        } else {
            document.getElementById('loginMessage').textContent = data.error;
        }
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('loginMessage').textContent = 'Error al iniciar sesión';
    }
});

// Quick Admin Login Button
document.getElementById('quickAdminLogin').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: 'admin@quirofisicosrocha.com', 
                password: 'Password123!' 
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Use AuthManager to handle login
            window.authManager.login(data.token, data.user);
            alert('Admin login successful! Redirecting to admin panel...');
            window.location.href = '/adminOptions.html';
        } else {
            alert('Admin login failed: ' + data.error);
        }
    } catch (error) {
        console.error('Admin login error:', error);
        alert('Error during admin login');
    }
});

const menuToggle = document.getElementById('menu_toggle');

  
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
document.getElementById('google-login').addEventListener('click', () => {
  window.location.href = '/api/auth/google';
});
