const express = require('express');
const router = express.Router();
const db = require('../config/connections');
const auth = require('../middleware/auth');

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  // First check if user is authenticated
  auth(req, res, (authErr) => {
    if (authErr) return authErr;
    
    // Check if user has admin role
    const userId = req.user.id;
    db.query('SELECT role FROM users WHERE id = ?', [userId], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (results.length === 0 || results[0].role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      next();
    });
  });
};

// =================
// DASHBOARD STATS
// =================
router.get('/dashboard/stats', requireAdmin, (req, res) => {
  const stats = {};
  
  // Get total users count
  db.query('SELECT COUNT(*) as total_users FROM users WHERE role = "user"', (err, userResults) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    stats.total_users = userResults[0].total_users;
    
    // Get total appointments count
    db.query('SELECT COUNT(*) as total_appointments FROM appointments', (err, appointmentResults) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      stats.total_appointments = appointmentResults[0].total_appointments;
      
      // Get appointments by status
      db.query(`
        SELECT status, COUNT(*) as count 
        FROM appointments 
        GROUP BY status
      `, (err, statusResults) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        stats.appointments_by_status = {};
        statusResults.forEach(row => {
          stats.appointments_by_status[row.status] = row.count;
        });
        
        // Get today's appointments
        db.query(`
          SELECT COUNT(*) as today_appointments 
          FROM appointments 
          WHERE DATE(date) = CURDATE()
        `, (err, todayResults) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          stats.today_appointments = todayResults[0].today_appointments;
          
          res.json(stats);
        });
      });
    });
  });
});

// =================
// USER MANAGEMENT
// =================

// Get all users (paginated)
router.get('/users', requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  
  let query = `
    SELECT id, full_name, email, phone, auth_provider, role, created_at 
    FROM users 
    WHERE role = 'user'
  `;
  let params = [];
  
  if (search) {
    query += ` AND (full_name LIKE ? OR email LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  
  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM users WHERE role = 'user'`;
    let countParams = [];
    
    if (search) {
      countQuery += ` AND (full_name LIKE ? OR email LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    db.query(countQuery, countParams, (err, countResults) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      res.json({
        users: results,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(countResults[0].total / limit),
          total_records: countResults[0].total,
          limit: limit
        }
      });
    });
  });
});

// Update user
router.put('/users/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;
  const { full_name, email, phone, role } = req.body;
  
  db.query(
    'UPDATE users SET full_name = ?, email = ?, phone = ?, role = ? WHERE id = ?',
    [full_name, email, phone, role, userId],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'Email already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ message: 'User updated successfully' });
    }
  );
});

// Delete user
router.delete('/users/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;
  
  db.query('DELETE FROM users WHERE id = ? AND role != "admin"', [userId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found or cannot delete admin' });
    }
    
    res.json({ message: 'User deleted successfully' });
  });
});

// =================
// APPOINTMENT MANAGEMENT
// =================

// Get all appointments (paginated and filtered)
router.get('/appointments', requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const offset = (page - 1) * limit;
  const status = req.query.status || '';
  const date = req.query.date || '';
  const search = req.query.search || '';
  
  let query = `
    SELECT a.*, u.full_name as user_name, u.email as user_email
    FROM appointments a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE 1=1
  `;
  let params = [];
  
  if (status) {
    query += ` AND a.status = ?`;
    params.push(status);
  }
  
  if (date) {
    query += ` AND DATE(a.date) = ?`;
    params.push(date);
  }
  
  if (search) {
    query += ` AND (a.full_name LIKE ? OR a.email LIKE ? OR a.phone LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  query += ` ORDER BY a.date DESC, a.time DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM appointments a WHERE 1=1`;
    let countParams = [];
    
    if (status) {
      countQuery += ` AND a.status = ?`;
      countParams.push(status);
    }
    
    if (date) {
      countQuery += ` AND DATE(a.date) = ?`;
      countParams.push(date);
    }
    
    if (search) {
      countQuery += ` AND (a.full_name LIKE ? OR a.email LIKE ? OR a.phone LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    db.query(countQuery, countParams, (err, countResults) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      res.json({
        appointments: results,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(countResults[0].total / limit),
          total_records: countResults[0].total,
          limit: limit
        }
      });
    });
  });
});

// Update appointment
router.put('/appointments/:id', requireAdmin, (req, res) => {
  const appointmentId = req.params.id;
  const { full_name, email, phone, date, time, note, status } = req.body;
  
  db.query(
    'UPDATE appointments SET full_name = ?, email = ?, phone = ?, date = ?, time = ?, note = ?, status = ? WHERE id = ?',
    [full_name, email, phone, date, time, note, status, appointmentId],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Appointment not found' });
      }
      
      res.json({ message: 'Appointment updated successfully' });
    }
  );
});

// Delete appointment
router.delete('/appointments/:id', requireAdmin, (req, res) => {
  const appointmentId = req.params.id;
  
  db.query('DELETE FROM appointments WHERE id = ?', [appointmentId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json({ message: 'Appointment deleted successfully' });
  });
});

// =================
// BUSINESS HOURS MANAGEMENT
// =================

// Get business hours
router.get('/business-hours', requireAdmin, (req, res) => {
  db.query('SELECT * FROM business_hours ORDER BY FIELD(day_of_week, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")', (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

// Update business hours
router.put('/business-hours/:id', requireAdmin, (req, res) => {
  const id = req.params.id;
  const { is_open, open_time, close_time, break_start, break_end } = req.body;
  
  db.query(
    'UPDATE business_hours SET is_open = ?, open_time = ?, close_time = ?, break_start = ?, break_end = ? WHERE id = ?',
    [is_open, open_time, close_time, break_start, break_end, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Business hour not found' });
      }
      
      res.json({ message: 'Business hours updated successfully' });
    }
  );
});

// =================
// CLINIC SETTINGS MANAGEMENT
// =================

// Get clinic settings
router.get('/settings', requireAdmin, (req, res) => {
  db.query('SELECT * FROM clinic_settings ORDER BY setting_key', (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    const settings = {};
    results.forEach(row => {
      settings[row.setting_key] = {
        value: row.setting_value,
        description: row.description
      };
    });
    
    res.json(settings);
  });
});

// Update clinic setting
router.put('/settings/:key', requireAdmin, (req, res) => {
  const settingKey = req.params.key;
  const { value } = req.body;
  
  db.query(
    'UPDATE clinic_settings SET setting_value = ? WHERE setting_key = ?',
    [value, settingKey],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Setting not found' });
      }
      
      res.json({ message: 'Setting updated successfully' });
    }
  );
});

module.exports = router;
