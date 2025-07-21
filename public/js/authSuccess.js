// Get token from URL
const params = new URLSearchParams(window.location.search);
const token = params.get('token');

if (token) {
    // Store token temporarily
    localStorage.setItem('token', token);
    
    // Fetch user profile to get complete user info
    fetch('/api/auth/profile', {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
    .then(res => res.json())
    .then(user => {
        // Create user object
        const userObj = {
            id: user.id,
            full_name: user.full_name,
            email: user.email
        };
        
        // Use AuthManager to properly store login data
        if (window.authManager) {
            window.authManager.login(token, userObj);
        } else {
            // Fallback if AuthManager isn't loaded yet
            localStorage.setItem('user_id', user.id);
            localStorage.setItem('user_name', user.full_name);
        }
        
        alert('Inicio de sesión con Google exitoso');
        window.location.href = '/appointment.html';
    })
    .catch(error => {
        console.error('Error fetching user profile:', error);
        alert('Error al obtener información del usuario');
        window.location.href = '/login.html';
    });
} else {
    alert('Error al iniciar sesión con Google');
    window.location.href = '/login.html';
}