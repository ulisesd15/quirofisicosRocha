// Get token from URL
const params = new URLSearchParams(window.location.search);
const token = params.get('token');

if (token) {
    // Process OAuth token
    
    // Store token temporarily
    localStorage.setItem('user_token', token);
    localStorage.setItem('token', token); // Keep both for compatibility
    
    // Fetch user profile to get complete user info
    fetch('/api/auth/profile', {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
    .then(res => {
        if (!res.ok) {
            throw new Error('Failed to fetch user profile: ' + res.status);
        }
        return res.json();
    })
    .then(user => {
        // User profile received
        
        // Create user object
        const userObj = {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role || 'user'
        };
        
        // Use AuthManager to properly store login data
        if (window.authManager) {
            window.authManager.login(token, userObj);
            // AuthManager login completed
        } else {
            // Fallback if AuthManager isn't loaded yet
            localStorage.setItem('user_id', user.id);
            localStorage.setItem('user_name', user.full_name);
            localStorage.setItem('user_role', user.role || 'user');
            // Fallback storage completed
        }
        
        
        window.location.href = '/index.html'; // Redirect to main page instead
    })
    .catch(error => {
        console.error('Error fetching user profile:', error);
        alert('Error al obtener información del usuario: ' + error.message);
        window.location.href = '/login.html';
    });
} else {
    console.error('No token received from Google OAuth');
    alert('Error al iniciar sesión con Google - No se recibió token');
    window.location.href = '/login.html';
}