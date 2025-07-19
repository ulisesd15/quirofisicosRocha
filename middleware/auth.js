const jwt = require('jsonwebtoken');
const secretKey = process.env.SECRET_KEY;

// Middleware to authenticate JWT
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'].split(' ')[1]; // Assuming Bearer token format

  if (!token) return res.sendStatus(401); // Unauthorized

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403); // Forbidden
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;