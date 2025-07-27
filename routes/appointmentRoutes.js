/**
 * Appointment Routes - Enhanced with SMS notifications and user verification
 */

const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const auth = require('../middleware/auth');

// Optional auth middleware (user can be authenticated or not)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    // If auth header exists, validate the token
    auth(req, res, next);
  } else {
    // If no auth header, continue without user info
    req.user = null;
    next();
  }
};

// Create appointment (with SMS notifications)
router.post('/', optionalAuth, appointmentController.createAppointment);

module.exports = router;