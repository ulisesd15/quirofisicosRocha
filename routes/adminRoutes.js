const express = require('express');
const router = express.Router();
const db = require('../config/connections');
const auth = require('../middleware/auth');
const scheduleController = require('../controllers/scheduleController');

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

// Main dashboard endpoint
router.get('/dashboard', requireAdmin, (req, res) => {
  const queries = [
    'SELECT COUNT(*) as totalUsers FROM users',
    'SELECT COUNT(*) as totalAppointments FROM appointments',
    'SELECT COUNT(*) as todayAppointments FROM appointments WHERE DATE(date) = CURDATE()',
    'SELECT COUNT(*) as pendingAppointments FROM appointments WHERE status = "pending"'
  ];

  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.query(query, (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      });
    });
  }))
  .then(results => {
    // Get recent appointments
    db.query(`
      SELECT id, full_name as name, email, phone, date as appointment_date, 
             time as appointment_time, status 
      FROM appointments 
      ORDER BY created_at DESC 
      LIMIT 5
    `, (err, recentAppointments) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      res.json({
        totalUsers: results[0].totalUsers || 0,
        totalAppointments: results[1].totalAppointments || 0,
        todayAppointments: results[2].todayAppointments || 0,
        pendingAppointments: results[3].pendingAppointments || 0,
        recentAppointments: recentAppointments || []
      });
    });
  })
  .catch(err => {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Database error' });
  });
});

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
  const start_date = req.query.start_date || '';
  const end_date = req.query.end_date || '';
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
  
  if (start_date && end_date) {
    query += ` AND DATE(a.date) BETWEEN ? AND ?`;
    params.push(start_date, end_date);
  } else if (start_date) {
    query += ` AND DATE(a.date) >= ?`;
    params.push(start_date);
  } else if (end_date) {
    query += ` AND DATE(a.date) <= ?`;
    params.push(end_date);
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
    
    if (start_date && end_date) {
      countQuery += ` AND DATE(a.date) BETWEEN ? AND ?`;
      countParams.push(start_date, end_date);
    } else if (start_date) {
      countQuery += ` AND DATE(a.date) >= ?`;
      countParams.push(start_date);
    } else if (end_date) {
      countQuery += ` AND DATE(a.date) <= ?`;
      countParams.push(end_date);
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

// Bulk update business hours
router.put('/business-hours', requireAdmin, (req, res) => {
  const { businessHours } = req.body;
  
  if (!businessHours || !Array.isArray(businessHours)) {
    return res.status(400).json({ error: 'Invalid business hours data' });
  }

  const updatePromises = businessHours.map(hours => {
    return new Promise((resolve, reject) => {
      // First, find the ID for this day
      db.query(
        'SELECT id FROM business_hours WHERE LOWER(day_of_week) = LOWER(?)',
        [hours.day_of_week],
        (err, results) => {
          if (err) return reject(err);
          
          if (results.length === 0) {
            // Insert new record if day doesn't exist
            db.query(
              'INSERT INTO business_hours (day_of_week, is_open, open_time, close_time, break_start, break_end) VALUES (?, ?, ?, ?, ?, ?)',
              [hours.day_of_week, hours.is_open, hours.open_time, hours.close_time, hours.break_start || null, hours.break_end || null],
              (insertErr, insertResult) => {
                if (insertErr) return reject(insertErr);
                resolve(insertResult);
              }
            );
          } else {
            // Update existing record
            const id = results[0].id;
            db.query(
              'UPDATE business_hours SET is_open = ?, open_time = ?, close_time = ?, break_start = ?, break_end = ?, updated_at = NOW() WHERE id = ?',
              [hours.is_open, hours.open_time, hours.close_time, hours.break_start || null, hours.break_end || null, id],
              (updateErr, updateResult) => {
                if (updateErr) return reject(updateErr);
                resolve(updateResult);
              }
            );
          }
        }
      );
    });
  });

  Promise.all(updatePromises)
    .then(() => {
      res.json({ message: 'Business hours updated successfully' });
    })
    .catch(err => {
      console.error('Error updating business hours:', err);
      res.status(500).json({ error: 'Database error updating business hours' });
    });
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

// =================
// SCHEDULE MANAGEMENT
// =================

// Get business hours
router.get('/schedule/business-hours', requireAdmin, scheduleController.getBusinessHours);

// Update business hours for a specific day
router.put('/schedule/business-hours/:day_of_week', requireAdmin, scheduleController.updateBusinessHours);

// Get available time slots for a date
router.get('/schedule/available-slots/:date', requireAdmin, scheduleController.getAvailableSlots);

// Get clinic statistics (including schedule stats)
router.get('/schedule/stats', requireAdmin, scheduleController.getClinicStats);

// =================
// ENHANCED SCHEDULE MANAGEMENT
// =================

// Scheduled Closures
router.get('/schedule/closures', requireAdmin, scheduleController.getScheduledClosures);
router.post('/schedule/closures', requireAdmin, scheduleController.addScheduledClosure);
router.delete('/schedule/closures/:id', requireAdmin, scheduleController.deleteScheduledClosure);

// Schedule Overrides
router.get('/schedule/overrides', requireAdmin, scheduleController.getScheduleOverrides);
router.post('/schedule/overrides', requireAdmin, scheduleController.addScheduleOverride);
router.delete('/schedule/overrides/:id', requireAdmin, scheduleController.deleteScheduleOverride);

// Blocked Time Slots
router.get('/schedule/blocked-slots', requireAdmin, scheduleController.getBlockedTimeSlots);
router.post('/schedule/blocked-slots', requireAdmin, scheduleController.addBlockedTimeSlot);
router.delete('/schedule/blocked-slots/:id', requireAdmin, scheduleController.deleteBlockedTimeSlot);

// =================
// BUSINESS DAYS MANAGEMENT
// =================
router.get('/schedule/business-days', requireAdmin, scheduleController.getBusinessDaysConfig);
router.put('/schedule/business-days', requireAdmin, scheduleController.updateBusinessDaysConfig);

// Week Exceptions
router.get('/schedule/week-exceptions', requireAdmin, scheduleController.getWeekExceptions);
router.post('/schedule/week-exceptions', requireAdmin, scheduleController.addWeekException);
router.delete('/schedule/week-exceptions/:id', requireAdmin, scheduleController.deleteWeekException);

// =================
// USER APPROVAL SYSTEM
// =================
router.get('/approval/settings', requireAdmin, scheduleController.getApprovalSettings);
router.put('/approval/settings', requireAdmin, scheduleController.updateApprovalSettings);
router.get('/approval/pending-users', requireAdmin, scheduleController.getPendingUsers);
router.post('/approval/users/:id/approve', requireAdmin, scheduleController.approveUser);
router.post('/approval/users/:id/reject', requireAdmin, scheduleController.rejectUser);

// =================
// ANNOUNCEMENTS MANAGEMENT
// =================
router.get('/announcements', requireAdmin, scheduleController.getAnnouncements);
router.post('/announcements', requireAdmin, scheduleController.addAnnouncement);
router.put('/announcements/:id', requireAdmin, scheduleController.updateAnnouncement);
router.delete('/announcements/:id', requireAdmin, scheduleController.deleteAnnouncement);

module.exports = router;
