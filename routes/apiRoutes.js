

const express = require('express');
const db = require('../config/connections');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/authenticateToken');
const JWT_SECRET = process.env.JWT_SECRET;

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
// Public endpoint: Get active schedule exceptions for calendar/frontend
router.get('/schedule-exceptions', (req, res) => {
  db.query('SELECT * FROM schedule_exceptions WHERE is_active = TRUE ORDER BY start_date', (err, results) => {
    if (err) {
      console.error('Error fetching schedule exceptions:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Get Google Maps API key for frontend
router.get('/config/maps-key', (req, res) => {
  res.json({ 
    apiKey: process.env.GOOGLE_MAPS_API_KEY || null 
  });
});

router.get('/business-hours', (req, res) => {
  db.query(`
    SELECT 
      id,
      day_of_week,
      is_open,
      TIME_FORMAT(open_time, '%H:%i') as open_time,
      TIME_FORMAT(close_time, '%H:%i') as close_time,
      TIME_FORMAT(break_start, '%H:%i') as break_start,
      TIME_FORMAT(break_end, '%H:%i') as break_end,
      updated_at
    FROM business_hours 
    ORDER BY FIELD(UPPER(day_of_week),  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')
  `, (err, results) => {
    if (err) {
      console.error('Error fetching business hours:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.json({ businessHours: results });
  });
});

// Get business hours for a specific date (uses scheduled-business-hours if available)
router.get('/business-hours/:date', (req, res) => {
  const dayISO = req.params.date;
  const dateObj = new Date(dayISO);
  if (isNaN(dateObj)) return res.status(400).json({ business_hours: [] });
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
          const bh = results[0];
          bh.day_of_week = (bh.day_of_week || dow).toLowerCase();
          resolve(bh);
        } else {
          db.query(
            'SELECT * FROM business_hours WHERE LOWER(day_of_week) = ? AND is_active = 1 LIMIT 1',
            [dow],
            (err2, results2) => {
              if (err2 || !results2 || results2.length === 0) {
                resolve({ day_of_week: dow, is_open: false, open_time: null, close_time: null, break_start: null, break_end: null });
              } else {
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
    const ordered = days.map(dow => {
      const found = weekHours.find(bh => (bh.day_of_week || '').toLowerCase() === dow);
      if (found) return found;
      return { day_of_week: dow, is_open: false, open_time: null, close_time: null, break_start: null, break_end: null };
    });
    res.json({ business_hours: ordered });
  }).catch(() => {
    res.status(500).json({ business_hours: [] });
  });
});

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

    // If user_id is present, check verification status
    function createAppointmentWithStatus(status) {
      const appointmentData = { full_name, email, phone, date, time, note, user_id, status };
      db.query('INSERT INTO appointments SET ?', appointmentData, (err, result) => {
        if (err) {
          console.error('Error inserting appointment:', err);
          return res.status(500).json({ error: 'Database error', details: err });
        }
        res.json({ message: 'Cita agendada correctamente', id: result.insertId, status });
      });
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

      if (user_id) {
        // Check user verification status
        db.query('SELECT is_verified FROM users WHERE id = ?', [user_id], (err, userRows) => {
          if (err || !userRows || userRows.length === 0) {
            return res.status(400).json({ error: 'Usuario no encontrado para verificación' });
          }
          const isVerified = userRows[0].is_verified;
          if (isVerified) {
            createAppointmentWithStatus('pending'); // or 'confirmed' if you want to auto-confirm
          } else {
            createAppointmentWithStatus('pending'); // stays pending for admin review
          }
        });
      } else {
        // Guest user, always pending
        createAppointmentWithStatus('pending');
      }
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
  }, JWT_SECRET, { expiresIn: '2h' });
        
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
  }, JWT_SECRET, { expiresIn: '2h' });

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

// --- Helper functions for calendar merging logic ---
function getDatesInRange(start, end) {
  const dates = [];
  let curr = dayjs(start);
  const last = dayjs(end);
  while (curr.isBefore(last) || curr.isSame(last, 'day')) {
    dates.push(curr.format('YYYY-MM-DD'));
    curr = curr.add(1, 'day');
  }
  return dates;
}

function isFixedHoliday(date, template) {
  if (template.date_type !== 'fixed') return false;
  const d = dayjs(date);
  return d.month() + 1 === template.month_number && d.date() === template.day_number;
}

// TODO: Add calculated holiday logic if needed

function getBusinessHoursForDay(dayOfWeek, businessHours) {
  return businessHours.find(bh => (bh.day_of_week || '').toLowerCase() === dayOfWeek.toLowerCase());
}

function getScheduledOverride(dayOfWeek, date, scheduledBusinessHours) {
  // Find the most recent override for this day_of_week and date
  return scheduledBusinessHours
    .filter(bh => (bh.day_of_week || '').toLowerCase() === dayOfWeek.toLowerCase() && bh.effective_date <= date)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date))[0];
}

function getExceptionForDate(date, exceptions) {
  // Highest priority exception for this date
  return exceptions.find(ex => {
    if (ex.exception_type === 'single_day') return ex.start_date === date;
    if (ex.exception_type === 'date_range') return ex.start_date <= date && ex.end_date >= date;
    // TODO: Add recurring/special_schedule logic if needed
    return false;
  });
}
// --- CALENDAR MERGED SCHEDULE ROUTE ---
// Returns merged business hours, scheduled overrides, holidays, and exceptions for each date in the range
const dayjs = require('dayjs');

router.get('/calendar', async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: 'Missing start or end date' });

  try {
    // 1. Fetch all business_hours (base template)
    const businessHours = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM business_hours WHERE is_active = 1', (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // 2. Fetch all scheduled_business_hours with effective_date <= end
    const scheduledBusinessHours = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM scheduled_business_hours WHERE is_active = 1 AND effective_date <= ?', [end], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // 3. Fetch all schedule_exceptions overlapping the range
    const scheduleExceptions = await new Promise((resolve, reject) => {
      db.query(`SELECT * FROM schedule_exceptions WHERE is_active = 1 AND ((start_date <= ? AND (end_date IS NULL OR end_date >= ?)) OR (start_date BETWEEN ? AND ?))`, [end, start, start, end], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // 4. Fetch all holiday_templates (active)
    const holidayTemplates = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM holiday_templates WHERE is_active = 1', (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // --- Merging logic: build day map for each date in range ---
    const days = getDatesInRange(start, end);
    const result = [];
    for (const date of days) {
      const dayOfWeek = dayjs(date).format('dddd'); // e.g., 'Monday'
      let base = getBusinessHoursForDay(dayOfWeek, businessHours);

      // 1. Start with base
      let dayInfo = {
        date,
        is_open: base ? !!base.is_open : false,
        open_time: base ? base.open_time : null,
        close_time: base ? base.close_time : null,
        reason: null
      };

      // 2. Overlay scheduled_business_hours
      const scheduled = getScheduledOverride(dayOfWeek, date, scheduledBusinessHours);
      if (scheduled) {
        dayInfo.is_open = !!scheduled.is_open;
        dayInfo.open_time = scheduled.open_time;
        dayInfo.close_time = scheduled.close_time;
        // Optionally: dayInfo.break_start = scheduled.break_start; etc.
      }

      // 3. Overlay holiday_templates
      const holiday = holidayTemplates.find(ht => isFixedHoliday(date, ht));
      if (holiday) {
        dayInfo.is_open = false;
        dayInfo.reason = `Holiday - ${holiday.name}`;
      }

      // 4. Overlay schedule_exceptions
      const exception = getExceptionForDate(date, scheduleExceptions);
      if (exception) {
        dayInfo.is_open = !exception.is_closed;
        if (exception.custom_open_time) dayInfo.open_time = exception.custom_open_time;
        if (exception.custom_close_time) dayInfo.close_time = exception.custom_close_time;
        dayInfo.reason = exception.reason || 'Exception';
      }

      result.push(dayInfo);
    }
    res.json(result);
  } catch (err) {
    console.error('Error in /api/calendar:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

module.exports = router;
