/**
 * authRoutes.js
 *
 * Handles authentication and user profile routes for the Quirofísicos Rocha backend.
 * - Supports local login/register and Google OAuth.
 * - Issues JWT tokens for authenticated sessions.
 * - Provides user profile and authentication endpoints.
 * - Uses Passport.js for OAuth and JWT for session management.
 */

const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const authenticateToken = require('../middleware/authenticateToken');
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Returns the authenticated user's profile (requires JWT).
 */
router.get('/profile', authenticateToken, (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    db.query('SELECT id, full_name, email, phone, role, auth_provider, is_verified, created_at FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user profile:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Return the full user profile
        res.json(results[0]);
    });
});

// Traditional authentication routes

/**
 * Initiates Google OAuth authentication.
 */
router.get('/google', (req, res, next) => {
  console.log('🚀 Starting Google OAuth authentication');
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

/**
 * Handles Google OAuth callback and issues JWT token.
 */
router.get('/google/callback',
  (req, res, next) => {
    console.log('🔄 Google OAuth callback received');
    console.log('Query params:', req.query);
    passport.authenticate('google', { 
      session: false, 
      failureRedirect: '/login.html?error=oauth_failed' 
    })(req, res, next);
  },
  (req, res) => {
    console.log('✅ Google OAuth success, generating token');
    const { token } = req.user; // token is generated in passport.js
    res.redirect(`/authSuccess.html?token=${token}`);
  },
  // Error handler
  (err, req, res, next) => {
    console.error('❌ Google OAuth error:', err);
    res.redirect('/login.html?error=oauth_failed');
  }
);

/**
 * Authenticates a user with email and password, returns JWT on success.
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  console.log('🔐 Login attempt for:', email);
  db.query(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (err, results) => {
      if (err) {
        console.error('Database error during login:', err);
        return res.status(500).json({ success: false, message: 'Error del servidor' });
      }
      if (results.length === 0) {
        console.log('❌ No user found with email:', email);
        return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
      }
      const user = results[0];
      console.log('✅ User found:', { id: user.id, email: user.email, role: user.role });
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          console.error('Bcrypt error:', err);
          return res.status(500).json({ success: false, message: 'Error del servidor' });
        }
        if (!isMatch) {
          console.log('❌ Password mismatch for user:', email);
          return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '2h' });
        console.log('✅ Login successful for:', email);
        res.status(200).json({
          success: true,
          message: 'Inicio de sesión exitoso',
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role || 'user'
          },
          token: token
        });
      });
    }
  );
});

/**
 * Registers a new user with email, phone, and password, returns JWT on success.
 */
router.post('/auth/register', async (req, res) => {
  const { full_name, phone, email, password } = req.body;
  if (!full_name || !phone || !email || !password) {
    return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertUserSql = `INSERT INTO users (full_name, email, phone, password, role, auth_provider, created_at) VALUES (?, ?, ?, ?, 'user', 'local', NOW())`;
    db.query(insertUserSql, [full_name, email, phone, hashedPassword], (err, results) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ success: false, message: 'El correo ya está registrado' });
        }
        console.error('Error al registrar el usuario:', err);
        return res.status(500).json({ success: false, message: 'Error al registrar el usuario' });
      }
      const token = jwt.sign({ id: results.insertId, email, role: 'user' }, JWT_SECRET, { expiresIn: '2h' });
      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        user: {
          id: results.insertId,
          email: email,
          full_name: full_name,
          role: 'user'
        },
        token: token
      });
    });
  } catch (err) {
    console.error('Error hashing password:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

/**
 * PUT /auth/change-password
 * Allows a logged-in user to change their password.
 */
router.put('/auth/change-password', authenticateToken, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Todos los campos son requeridos.' });
    }

    // 1. Get the user's current password hash and auth provider
    db.query('SELECT password, auth_provider FROM users WHERE id = ?', [userId], async (err, results) => {
        if (err) {
            console.error('Error fetching user for password change:', err);
            return res.status(500).json({ error: 'Error del servidor.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const user = results[0];

        // 2. Disallow password change for non-local users (e.g., Google)
        if (user.auth_provider !== 'local') {
            return res.status(400).json({ error: 'No se puede cambiar la contraseña para cuentas de Google.' });
        }

        // 3. Compare the current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
        }

        // 4. Hash the new password and update the database
        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        db.query('UPDATE users SET password = ? WHERE id = ?', [newHashedPassword, userId], (updateErr) => {
            if (updateErr) {
                console.error('Error updating password:', updateErr);
                return res.status(500).json({ error: 'Error al actualizar la contraseña.' });
            }
            res.json({ message: 'Contraseña actualizada correctamente.' });
        });
    });
});

module.exports = router;
