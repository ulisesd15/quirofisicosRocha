// middleware/requireAdmin.js
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'yourJwtSecret';

module.exports = function requireAdmin(req, res, next) {
  // Debug: Log incoming headers and token
  console.log('[requireAdmin] Authorization header:', req.headers.authorization);
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    console.log('[requireAdmin] Extracted token:', token);
    try {
      const decoded = jwt.verify(token, SECRET);
      console.log('[requireAdmin] Decoded JWT:', decoded);
      if (decoded) {
        console.log('[requireAdmin] JWT user id:', decoded.id);
        console.log('[requireAdmin] JWT user email:', decoded.email);
        console.log('[requireAdmin] JWT user role:', decoded.role);
      }
      if (decoded && decoded.role === 'admin') {
        req.user = decoded; // Attach user info to req
        console.log('[requireAdmin] Admin access granted for:', decoded.email || decoded.id);
        return next();
      } else {
        console.warn('[requireAdmin] JWT role is not admin:', decoded.role);
        return res.status(403).json({ error: 'Access denied. Admins only.' });
      }
    } catch (err) {
      console.error('[requireAdmin] JWT verification error:', err);
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
  }

  // Fallback to session-based authentication (if used)
    if (req.isAuthenticated && req.isAuthenticated()) {
      console.log('[requireAdmin] Session req.user:', req.user);
      if (req.user && req.user.role === 'admin') {
        console.log('[requireAdmin] Session admin access granted for:', req.user.email || req.user.id);
        return next();
      } else {
        console.warn('[requireAdmin] Session user is not admin:', req.user ? req.user.role : null);
        return res.status(403).json({ error: 'Access denied. Admins only.' });
      }
    }

  console.warn('[requireAdmin] No valid JWT or session found. Unauthorized.');
  return res.status(401).json({ error: 'Unauthorized. Please log in.' });
};

