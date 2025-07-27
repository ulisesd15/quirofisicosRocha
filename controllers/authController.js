const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/connections');
const secretKey = process.env.SECRET_KEY;

// Register new user (traditional signup)
const register = async (req, res) => {
  try {
    const { full_name, email, phone, password } = req.body;

    // Check if user already exists
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user
      const insertSql = `
        INSERT INTO users (full_name, email, phone, password, auth_provider)
        VALUES (?, ?, ?, ?, ?)
      `;

      db.query(insertSql, [full_name, email, phone, hashedPassword, 'local'], (insertErr, result) => {
        if (insertErr) {
          console.error('Insert error:', insertErr);
          return res.status(500).json({ error: 'Failed to create user' });
        }

        // Generate token
        const token = jwt.sign({ 
          id: result.insertId, 
          email,
          role: 'user' 
        }, secretKey, { expiresIn: '2h' });
        
        res.status(201).json({
          message: 'User created successfully',
          token,
          user: {
            id: result.insertId,
            full_name,
            email,
            phone
          }
        });
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login user (traditional login)
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = results[0];

      // Check if user registered with OAuth
      if (user.auth_provider !== 'local') {
        return res.status(400).json({ 
          error: 'Please sign in with Google',
          provider: user.auth_provider 
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign({ 
        id: user.id, 
        email: user.email,
        role: user.role 
      }, secretKey, { expiresIn: '2h' });

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role
        }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user profile
const getProfile = (req, res) => {
  const userId = req.user.id;

  db.query('SELECT id, full_name, email, phone, auth_provider FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(results[0]);
  });
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, phone } = req.body;

    db.query(
      'UPDATE users SET full_name = ?, phone = ? WHERE id = ?',
      [full_name, phone, userId],
      (err, result) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Profile updated successfully' });
      }
    );
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change password (only for local auth users)
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Get user details
    db.query('SELECT * FROM users WHERE id = ?', [userId], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = results[0];

      // Check if user is using OAuth
      if (user.auth_provider !== 'local') {
        return res.status(400).json({ 
          error: 'Cannot change password for OAuth users'
        });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      db.query(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedNewPassword, userId],
        (updateErr) => {
          if (updateErr) {
            console.error('Password update error:', updateErr);
            return res.status(500).json({ error: 'Failed to update password' });
          }

          res.json({ message: 'Password updated successfully' });
        }
      );
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
};
