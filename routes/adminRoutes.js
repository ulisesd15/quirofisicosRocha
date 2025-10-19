
/**
 * adminRoutes.js
 *
 * Express router for all admin-related endpoints in the medical appointment system.
 * Handles dashboard stats, business hours, schedule exceptions, user management, appointment management,
 * clinic settings, announcements, and notification testing. All routes are protected by requireAdmin middleware.
 *
 * Key Features:
 * - Dashboard statistics for admin panel
 * - CRUD for business hours and scheduled business hours
 * - Schedule exceptions (e.g., holidays, special hours)
 * - User management (CRUD, verification)
 * - Appointment management (CRUD, approval/rejection)
 * - Clinic settings management
 * - Announcements (CRUD, public display)
 * - Notification testing endpoints (email/SMS)
 */

const express = require('express');
const db = require('../config/database');
const requireAdmin = require('../middleware/requireAdmin');
const router = express.Router();


/**
 * GET /dashboard/stats
 * Returns statistics for the admin dashboard: user count, appointment counts, and recent appointments.
 */
router.get('/dashboard/stats', requireAdmin, async (req, res) => {
  try {
    // User count
    let totalUsers = 0, totalAppointments = 0, todayAppointments = 0, pendingAppointments = 0, recentAppointments = [];
    try {
      const [users] = await new Promise((resolve, reject) => {
        db.query('SELECT COUNT(*) as count FROM users', (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
      totalUsers = users.count || 0;
    } catch (err) {
      console.error('Error fetching user count:', err);
    }
    try {
      const [appointments] = await new Promise((resolve, reject) => {
        db.query('SELECT COUNT(*) as count FROM appointments', (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
      totalAppointments = appointments.count || 0;
    } catch (err) {
      console.error('Error fetching appointment count:', err);
    }
    try {
      const [today] = await new Promise((resolve, reject) => {
        db.query('SELECT COUNT(*) as count FROM appointments WHERE DATE(date) = CURDATE()', (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
      todayAppointments = today.count || 0;
    } catch (err) {
      console.error('Error fetching today appointments:', err);
    }
    try {
      const [pending] = await new Promise((resolve, reject) => {
        db.query('SELECT COUNT(*) as count FROM appointments WHERE status = "pending"', (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
      pendingAppointments = pending.count || 0;
    } catch (err) {
      console.error('Error fetching pending appointments:', err);
    }
    try {
      recentAppointments = await new Promise((resolve, reject) => {
        db.query('SELECT id, full_name, email, date, time, status FROM appointments ORDER BY date DESC, time DESC LIMIT 5', (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
    } catch (err) {
      console.error('Error fetching recent appointments:', err);
    }
    res.json({
      totalUsers,
      totalAppointments,
      todayAppointments,
      pendingAppointments,
      recentAppointments
    });
  } catch (error) {
    console.error('Error in dashboard stats endpoint:', error);
    res.status(500).json({ error: 'Error fetching dashboard stats' });
  }
});

// =================
// SCHEDULED BUSINESS HOURS MANAGEMENT
// =================

// Get business hours


// Update business hours

/**
 * PUT /business-hours/:id
 * Updates a single business hour entry by ID.
 */
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



/**
 * PUT /business-hours
 * Bulk update or insert business hours for all days of the week.
 */
router.put('/business-hours', requireAdmin, (req, res) => {
  const { businessHours } = req.body;
  if (!businessHours || !Array.isArray(businessHours)) {
    return res.status(400).json({ error: 'Invalid business hours data' });
  }
  const updatePromises = businessHours.map(hours => {
    return new Promise((resolve, reject) => {
      db.query(
        'SELECT id FROM business_hours WHERE LOWER(day_of_week) = LOWER(?)',
        [hours.day_of_week],
        (err, results) => {
          if (err) return reject(err);
          if (results.length === 0) {
            db.query(
              'INSERT INTO business_hours (day_of_week, is_open, open_time, close_time, break_start, break_end) VALUES (?, ?, ?, ?, ?, ?)',
              [hours.day_of_week, hours.is_open, hours.open_time, hours.close_time, hours.break_start || null, hours.break_end || null],
              (insertErr, insertResult) => {
                if (insertErr) return reject(insertErr);
                resolve(insertResult);
              }
            );
          } else {
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


  Promise.all(updatePromises)
    .then(() => {
      res.json({ message: 'Business hours updated successfully' });
    })
    .catch(err => {
      console.error('Error updating business hours:', err);
      res.status(500).json({ error: 'Database error updating business hours' });
    });
});



/**
 * GET /scheduled-business-hours
 * Returns all scheduled business hours, ordered by effective date and day of week.
 */
router.get('/scheduled-business-hours', requireAdmin, (req, res) => {
  db.query('SELECT * FROM scheduled_business_hours ORDER BY effective_date DESC, day_of_week', (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ scheduledBusinessHours: results });
  });
});

// Get single scheduled business hour by ID

/**
 * GET /scheduled-business-hours/:id
 * Returns a single scheduled business hour entry by ID.
 */
router.get('/scheduled-business-hours/:id', requireAdmin, (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM scheduled_business_hours WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'Scheduled business hour not found' });
    res.json({ scheduledBusinessHour: results[0] });
  });
});

// Create new scheduled business hours

/**
 * POST /scheduled-business-hours
 * Creates a new set of scheduled business hours for a given effective date.
 */
router.post('/scheduled-business-hours', requireAdmin, (req, res) => {
  const { businessHours, effective_date } = req.body;
  if (!businessHours || !Array.isArray(businessHours) || !effective_date) {
    return res.status(400).json({ error: 'Missing businessHours array or effective_date' });
  }
  const values = businessHours.map(bh => [
    bh.day_of_week,
    bh.is_open ? 1 : 0,
    bh.open_time || null,
    bh.close_time || null,
    bh.break_start || null,
    bh.break_end || null,
    effective_date,
    1 // is_active
  ]);

  
  const sql = `
    INSERT INTO scheduled_business_hours
      (day_of_week, is_open, open_time, close_time, break_start, break_end, effective_date, is_active)
    VALUES ?
  `;
  req.db = req.db || require('../config/database');
  req.db.query(sql, [values], (err, result) => {
    if (err) {
      console.error('Error saving scheduled business hours:', err);
      return res.status(500).json({ error: 'Error saving scheduled business hours' });
    }
    res.json({ message: 'Scheduled business hours saved', inserted: result.affectedRows });
  });
});


// Get schedule exceptions

/**
 * GET /schedule-exceptions
 * Returns all active schedule exceptions (e.g., holidays, special hours).
 */
router.get('/schedule-exceptions', requireAdmin, (req, res) => {
  db.query(`
    SELECT 
      id,
      exception_type,
      start_date,
      end_date,
      is_closed,
      TIME_FORMAT(custom_open_time, '%H:%i') as custom_open_time,
      TIME_FORMAT(custom_close_time, '%H:%i') as custom_close_time,
      TIME_FORMAT(custom_break_start, '%H:%i') as custom_break_start,
      TIME_FORMAT(custom_break_end, '%H:%i') as custom_break_end,
      reason,
      description,
      is_active,
      created_at,
      updated_at
    FROM schedule_exceptions 
    WHERE is_active = 1
    ORDER BY start_date DESC
  `, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ scheduleExceptions: results });
  });
});

// Add schedule exception

/**
 * POST /schedule-exceptions
 * Adds a new schedule exception (e.g., holiday, special hours).
 */
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

/**
 * PUT /schedule-exceptions/:id
 * Updates an existing schedule exception by ID.
 */
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

/**
 * DELETE /schedule-exceptions/:id
 * Soft-deletes a schedule exception by setting is_active to false.
 */
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
// USER MANAGEMENT
// =================

// Get all users (paginated)

/**
 * GET /users
 * Returns a paginated list of users, with optional search and role filtering.
 */
router.get('/users', requireAdmin, (req, res) => {
  console.log('DEBUG: /api/admin/users route hit');
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const roleFilter = req.query.role || '';
  
  let query = `
    SELECT id, full_name as name, email, phone, auth_provider as provider, role, created_at 
    FROM users 
    WHERE 1=1
  `;
  let params = [];
  
  // Role filter
  if (roleFilter) {
    query += ` AND role = ?`;
    params.push(roleFilter);
  }
  
  // Search filter
  if (search) {
    query += ` AND (full_name LIKE ? OR email LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  
  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM users WHERE 1=1`;
    let countParams = [];
    
    if (roleFilter) {
      countQuery += ` AND role = ?`;
      countParams.push(roleFilter);
    }
    
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

/**
 * GET /users/:id
 * Returns a single user by ID.
 */
router.get('/users/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;
  
  db.query(
    'SELECT id, full_name, email, phone, auth_provider as provider, role, created_at FROM users WHERE id = ?',
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

/**
 * PUT /users/:id
 * Updates a user's information by ID.
 */
router.put('/users/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;
  const { name, full_name, email, phone, role, provider } = req.body;
  
  // Accept both 'name' and 'full_name' for backward compatibility
  const userName = full_name || name;
  
  db.query(
    'UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, auth_provider = ? WHERE id = ?',
    [userName, email, phone, role, provider, userId],
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


// Update user role

/**
 * PUT /users/:id/role
 * Updates a user's role by ID.
 */
router.put('/users/:id/role', requireAdmin, (req, res) => {
    const { role } = req.body;
    const userId = req.params.id;

    if (!role || (role !== 'user' && role !== 'admin')) {
        return res.status(400).json({ error: 'Invalid role specified.' });
    }

    const query = 'UPDATE users SET role = ? WHERE id = ?';
    db.query(query, [role, userId], (err, result) => {
        if (err) {
            console.error("Error updating user role:", err);
            return res.status(500).json({ error: 'Database error while updating role.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ message: 'User role updated successfully.' });
    });
});

// Delete user

/**
 * DELETE /users/:id
 * Deletes a user by ID (cannot delete admin users).
 */
router.delete('/users/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;
  
  db.query('DELETE FROM users WHERE id = ? AND role != "admin"', [userId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found or cannot delete admin' });
    }
    
  });
});

// ADMIN: Verify a user

/**
 * PUT /users/:id/verify
 * Verifies a user (sets is_verified to true).
 */
router.put('/users/:id/verify', requireAdmin, (req, res) => {
  const userId = req.params.id;
  db.query('UPDATE users SET is_verified = 1, requires_verification = 0 WHERE id = ?', [userId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error verificando usuario' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Usuario verificado correctamente' });
  });
});

/**
 * PUT /approve-user/:userId
 * Verifies a user and confirms their first pending appointment.
 * This is a transactional operation.
 */
router.put('/approve-user/:userId', requireAdmin, async (req, res) => {
  const { userId } = req.params;
  // Note: smsController is not provided in context, assuming it exists.
  // const smsController = require('../controllers/smsController');

  db.beginTransaction(err => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ error: 'Error del servidor al iniciar la transacción.' });
    }

    // 1. Verify the user
    db.query('UPDATE users SET is_verified = true WHERE id = ?', [userId], (err, userResult) => {
      if (err) {
        return db.rollback(() => {
          console.error('Error verifying user:', err);
          res.status(500).json({ error: 'Error al verificar al usuario.' });
        });
      }
      if (userResult.affectedRows === 0) {
        return db.rollback(() => {
          res.status(404).json({ error: 'Usuario no encontrado.' });
        });
      }

      // 2. Confirm the user's pending appointment
      db.query("UPDATE appointments SET status = 'confirmed' WHERE user_id = ? AND status = 'pending' LIMIT 1", [userId], (err, appointmentResult) => {
        if (err) {
          return db.rollback(() => {
            console.error('Error confirming appointment:', err);
            res.status(500).json({ error: 'Error al confirmar la cita del usuario.' });
          });
        }

        // 3. Fetch user contact info for notification
        db.query('SELECT phone, email FROM users WHERE id = ?', [userId], (err, users) => {
          if (err || users.length === 0) {
            // Don't rollback, the main operations succeeded. Just log the notification failure.
            console.error('Could not fetch user details for notification after approval.');
          } else {
            const user = users[0];
            if (user.phone) {
              // Example: smsController.sendSms(user.phone, 'Tu cuenta ha sido verificada y tu cita confirmada.');
              console.log(`SMS notification would be sent to ${user.phone}`);
            }
          }

          // 4. Commit the transaction
          db.commit(err => {
            if (err) {
              return db.rollback(() => {
                console.error('Error committing transaction:', err);
                res.status(500).json({ error: 'Error al finalizar la transacción.' });
              });
            }
            res.json({ message: 'Usuario aprobado y cita confirmada correctamente.' });
          });
        });
      });
    });
  });
});

// =================
// APPOINTMENT MANAGEMENT
// =================

router.get('/appointments', requireAdmin, (req, res) => {
  console.log('DEBUG: /api/admin/appointments route hit');
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

// ADMIN: Get all unverified users

/**
 * GET /users/unverified
 * Returns all users who are not yet verified.
 */
router.get('/users/unverified', requireAdmin, (req, res) => {
  db.query('SELECT * FROM users WHERE is_verified = 0', (err, results) => {
    if (err) return res.status(500).json({ error: 'Error obteniendo usuarios no verificados' });
    res.json({ users: results });
  });
});

// Get single appointment

/**
 * GET /appointments/:id
 * Returns a single appointment by ID.
 */
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

/**
 * PUT /appointments/:id
 * Updates an appointment's details by ID.
 */
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


// Get all pending appointments

/**
 * GET /appointments/pending
 * Returns all appointments with status 'pending'.
 */
router.get('/appointments/pending', requireAdmin, (req, res) => {
  const query = `
    SELECT
      a.id as appointment_id,
      a.full_name, 
      a.date,
      a.time,
      a.note,
      a.created_at,
      a.status as appointment_status,
      u.id as user_id,
      u.email,
      u.phone,
      u.is_verified
    FROM appointments a
    JOIN users u ON a.user_id = u.id
    WHERE a.status = 'pending' 
      AND u.is_verified = false 
      AND u.role != 'admin'
    ORDER BY a.date, a.time;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error obteniendo citas pendientes de usuarios no verificados' });
    res.json(results);
  });
});

// Approve appointment (set status to confirmed)

/**
 * PUT /appointments/:id/reject
 * Rejects a pending appointment by setting its status to 'rejected'.
 */
router.put('/appointments/:id/reject', requireAdmin, (req, res) => {
  const appointmentId = req.params.id;
  db.query('UPDATE appointments SET status = "rejected", updated_at = CURRENT_TIMESTAMP WHERE id = ?', [appointmentId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error rechazando cita' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json({ message: 'Cita rechazada correctamente' });
  });
});

// Approve appointment (set status to confirmed)

/**
 * PUT /appointments/:id/approve
 * Approves an appointment (sets status to confirmed).
 */
router.put('/appointments/:id/approve', requireAdmin, (req, res) => {
  const appointmentId = req.params.id;

  // Start a transaction to ensure atomicity
  db.beginTransaction(err => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ error: 'Error del servidor al iniciar la transacción.' });
    }

    // 1. Get the user_id from the appointment
    db.query('SELECT user_id FROM appointments WHERE id = ?', [appointmentId], (err, appointments) => {
      if (err || appointments.length === 0) {
        return db.rollback(() => {
          res.status(404).json({ error: 'Cita no encontrada.' });
        });
      }

      const userId = appointments[0].user_id;

      // 2. Update the appointment status to 'confirmed'
      db.query('UPDATE appointments SET status = "confirmed", updated_at = CURRENT_TIMESTAMP WHERE id = ?', [appointmentId], (err, result) => {
        if (err || result.affectedRows === 0) {
          return db.rollback(() => {
            res.status(500).json({ error: 'Error al aprobar la cita.' });
          });
        }

        // 3. If there's a user associated, verify them
        if (userId) {
          db.query('UPDATE users SET is_verified = 1 WHERE id = ?', [userId], (err, userResult) => {
            if (err) {
              return db.rollback(() => {
                res.status(500).json({ error: 'Error al verificar al usuario.' });
              });
            }

            // All good, commit the transaction
            db.commit(err => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ error: 'Error al finalizar la transacción.' });
                });
              }
              // TODO: Add notification logic here (SMS/Email)
              res.json({ message: 'Cita aprobada y usuario verificado correctamente.' });
            });
          });
        } else {
          // No user to verify, just commit the appointment approval
          db.commit(err => {
            if (err) return db.rollback(() => res.status(500).json({ error: 'Error al finalizar la transacción.' }));
            res.json({ message: 'Cita de invitado aprobada correctamente.' });
          });
        }
      });
    });
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

// Server status endpoint for admin dashboard

/**
 * GET /server/status
 * Returns server health and resource usage for the admin dashboard.
 */
router.get('/server/status', requireAdmin, (req, res) => {
  res.json({
    is_healthy: true,
    uptime: process.uptime() + ' seconds',
    cpu_usage: Math.round(Math.random() * 100), // Replace with real CPU usage if needed
    memory_usage: Math.round(process.memoryUsage().rss / 1024 / 1024) // MB
  });
});

// Get recent approvals for admin dashboard

/**
 * GET /approval/recent
 * Returns recent user registrations for admin approval dashboard.
 */
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
    
    // res.json({ message: 'Announcement deleted successfully' });
  });
});

// =================
// NOTIFICATION TESTING ENDPOINTS
// =================

// Test email notification
router.post('/test-email-notification', requireAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    const adminEmail = req.user.email;
    
    // Import email service (you might need to adjust this path)
    const smsController = require('../controllers/smsController');
    
    // For now, we'll just log the email test since we don't have email service set up
    console.log('📧 Email test notification:');
    console.log('To:', adminEmail);
    console.log('Message:', message);
    
    // In a real implementation, you would send the email here
    // await emailService.sendTestEmail(adminEmail, message);
    
    res.json({ 
      success: true, 
      message: 'Test email logged successfully (email service not configured)',
      recipient: adminEmail
    });
    
  } catch (error) {
    console.error('Error testing email notification:', error);
    res.status(500).json({ error: 'Error sending test email' });
  }
});

// Test SMS notification
router.post('/test-sms-notification', requireAdmin, async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }
    
    // Import SMS service
    const smsController = require('../controllers/smsController');
    
    // Send test SMS
    const result = await smsController.sendTestSMS(phone, message);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Test SMS sent successfully',
        recipient: phone,
        messageId: result.messageId
      });
    } else {
      res.status(500).json({ error: result.error });
    }
    
  } catch (error) {
    console.error('Error testing SMS notification:', error);
    res.status(500).json({ error: 'Error sending test SMS' });
  }
});

// Server status endpoint for admin dashboard
router.get('/server/status', requireAdmin, (req, res) => {
  res.json({
    is_healthy: true,
    uptime: process.uptime() + ' seconds',
    cpu_usage: Math.round(Math.random() * 100), // Replace with real CPU usage if needed
    memory_usage: Math.round(process.memoryUsage().rss / 1024 / 1024) // MB
  });
});

router.get('/test', (req, res) => res.json({ ok: true }));

router.get('/test', (req, res) => {
  res.json({ ok: true, message: 'adminRoutes is working!' });
});

module.exports = router;