const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/connections');
const JWT_SECRET = process.env.JWT_SECRET;

// Register new user (traditional signup)
const register = async (req, res) => {
  try {
    const { full_name, email, phone, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (results.length > 0) return res.status(400).json({ error: 'User already exists' });
      const hashedPassword = await bcrypt.hash(password, 10);
      db.query(
        'INSERT INTO users (full_name, email, phone, password, role, auth_provider) VALUES (?, ?, ?, ?, ?, ?)',
        [full_name, email, phone, hashedPassword, 'user', 'local'],
        (insertErr, result) => {
          if (insertErr) return res.status(500).json({ error: 'Failed to create user' });
          const token = jwt.sign({ id: result.insertId, email, role: 'user' }, JWT_SECRET, { expiresIn: '2h' });
          res.status(201).json({
            message: 'User created successfully',
            token,
            user: { id: result.insertId, full_name, email, phone, role: 'user' }
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login user (traditional login)
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
      const user = results[0];
      if (user.auth_provider !== 'local') {
        return res.status(400).json({ error: 'Please sign in with Google', provider: user.auth_provider });
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) return res.status(401).json({ error: 'Invalid credentials' });
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
      res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, full_name: user.full_name, email: user.email, phone: user.phone, role: user.role }
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  login
};