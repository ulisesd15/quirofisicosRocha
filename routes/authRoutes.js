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
// const authController = require('../controllers/authController');
const secretKey = process.env.SECRET_KEY;

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

module.exports = router;
