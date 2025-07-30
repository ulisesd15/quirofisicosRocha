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
    
    // Check if user has admin role from JWT token
    if (req.user.role !== 'admin') {
      console.warn('Non-admin user tried to access admin endpoint:', req.user.email);
      return res.status(403).json({ message: 'Acceso denegado. Se requieren privilegios de administrador.' });
    }
    
    next();
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
    // Count users requiring verification
    `SELECT COUNT(*) as pendingUsers FROM users WHERE requires_verification = 1 AND is_verified = 0 AND role = 'user'`
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
      SELECT id, full_name as name, email, phone, 
             DATE_FORMAT(date, '%Y-%m-%d') as appointment_date, 
             TIME_FORMAT(time, '%H:%i') as appointment_time, 
             status, created_at
      FROM appointments 
      ORDER BY created_at DESC 
      LIMIT 5
    `, (err, recentAppointments) => {
      if (err) {
        console.error('Recent appointments query error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({
        totalUsers: results[0].totalUsers || 0,
        totalAppointments: results[1].totalAppointments || 0,
        todayAppointments: results[2].todayAppointments || 0,
        pendingAppointments: results[3].pendingUsers || 0,
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
    SELECT id, full_name as name, email, phone, auth_provider as provider, role, created_at 
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

// Get single user
router.get('/users/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;
  
  db.query(
    'SELECT id, full_name as name, email, phone, auth_provider as provider, role, created_at FROM users WHERE id = ?',
    [userId], 
    (err, results) => {
      if (err) {
        console.error('Error fetching user:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ user: results[0] });
    }
  );
});

// Update user
router.put('/users/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;
  const { name, full_name, email, phone, role } = req.body;
  
  // Accept both 'name' and 'full_name' for backward compatibility
  const userName = name || full_name;
  
  db.query(
    'UPDATE users SET full_name = ?, email = ?, phone = ?, role = ? WHERE id = ?',
    [userName, email, phone, role, userId],
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
    SELECT a.*, 
           COALESCE(a.full_name, u.full_name) as name,
           COALESCE(a.email, u.email) as email,
           COALESCE(a.phone, u.phone) as phone,
           a.date as appointment_date,
           a.time as appointment_time,
           u.full_name as user_name, 
           u.email as user_email
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

// =================
// APPOINTMENT MANAGEMENT WITH SMS
// =================

const appointmentController = require('../controllers/appointmentController');

// Get pending appointments (must be before /:id route)
router.get('/appointments/pending', requireAdmin, appointmentController.getPendingAppointments);

// Send appointment reminders (must be before /:id route)
router.post('/appointments/send-reminders', requireAdmin, appointmentController.sendAppointmentReminders);

// Get single appointment
router.get('/appointments/:id', requireAdmin, (req, res) => {
  const appointmentId = req.params.id;
  
  db.query(`
    SELECT a.*, 
           COALESCE(a.full_name, u.full_name) as name,
           COALESCE(a.email, u.email) as email,
           COALESCE(a.phone, u.phone) as phone,
           a.date as appointment_date,
           a.time as appointment_time,
           u.full_name as user_name, 
           u.email as user_email
    FROM appointments a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.id = ?
  `, [appointmentId], (err, results) => {
    if (err) {
      console.error('Error fetching appointment:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json({ appointment: results[0] });
  });
});

// Update appointment
router.put('/appointments/:id', requireAdmin, (req, res) => {
  const appointmentId = req.params.id;
  const { name, full_name, email, phone, date, time, note, status } = req.body;
  
  // Accept both 'name' and 'full_name' for backward compatibility
  const appointmentName = name || full_name;
  
  db.query(
    'UPDATE appointments SET full_name = ?, email = ?, phone = ?, date = ?, time = ?, note = ?, status = ? WHERE id = ?',
    [appointmentName, email, phone, date, time, note, status, appointmentId],
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

// Approve appointment (with SMS notification)
router.post('/appointments/:id/approve', requireAdmin, appointmentController.approveAppointment);

// =================
// USER VERIFICATION WITH SMS
// =================

// Get unverified users (using different path to avoid conflict)
router.get('/users-unverified', requireAdmin, appointmentController.getUnverifiedUsers);

// Verify user
router.post('/users/:id/verify', requireAdmin, appointmentController.verifyUser);

// Update pending users endpoint to use the new unverified users
router.get('/approval/pending-users', requireAdmin, appointmentController.getUnverifiedUsers);

// =================
// BUSINESS HOURS MANAGEMENT
// =================

// Get business hours
router.get('/business-hours', requireAdmin, (req, res) => {
  db.query(`SELECT id, LOWER(day_of_week) as day_of_week, is_open, 
           TIME_FORMAT(open_time, '%H:%i') as open_time,
           TIME_FORMAT(close_time, '%H:%i') as close_time,
           TIME_FORMAT(break_start, '%H:%i') as break_start,
           TIME_FORMAT(break_end, '%H:%i') as break_end,
           updated_at
           FROM business_hours 
           ORDER BY FIELD(day_of_week, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")`, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ businessHours: results });
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

// Update multiple clinic settings
router.put('/settings', requireAdmin, (req, res) => {
  const { settings } = req.body;
  
  if (!settings || !Array.isArray(settings)) {
    return res.status(400).json({ error: 'Settings array is required' });
  }

  // Prepare promises for all setting updates
  const updatePromises = settings.map(setting => {
    return new Promise((resolve, reject) => {
      const { key, value } = setting;
      
      // First try to update existing setting
      db.query(
        'UPDATE clinic_settings SET setting_value = ? WHERE setting_key = ?',
        [value, key],
        (updateErr, updateResult) => {
          if (updateErr) return reject(updateErr);
          
          // If no rows were affected, insert new setting
          if (updateResult.affectedRows === 0) {
            db.query(
              'INSERT INTO clinic_settings (setting_key, setting_value) VALUES (?, ?)',
              [key, value],
              (insertErr) => {
                if (insertErr) return reject(insertErr);
                resolve();
              }
            );
          } else {
            resolve();
          }
        }
      );
    });
  });

  // Execute all updates
  Promise.all(updatePromises)
    .then(() => {
      res.json({ message: 'Settings updated successfully' });
    })
    .catch(err => {
      console.error('Error updating settings:', err);
      res.status(500).json({ error: 'Database error' });
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

// Save scheduled business hours changes
router.post('/schedule/business-hours', requireAdmin, scheduleController.saveScheduledBusinessHours);

// Get available time slots for a date
router.get('/schedule/available-slots/:date', requireAdmin, scheduleController.getAvailableSlots);

// Get clinic statistics (including schedule stats)
router.get('/schedule/stats', requireAdmin, scheduleController.getClinicStats);

// =================
// HOLIDAY TEMPLATES MANAGEMENT
// =================

// Holiday templates CRUD
router.get('/schedule/holiday-templates', requireAdmin, scheduleController.getHolidayTemplates);
router.post('/schedule/holiday-templates', requireAdmin, scheduleController.createHolidayTemplate);
router.put('/schedule/holiday-templates/:id', requireAdmin, scheduleController.updateHolidayTemplate);
router.delete('/schedule/holiday-templates/:id', requireAdmin, scheduleController.deleteHolidayTemplate);

// Generate yearly holidays from templates
router.post('/schedule/generate-holidays/:year', requireAdmin, scheduleController.generateYearlyHolidays);

// Annual closures CRUD
router.get('/schedule/annual-closures', requireAdmin, scheduleController.getAnnualClosures);
router.post('/schedule/annual-closures', requireAdmin, scheduleController.createAnnualClosure);
router.put('/schedule/annual-closures/:id', requireAdmin, scheduleController.updateAnnualClosure);
router.delete('/schedule/annual-closures/:id', requireAdmin, scheduleController.deleteAnnualClosure);

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

// Get recent approvals for admin dashboard
router.get('/approval/recent', requireAdmin, (req, res) => {
  // For now, return recent user registrations as a placeholder
  db.query(`
    SELECT id, email, full_name, created_at, role
    FROM users 
    WHERE role != 'admin'
    ORDER BY created_at DESC 
    LIMIT 5
  `, (err, results) => {
    if (err) {
      console.error('Database error in /approval/recent:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// =================
// BUSINESS HOURS MANAGEMENT
// =================

// Get business hours
router.get('/business-hours', requireAdmin, (req, res) => {
  db.query(`SELECT id, LOWER(day_of_week) as day_of_week, is_open, 
           TIME_FORMAT(open_time, '%H:%i') as open_time,
           TIME_FORMAT(close_time, '%H:%i') as close_time,
           TIME_FORMAT(break_start, '%H:%i') as break_start,
           TIME_FORMAT(break_end, '%H:%i') as break_end,
           updated_at
           FROM business_hours 
           ORDER BY FIELD(day_of_week, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")`, (err, results) => {
    if (err) {
      console.error('Error fetching business hours:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ businessHours: results });
  });
});

// Update business hours
router.put('/business-hours', requireAdmin, (req, res) => {
  const { businessHours } = req.body;
  
  if (!businessHours || !Array.isArray(businessHours)) {
    return res.status(400).json({ error: 'Invalid business hours data' });
  }

  // Delete existing business hours
  db.query('DELETE FROM business_hours', (err) => {
    if (err) {
      console.error('Error deleting business hours:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Insert new business hours
    const values = businessHours.map(day => [
      day.day_of_week,
      day.is_open || false,
      day.is_open ? day.open_time : null,
      day.is_open ? day.close_time : null,
      day.is_open ? day.break_start : null,
      day.is_open ? day.break_end : null
    ]);

    const query = 'INSERT INTO business_hours (day_of_week, is_open, open_time, close_time, break_start, break_end) VALUES ?';
    
    db.query(query, [values], (err, result) => {
      if (err) {
        console.error('Error inserting business hours:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Business hours updated successfully', id: result.insertId });
    });
  });
});

// =================
// SCHEDULE EXCEPTIONS MANAGEMENT
// =================

// Get schedule exceptions
router.get('/schedule-exceptions', requireAdmin, (req, res) => {
  db.query('SELECT * FROM schedule_exceptions WHERE is_active = TRUE ORDER BY start_date', (err, results) => {
    if (err) {
      console.error('Error fetching schedule exceptions:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Add schedule exception
router.post('/schedule-exceptions', requireAdmin, (req, res) => {
  const {
    exception_type,
    start_date,
    end_date,
    is_closed,
    custom_open_time,
    custom_close_time,
    custom_break_start,
    custom_break_end,
    reason,
    description,
    recurring_type
  } = req.body;

  const query = `
    INSERT INTO schedule_exceptions 
    (exception_type, start_date, end_date, is_closed, custom_open_time, custom_close_time, 
     custom_break_start, custom_break_end, reason, description, recurring_type, is_active) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
  `;

  const values = [
    exception_type || 'single_day',
    start_date,
    end_date || null,
    is_closed || false,
    custom_open_time || null,
    custom_close_time || null,
    custom_break_start || null,
    custom_break_end || null,
    reason || '',
    description || '',
    recurring_type || null
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error adding schedule exception:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Schedule exception added successfully', id: result.insertId });
  });
});

// Update schedule exception
router.put('/schedule-exceptions/:id', requireAdmin, (req, res) => {
  const exceptionId = req.params.id;
  const {
    exception_type,
    start_date,
    end_date,
    is_closed,
    custom_open_time,
    custom_close_time,
    custom_break_start,
    custom_break_end,
    reason,
    description,
    recurring_type,
    is_active
  } = req.body;

  const query = `
    UPDATE schedule_exceptions 
    SET exception_type = ?, start_date = ?, end_date = ?, is_closed = ?, 
        custom_open_time = ?, custom_close_time = ?, custom_break_start = ?, 
        custom_break_end = ?, reason = ?, description = ?, recurring_type = ?, 
        is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const values = [
    exception_type,
    start_date,
    end_date,
    is_closed,
    custom_open_time,
    custom_close_time,
    custom_break_start,
    custom_break_end,
    reason,
    description,
    recurring_type,
    is_active,
    exceptionId
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error updating schedule exception:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Schedule exception not found' });
    }
    
    res.json({ message: 'Schedule exception updated successfully' });
  });
});

// Delete schedule exception
router.delete('/schedule-exceptions/:id', requireAdmin, (req, res) => {
  const exceptionId = req.params.id;
  
  db.query('UPDATE schedule_exceptions SET is_active = FALSE WHERE id = ?', [exceptionId], (err, result) => {
    if (err) {
      console.error('Error deleting schedule exception:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Schedule exception not found' });
    }
    
    res.json({ message: 'Schedule exception deleted successfully' });
  });
});

// =================
// ANNOUNCEMENTS MANAGEMENT
// =================

// Get announcements
router.get('/announcements', requireAdmin, (req, res) => {
  const query = `
    SELECT a.*, u.full_name as created_by_name 
    FROM announcements a
    LEFT JOIN users u ON a.created_by = u.id
    WHERE a.is_active = TRUE
    ORDER BY a.priority DESC, a.created_at DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching announcements:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Get active announcements for public display
router.get('/announcements/public', (req, res) => {
  const query = `
    SELECT id, title, message, announcement_type, priority, start_date, end_date
    FROM announcements 
    WHERE is_active = TRUE 
      AND show_on_homepage = TRUE
      AND start_date <= CURDATE()
      AND (end_date IS NULL OR end_date >= CURDATE())
    ORDER BY priority DESC, created_at DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching public announcements:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Add announcement
router.post('/announcements', requireAdmin, (req, res) => {
  const {
    title,
    message,
    announcement_type,
    priority,
    start_date,
    end_date,
    show_on_homepage,
    show_on_booking
  } = req.body;

  if (!title || !message || !start_date) {
    return res.status(400).json({ error: 'Title, message, and start date are required' });
  }

  const query = `
    INSERT INTO announcements 
    (title, message, announcement_type, priority, start_date, end_date, 
     show_on_homepage, show_on_booking, created_by, is_active) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
  `;

  const values = [
    title,
    message,
    announcement_type || 'info',
    priority || 'normal',
    start_date,
    end_date || null,
    show_on_homepage !== undefined ? show_on_homepage : true,
    show_on_booking !== undefined ? show_on_booking : false,
    req.user.id
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error adding announcement:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Announcement added successfully', id: result.insertId });
  });
});

// Update announcement
router.put('/announcements/:id', requireAdmin, (req, res) => {
  const announcementId = req.params.id;
  const {
    title,
    message,
    announcement_type,
    priority,
    start_date,
    end_date,
    show_on_homepage,
    show_on_booking,
    is_active
  } = req.body;

  const query = `
    UPDATE announcements 
    SET title = ?, message = ?, announcement_type = ?, priority = ?, 
        start_date = ?, end_date = ?, show_on_homepage = ?, show_on_booking = ?, 
        is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const values = [
    title,
    message,
    announcement_type,
    priority,
    start_date,
    end_date,
    show_on_homepage,
    show_on_booking,
    is_active,
    announcementId
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error updating announcement:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    res.json({ message: 'Announcement updated successfully' });
  });
});

// Delete announcement
router.delete('/announcements/:id', requireAdmin, (req, res) => {
  const announcementId = req.params.id;
  
  db.query('UPDATE announcements SET is_active = FALSE WHERE id = ?', [announcementId], (err, result) => {
    if (err) {
      console.error('Error deleting announcement:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    res.json({ message: 'Announcement deleted successfully' });
  });
});

module.exports = router;
