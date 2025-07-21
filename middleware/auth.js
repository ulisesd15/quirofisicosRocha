const jwt = require('jsonwebtoken');
const secretKey = process.env.SECRET_KEY;

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    console.warn('No Authorization header provided');
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      console.error('JWT verification failed:', err.message);
      return res.status(403).json({ message: 'Token inválido o expirado' });
    }

    req.user = user; // Example: { id: 16, email: 'example@gmail.com', iat: ..., exp: ... }
    next();
  });
}

module.exports = authenticateToken;
