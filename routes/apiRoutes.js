
const express = require('express');
const db = require('../config/connections');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/auth');
// const scheduleController = require('../controllers/scheduleController');
const appointmentController = require('../controllers/appointmentController');
const secretKey = process.env.SECRET_KEY;

// Get public clinic settings for display (name, address, phone, email)
router.get('/clinic-settings', (req, res) => {
  const keys = ['clinic_name', 'clinic_address', 'clinic_phone', 'clinic_email', 'clinic_description'];
  const placeholders = keys.map(() => '?').join(',');
  const sql = `SELECT setting_key, setting_value FROM clinic_settings WHERE setting_key IN (${placeholders})`;
  db.query(sql, keys, (err, results) => {
    if (err) {
      console.error('Error fetching clinic settings:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    const settings = {};
    results.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    res.json(settings);
  });
});

// Save new scheduled business hours (admin only)
router.post('/admin/scheduled-business-hours', (req, res) => {
  const { businessHours, effective_date } = req.body;
  if (!businessHours || !Array.isArray(businessHours) || !effective_date) {
    return res.status(400).json({ error: 'Missing businessHours array or effective_date' });
  }
  // Insert each day's business hours for the effective date
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
  req.db = req.db || require('../config/connections');
  req.db.query(sql, [values], (err, result) => {
    if (err) {
      console.error('Error saving scheduled business hours:', err);
      return res.status(500).json({ error: 'Error saving scheduled business hours' });
    }
    res.json({ message: 'Scheduled business hours saved', inserted: result.affectedRows });
  });
});

// --- Available Slots Endpoint ---
// Returns available slots for a given date using business hours and appointments
function generateTimeSlots(openTime, closeTime) {
  const slots = [];
  const [openHour, openMin] = openTime.split(':').map(Number);
  const [closeHour, closeMin] = closeTime.split(':').map(Number);
  let currentHour = openHour;
  let currentMin = openMin;
  while (currentHour < closeHour || (currentHour === closeHour && currentMin < closeMin)) {
    const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
    slots.push(timeStr);
    currentMin += 30;
    if (currentMin >= 60) {
      currentMin = 0;
      currentHour++;
    }
  }
  return slots;
}

router.get('/available-slots/:date', async (req, res) => {
  const dayISO = req.params.date;
  const dateObj = new Date(dayISO);
  if (isNaN(dateObj)) return res.status(400).json({ availableSlots: [] });
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = days[dateObj.getDay()];
  try {
    // Get the most recent scheduled business hours for this day_of_week and date
    const bhQuery = `
      SELECT * FROM scheduled_business_hours
      WHERE LOWER(day_of_week) = ?
        AND effective_date <= ?
        AND is_active = 1
      ORDER BY effective_date DESC
      LIMIT 1
    `;
    db.query(bhQuery, [dayOfWeek, dayISO], (err, results) => {
      if (err || !results || results.length === 0) return res.json({ availableSlots: [] });
      const bh = results[0];
      if (!bh.is_open) return res.json({ availableSlots: [] });
      const allSlots = generateTimeSlots(bh.open_time, bh.close_time);
      // Get taken appointments
      db.query('SELECT time FROM appointments WHERE date = ? AND status IN ("pending", "confirmed")', [dayISO], (err2, takenRows) => {
        if (err2) return res.json({ availableSlots: [] });
        const taken = takenRows.map(r => r.time);
        // Filter out taken slots
        let available = allSlots.filter(t => !taken.includes(t));
        // Filter out slots less than 30 min from now (if today)
        const now = new Date();
        const todayISO = now.toISOString().split('T')[0];
        if (dayISO === todayISO) {
          const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000);
          available = available.filter(timeSlot => {
            const slotDateTime = new Date(`${dayISO}T${timeSlot}:00`);
            return slotDateTime >= thirtyMinFromNow;
          });
        }
        res.json({ availableSlots: available });
      });
    });
  } catch (e) {
    res.json({ availableSlots: [] });
  }
});

// --- ROUTES ---

// Get Google Maps API key for frontend
router.get('/config/maps-key', (req, res) => {
  res.json({ 
    apiKey: process.env.GOOGLE_MAPS_API_KEY || null 
  });
});

// Get business hours for a specific date (using scheduled_business_hours)
router.get('/business-hours/:date', (req, res) => {
  const dayISO = req.params.date;
  const dateObj = new Date(dayISO);
  if (isNaN(dateObj)) return res.status(400).json({ business_hours: [] });
  // Always use this order to match frontend: Sunday (0) ... Saturday (6)
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const promises = days.map(dow => {
    return new Promise((resolve, reject) => {
      const bhQuery = `
        SELECT * FROM scheduled_business_hours
        WHERE LOWER(day_of_week) = ?
          AND effective_date <= ?
          AND is_active = 1
        ORDER BY effective_date DESC
        LIMIT 1
      `;
      db.query(bhQuery, [dow, dayISO], (err, results) => {
        if (err) return reject(err);
        if (results && results.length > 0) {
          // Force day_of_week to lowercase string
          const bh = results[0];
          bh.day_of_week = (bh.day_of_week || dow).toLowerCase();
          resolve(bh);
        } else {
          // Fallback to business_hours
          db.query(
            'SELECT * FROM business_hours WHERE LOWER(day_of_week) = ? AND is_active = 1 LIMIT 1',
            [dow],
            (err2, results2) => {
              if (err2 || !results2 || results2.length === 0) {
                resolve({ day_of_week: dow, is_open: false, open_time: null, close_time: null, break_start: null, break_end: null });
              } else {
                // Force day_of_week to lowercase string
                const bh2 = results2[0];
                bh2.day_of_week = (bh2.day_of_week || dow).toLowerCase();
                resolve(bh2);
              }
            }
          );
        }
      });
    });
  });

  Promise.all(promises).then(weekHours => {
    // Ensure correct order and all days present
    const ordered = days.map(dow => {
      const found = weekHours.find(bh => (bh.day_of_week || '').toLowerCase() === dow);
      if (found) return found;
      // Defensive: fill missing days as closed
      return { day_of_week: dow, is_open: false, open_time: null, close_time: null, break_start: null, break_end: null };
    });
    res.json({ business_hours: ordered });
  }).catch(() => {
    res.status(500).json({ business_hours: [] });
  });
});

// --- Business Hours Management ---
// router.put('/business-hours/:day_of_week', authenticateToken, scheduleController.updateBusinessHours);

// --- Scheduled Business Hours Management ---
// router.get('/scheduled-business-hours', authenticateToken, scheduleController.getScheduledBusinessHours);
// router.post('/scheduled-business-hours', authenticateToken, scheduleController.addScheduledBusinessHours);
// router.put('/scheduled-business-hours/:id', authenticateToken, scheduleController.updateScheduledBusinessHours);
// router.delete('/scheduled-business-hours/:id', authenticateToken, scheduleController.deleteScheduledBusinessHours);

// --- Schedule Exceptions Management ---
// router.get('/schedule-exceptions', scheduleController.getScheduleOverrides);
// router.post('/schedule-exceptions', authenticateToken, scheduleController.addScheduleOverride);
// router.put('/schedule-exceptions/:id', authenticateToken, scheduleController.updateScheduleOverride);
// router.delete('/schedule-exceptions/:id', authenticateToken, scheduleController.deleteScheduleOverride);

// --- Blocked Time Slots Management ---
// router.get('/blocked-time-slots', authenticateToken, scheduleController.getBlockedTimeSlots);
// router.post('/blocked-time-slots', authenticateToken, scheduleController.addBlockedTimeSlot);
// router.delete('/blocked-time-slots/:id', authenticateToken, scheduleController.deleteBlockedTimeSlot);


//get all appointments
router.get('/appointments', authenticateToken, (req, res) => {
  db.query('SELECT * FROM appointments', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
}); 

// Create new appointment (allow both authenticated and guest users)
router.post('/appointments', (req, res) => {
  let { full_name, email, phone, date, time, note, user_id } = req.body;

  // Normalize empty user_id to null
  user_id = user_id ? user_id : null;

  // Validate required fields
  if (!full_name || !date || !time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if the time slot is already taken
  db.query('SELECT id FROM appointments WHERE date = ? AND time = ? AND status IN ("pending", "confirmed")', 
    [date, time], (err, existing) => {
    if (err) {
      console.error('Error checking existing appointments:', err);
      return res.status(500).json({ error: 'Database error checking availability' });
    }

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Time slot already taken', message: 'Este horario ya está ocupado' });
    }

    const appointmentData = { full_name, email, phone, date, time, note, user_id, status: 'pending' };

    db.query('INSERT INTO appointments SET ?', appointmentData, (err, result) => {
      if (err) {
        console.error('Error inserting appointment:', err);
        return res.status(500).json({ error: 'Database error', details: err });
      }
      // res.json({ message: 'Cita agendada correctamente', id: result.insertId });
    });
  });
});

// Update appointment
router.put('/appointments/:id', authenticateToken,(req, res) => {
  const { full_name, email, phone, date, time, note } = req.body;
  const appointmentId = req.params.id;
  const userId = req.user.id;
  
  // First verify the appointment belongs to the user (unless admin)
  const verifyQuery = req.user.role === 'admin' 
    ? 'SELECT * FROM appointments WHERE id = ?'
    : 'SELECT * FROM appointments WHERE id = ? AND user_id = ?';
  
  const verifyParams = req.user.role === 'admin' 
    ? [appointmentId]
    : [appointmentId, userId];
  
  db.query(verifyQuery, verifyParams, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada o no autorizada' });
    }

    // Update the appointment
    db.query(
      'UPDATE appointments SET full_name = ?, email = ?, phone = ?, date = ?, time = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      [full_name, email, phone, date, time, note, appointmentId], 
      (err, updateResult) => {
        if (err) return res.status(500).json({ error: 'Error actualizando la cita' });
        if (updateResult.affectedRows === 0) {
          return res.status(404).json({ error: 'Cita no encontrada' });
        }
        // res.json({ message: 'Cita actualizada exitosamente' });
      }
    );
  });
});

