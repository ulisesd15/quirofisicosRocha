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
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const authenticateToken = require('../middleware/authenticateToken');
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Returns the authenticated user's profile (requires JWT).
 */
router.get('/profile', authenticateToken, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    try {
        // Use attribute exclusion (not a raw string list) so Sequelize resolves
        // each field through the model's own `underscored: true` column mapping
        // (e.g. createdAt -> created_at). A raw ['createdAt', ...] list bypasses
        // that mapping and previously caused `Unknown column 'createdAt'` /
        // "Database error" on every profile request — confirmed via live testing.
        const user = await User.findByPk(userId, {
            attributes: { exclude: ['password', 'googleId'] }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        // User.toJSON() normalizes created_at/updated_at to camelCase for us.
        const { password, ...safeUser } = user.toJSON();
        res.json(safeUser);
    } catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).json({ error: 'Database error' });
    }
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
      failureRedirect: '/login.html?error=oauthFailed' 
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
    res.redirect('/login.html?error=oauthFailed');
  }
);

/**
 * Authenticates a user with email and password, returns JWT on success.
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('🔐 Login attempt for:', email);
  
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('❌ No user found with email:', email);
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    console.log('✅ User found:', { id: user.id, email: user.email, role: user.role });
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log('❌ Password mismatch for user:', email);
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
    console.log('✅ Login successful for:', email);
    res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role || 'user'
      },
      token: token
    });
  } catch (err) {
    console.error('Database error during login:', err);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

/**
 * Registers a new user with email, phone, and password, returns JWT on success.
 */
router.post('/register', async (req, res) => {
  const { fullName, phone, email, password } = req.body;
  if (!fullName || !phone || !email || !password) {
    return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      fullName,
      email,
      phone,
      password: hashedPassword,
      role: 'user',
      authProvider: 'local'
    });

    const token = jwt.sign({ id: newUser.id, email, role: 'user' }, JWT_SECRET, { expiresIn: '2h' });
    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user: {
        id: newUser.id,
        email: email,
        fullName: fullName,
        role: 'user'
      },
      token: token
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'El correo ya está registrado' });
    }
    console.error('Error al registrar el usuario:', err);
    res.status(500).json({ success: false, message: 'Error al registrar el usuario' });
  }
});

/**
 * PUT /auth/change-password
 * Allows a logged-in user to change their password.
 */
router.put('/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Todos los campos son requeridos.' });
    }

    try {
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

        if (user.authProvider !== 'local') {
            return res.status(400).json({ error: 'No se puede cambiar la contraseña para cuentas de Google.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
        }

        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        await user.update({ password: newHashedPassword });
        res.json({ message: 'Contraseña actualizada correctamente.' });
    } catch (err) {
        console.error('Error updating password:', err);
        res.status(500).json({ error: 'Error del servidor.' });
    }
});

module.exports = router;
