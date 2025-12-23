/**
 * authSuccess.js
 *
 * Handles the OAuth login redirect after authentication (e.g., Google OAuth).
 * - Extracts the token from the URL.
 * - Stores the token in localStorage for session persistence.
 * - Fetches the user profile using the token.
 * - Stores user info in localStorage or via a global authManager if available.
 * - Redirects the user to the main page on success, or to the login page on error.
 */

// --- Token Extraction Block ---
// Extracts the `token` parameter from the URL query string.

const params = new URLSearchParams(window.location.search);
const token = params.get('token');


if (token) {
    // --- Main Logic: If token is present ---
    // Store token in localStorage for session persistence
    localStorage.setItem('userToken', token);
    localStorage.setItem('token', token); // Keep both for compatibility

    // Fetch user profile using the token
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
        // --- On successful user profile fetch ---
        // Create user object
        const userObj = {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role || 'user'
        };

        // Use AuthManager to properly store login data if available
        if (window.authManager) {
            window.authManager.login(token, userObj);
        } else {
            // Fallback: store user info in localStorage
            localStorage.setItem('userId', user.id);
            localStorage.setItem('userName', user.fullName);
            localStorage.setItem('userRole', user.role || 'user');
        }

        // Redirect to main page
        window.location.href = '/index.html';
    })
    .catch(error => {
        // --- On error fetching user profile ---
        console.error('Error fetching user profile:', error);
        alert('Error al obtener información del usuario: ' + error.message);
        window.location.href = '/login.html';
    });
} else {
    // --- Main Logic: If no token is present ---
    console.error('No token received from Google OAuth');
    alert('Error al iniciar sesión con Google - No se recibió token');
    window.location.href = '/login.html';
}