const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const db = require('../config/connections');
const auth = require('../middleware/auth');
const authController = require('../controllers/authController');
const secretKey = process.env.SECRET_KEY;

// Traditional authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, authController.updateProfile);
router.put('/change-password', auth, authController.changePassword);

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login.html' }),
  (req, res) => {
    const { token } = req.user; // token is generated in passport.js
    res.redirect(`/authSuccess.html?token=${token}`);
  }
);

module.exports = router;
