// middleware/requireAdmin.js
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

module.exports = function requireAdmin(req, res, next) {
  // Check for JWT in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, SECRET);
      if (decoded && decoded.role === 'admin') {
        req.user = decoded; // Attach user info to req
        return next();
      } else {
        return res.status(403).json({ error: 'Access denied. Admins only.' });
      }
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
  }

  // Fallback to session-based authentication (if used)
  if (req.isAuthenticated && req.isAuthenticated()) {
    if (req.user && req.user.role === 'admin') {
      return next();
    } else {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }
  }

  return res.status(401).json({ error: 'Unauthorized. Please log in.' });
};
// server.js
const express = require('express');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const routes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Rate limiting middleware for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// Compression middleware
app.use(compression());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(passport.initialize());

// Mount API routers BEFORE static and catch-all routes
if (typeof authRoutes !== 'function' && typeof authRoutes !== 'object') {
  console.error('authRoutes is not a valid router. Check your export in routes/authRoutes.js');
} else {
  app.use('/api/auth', authLimiter, authRoutes);
}
if (typeof adminRoutes !== 'function' && typeof adminRoutes !== 'object') {
  console.error('adminRoutes is not a valid router. Check your export in routes/adminRoutes.js');
} else {
  app.use('/api/admin', adminRoutes);
}
if (typeof routes !== 'function' && typeof routes !== 'object') {
  console.error('routes is not a valid router. Check your export in routes/apiRoutes.js');
} else {
  app.use('/api', routes);
}

// Static file serving AFTER API routers
app.use(express.static('public'));
app.use('/admin', express.static('admin')); // Serve admin files under /admin path

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (isProduction) {
    res.status(500).json({ error: 'Something went wrong!' });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