// Get user's own appointments (for "Mis Citas" page) - MUST come before :id route
router.get('/appointments/my-appointments', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const query = `
    SELECT id, full_name, email, phone, date, time, note, status, created_at, updated_at
    FROM appointments 
    WHERE user_id = ? 
    ORDER BY date DESC, time DESC
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error getting user appointments:', err);
      return res.status(500).json({ error: 'Error getting appointments' });
    }
    
    res.json({ appointments: results });
  });
});

// Get single appointment by ID (for authenticated users)
router.get('/appointments/:id', authenticateToken, (req, res) => {
  const appointmentId = req.params.id;
  const userId = req.user.id;
  
  // Verify the appointment belongs to the user (unless admin)
  const query = req.user.role === 'admin' 
    ? 'SELECT * FROM appointments WHERE id = ?'
    : 'SELECT * FROM appointments WHERE id = ? AND user_id = ?';
  
  const params = req.user.role === 'admin' 
    ? [appointmentId]
    : [appointmentId, userId];
  
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada o no autorizada' });
    }
    
    res.json(results[0]);
  });
});

// Test endpoint for reschedule (temporarily without auth for debugging)
router.get('/appointments-test/:id', (req, res) => {
  const appointmentId = req.params.id;
  
  db.query('SELECT * FROM appointments WHERE id = ?', [appointmentId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    
    res.json(results[0]);
  });
});

// Reschedule an appointment
router.put('/appointments/:id/reschedule', authenticateToken, appointmentController.rescheduleAppointment);
router.post('/appointments/:id/reschedule', authenticateToken, appointmentController.rescheduleAppointment);

// Get appointments by date (public endpoint for checking availability)
router.get('/appointments/date/:date', (req, res) => {
  const date = req.params.date;
  // Only return minimal info needed for availability checking
  db.query('SELECT time FROM appointments WHERE date = ? AND status IN ("pending", "confirmed")', [date], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Get full appointments by date (admin/authenticated endpoint)
router.get('/appointments/date/:date/full', authenticateToken, (req, res) => {
  const date = req.params.date;
  db.query('SELECT * FROM appointments WHERE date = ?', [date], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Get appointments by user ID
router.get('/appointments/user/:userId', authenticateToken,(req, res) => {
  const userId = req.params.userId;
  db.query('SELECT * FROM appointments WHERE user_id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Get appointments by user ID and date
router.get('/appointments/user/:userId/date/:date', authenticateToken,(req, res) => {
  const userId = req.params.userId;
  const date = req.params.date;
  db.query('SELECT * FROM appointments WHERE user_id = ? AND date = ?', [userId, date], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Get appointments by date and time
router.get('/appointments/date/:date/time/:time', authenticateToken,(req, res) => {
  const date = req.params.date;
  const time = req.params.time;
  db.query('SELECT * FROM appointments WHERE date = ? AND time = ?', [date, time], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

;

// Cancel appointment (user can cancel their own appointments) - MUST come before :id route
router.put('/appointments/:id/cancel', authenticateToken, (req, res) => {
  const appointmentId = req.params.id;
  const userId = req.user.id;
  
  // First check if the appointment belongs to the user
  const checkQuery = 'SELECT id FROM appointments WHERE id = ? AND user_id = ?';
  db.query(checkQuery, [appointmentId, userId], (err, results) => {
    if (err) {
      console.error('Error checking appointment ownership:', err);
      return res.status(500).json({ error: 'Error processing request' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Appointment not found or not authorized' });
    }
    
    // Update appointment status to cancelled
    const updateQuery = 'UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    db.query(updateQuery, ['cancelled', appointmentId], (err, result) => {
      if (err) {
        console.error('Error cancelling appointment:', err);
        return res.status(500).json({ error: 'Error cancelling appointment' });
      }
      
      res.json({ message: 'Appointment cancelled successfully' });
    });
  });
});

// Delete appointment
router.delete('/appointments/:id', authenticateToken,(req, res) => {
  db.query('DELETE FROM appointments WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.sendStatus(204);
  });
});


// Replace the existing /login route with /auth/login
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log('🔐 Login attempt for:', email);

  db.query(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (err, results) => {
      if (err) {
        console.error('Database error during login:', err);
        return res.status(500).json({ 
          success: false,
          message: 'Error del servidor' 
        });
      }
      
      if (results.length === 0) {
        console.log('❌ No user found with email:', email);
        return res.status(401).json({ 
          success: false,
          message: 'Credenciales inválidas' 
        });
      }
      
      const user = results[0];
      console.log('✅ User found:', { id: user.id, email: user.email, role: user.role });

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          console.error('Bcrypt error:', err);
          return res.status(500).json({ 
            success: false,
            message: 'Error del servidor' 
          });
        }

        if (!isMatch) {
          console.log('❌ Password mismatch for user:', email);
          return res.status(401).json({ 
            success: false,
            message: 'Credenciales inválidas' 
          });
        }

        const token = jwt.sign({ 
          id: user.id, 
          email: user.email, 
          role: user.role || 'user' 
        }, secretKey, { expiresIn: '2h' });
        
        console.log('✅ Login successful for:', email);

        res.status(200).json({
          success: true,
          message: 'Inicio de sesión exitoso',
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role || 'user'
          },
          token: token
        });
      });
    }
  );
});

// Also add the register route with proper structure
router.post('/auth/register', async (req, res) => {
  const { full_name, phone, email, password } = req.body;

  if (!full_name || !phone || !email || !password) {
    return res.status(400).json({ 
      success: false,
      message: "Faltan campos requeridos" 
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const insertUserSql = `
      INSERT INTO users (full_name, email, phone, password, role, auth_provider, created_at) 
      VALUES (?, ?, ?, ?, 'user', 'local', NOW())
    `;

    db.query(insertUserSql, [full_name, email, phone, hashedPassword], (err, results) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ 
            success: false,
            message: 'El correo ya está registrado' 
          });
        }
        console.error("Error al registrar el usuario:", err);
        return res.status(500).json({ 
          success: false,
          message: "Error al registrar el usuario" 
        });
      }

      const token = jwt.sign({ 
        id: results.insertId, 
        email,
        role: 'user'
      }, secretKey, { expiresIn: '2h' });

      res.status(201).json({
        success: true,
        message: "Usuario registrado exitosamente",
        user: {
          id: results.insertId,
          email: email,
          full_name: full_name,
          role: 'user'
        },
        token: token
      });
    });

  } catch (err) {
    console.error("Error hashing password:", err);
    res.status(500).json({ 
      success: false,
      message: "Error interno del servidor" 
    });
  }
});


//get all registered users
router.get("/registeredUsers", (req, res) => {
  db.query("SELECT * FROM users", (err, results) => {
    if (err) {
      console.error("Error al obtener los usuarios registrados:", err);
      return res.status(500).json({ message: "Error al obtener los usuarios registrados" });
    }
    res.status(200).json(results);
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.query(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (err, results) => {
      if (err) {
        console.error('Error en login:', err);
        return res.status(500).json({ message: 'Error del servidor' });
      }
      
      if (results.length === 0) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }
      
      const user = results[0];
      console.log('User found during login:', { id: user.id, email: user.email, role: user.role });

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) return res.status(500).json({ message: 'Error del servidor' });

        if (!isMatch) return res.status(401).json({ message: 'Credenciales inválidas' });

        const token = jwt.sign({ 
          id: user.id, 
          email: user.email, 
          role: user.role || 'user' 
        }, secretKey, { expiresIn: '2h' });
        
        console.log('JWT payload created:', { id: user.id, email: user.email, role: user.role || 'user' });

        res.status(200).json({
          // message: 'Inicio de sesión exitoso',
          user_id: user.id,
          token
        });
      });
    }
  );
});
