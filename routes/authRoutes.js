const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const db = require('../config/connections');
const authenticateToken = require('../middleware/authenticateToken');

// Return authenticated user's profile
router.get('/profile', authenticateToken, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Return basic user info
  const { id, email, role } = req.user;
  res.json({ id, email, role });
});

// Traditional authentication routes

// Google OAuth routes
router.get('/google', (req, res, next) => {
  console.log('🚀 Starting Google OAuth authentication');
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

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


// Traditional email/password login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  // Query user by email
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('Login DB error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!results || results.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const user = results[0];
    // Compare password (assuming passwords are hashed with bcrypt)
    const bcrypt = require('bcryptjs');
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error('Bcrypt error:', err);
        return res.status(500).json({ error: 'Error interno' });
      }
      if (!isMatch) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }
      // Generate JWT
      const payload = { id: user.id, email: user.email, role: user.role, full_name: user.full_name };
      const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
      res.json({
        message: 'Inicio de sesión exitoso',
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          role: user.role
        }
      });
    });
  });
});

module.exports = router;
