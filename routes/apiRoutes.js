/**
 * apiRoutes.js
 *
 * Handles all public and authenticated API endpoints for the Quirofísicos Rocha backend.
 * - Provides business hours, slot availability, appointments, schedule exceptions, and calendar merging logic.
 * - Supports both authenticated and guest users for appointment creation and queries.
 * - Implements robust merging of business hours, overrides, holidays, and exceptions for calendar display.
 * - Exports an Express router for use in the main server.
 */

const express = require('express');
const db = require('../config/database');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');

/**
 * Generates 30-minute time slots between open and close times.
 */
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

/**
 * Returns available slots for a week (Monday-Sunday) given a week_start date (YYYY-MM-DD).
 */
router.get('/slots', async (req, res) => {
  const weekStart = req.query.week_start;
  if (!weekStart) return res.status(400).json({ error: 'Missing week_start' });
  const startDate = new Date(weekStart);
  if (isNaN(startDate)) return res.status(400).json({ error: 'Invalid week_start' });
  // Build array of 7 dates (Mon-Sun)
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  // Get day names for each date
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  try {
    // 1. Get scheduled business hours for all days in week
    const weekDayNames = days.map(d => dayNames[new Date(d).getDay()]);
    const placeholders = weekDayNames.map(() => '?').join(',');
    const bhQuery = `
      SELECT * FROM scheduled_business_hours
      WHERE LOWER(day_of_week) IN (${placeholders})
        AND effective_date <= ?
        AND is_active = 1
      ORDER BY effective_date DESC
    `;
    db.query(bhQuery, [...weekDayNames, days[6]], (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      // Map most recent override for each day
      const bhMap = {};
      for (const dow of weekDayNames) {
        const overrides = results.filter(r => (r.day_of_week || '').toLowerCase() === dow);
        if (overrides.length > 0) bhMap[dow] = overrides[0];
      }
      // 2. Get all appointments for the week
      db.query(
        'SELECT date, time FROM appointments WHERE date IN (?) AND status IN ("pending", "confirmed")',
        [days],
        (err2, appts) => {
          if (err2) return res.status(500).json({ error: 'Database error' });
          // 3. Build slots for each day
          const slotsByDay = {};
          for (let i = 0; i < days.length; i++) {
            const date = days[i];
            const dow = weekDayNames[i];
            const bh = bhMap[dow];
            if (!bh || !bh.is_open) {
              slotsByDay[date] = [];
              continue;
            }
            const allSlots = generateTimeSlots(bh.open_time, bh.close_time);
            const taken = appts.filter(a => a.date === date).map(a => a.time);
            let available = allSlots.filter(t => !taken.includes(t));
            // Filter out slots less than 30 min from now (if today)
            const now = new Date();
            const todayISO = now.toISOString().split('T')[0];
            if (date === todayISO) {
              const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000);
              available = available.filter(timeSlot => {
                const slotDateTime = new Date(`${date}T${timeSlot}:00`);
                return slotDateTime >= thirtyMinFromNow;
              });
            }
            slotsByDay[date] = available;
          }
          res.json({ slots: slotsByDay });
        }
      );
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Returns public clinic settings (name, address, phone, email).
 */
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

/**
 * Returns available slots for a specific date.
 */
router.get('/available-slots/:date', async (req, res) => {
  const dayISO = req.params.date;
  // Parse as local date to avoid timezone issues
  const [year, month, day] = dayISO.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  if (isNaN(dateObj)) return res.status(400).json({ availableSlots: [] });
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = days[dateObj.getDay()];
  console.log(`[API] /available-slots/${dayISO} | dayOfWeek: ${dayOfWeek}`);
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
      if (err || !results || results.length === 0) {
        console.log(`[API] No business hours found for ${dayOfWeek} on ${dayISO}`);
        return res.json({ availableSlots: [] });
      }
      const bh = results[0];
      console.log(`[API] Business hours for ${dayOfWeek} on ${dayISO}:`, bh);
      if (!bh.is_open) {
        console.log(`[API] Day is closed (is_open=0) for ${dayOfWeek} on ${dayISO}`);
        return res.json({ availableSlots: [] });
      }
      const allSlots = generateTimeSlots(bh.open_time, bh.close_time);
      console.log(`[API] All possible slots:`, allSlots);
      // Get taken appointments
      db.query('SELECT time FROM appointments WHERE date = ? AND status IN ("pending", "confirmed")', [dayISO], (err2, takenRows) => {
        if (err2) {
          console.log(`[API] Error fetching appointments for ${dayISO}:`, err2);
          return res.json({ availableSlots: [] });
        }
        const taken = takenRows.map(r => r.time);
        console.log(`[API] Taken slots for ${dayISO}:`, taken);
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
          console.log(`[API] Available slots after 30min filter:`, available);
        }
        console.log(`[API] Final available slots for ${dayISO}:`, available);
        res.json({ availableSlots: available });
      });
    });
  } catch (e) {
    res.json({ availableSlots: [] });
  }
});

/**
 * Returns all active schedule exceptions for the calendar/frontend.
 */
router.get('/schedule-exceptions', (req, res) => {
  db.query('SELECT * FROM schedule_exceptions WHERE is_active = TRUE ORDER BY start_date', (err, results) => {
    if (err) {
      console.error('Error fetching schedule exceptions:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

/**
 * Returns the Google Maps API key for the frontend.
 */
router.get('/config/maps-key', (req, res) => {
  res.json({ 
    apiKey: process.env.GOOGLE_MAPS_API_KEY || null 
  });
});

/**
 * Returns all business hours (for admin/configuration).
 */
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

/**
 * Returns business hours for a specific date (uses scheduled-business-hours if available).
 */
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

/**
 * Returns all appointments (authenticated).
 */
router.get('/appointments', authenticateToken, (req, res) => {
  db.query('SELECT * FROM appointments', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
}); 

/**
 * Creates a new appointment (supports guest and authenticated users).
 */
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

/**
 * Updates an appointment (authenticated, user or admin).
 */
router.put('/appointments/:id', authenticateToken, (req, res) => {
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

/**
 * Returns the authenticated user's own appointments.
 */
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

/**
 * Returns a single appointment by ID (authenticated, user or admin).
 */
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

/**
 * Test endpoint for reschedule (no auth, for debugging).
 */
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

/**
 * Returns minimal info for appointments by date (public, for availability checking).
 */
router.get('/appointments/date/:date', (req, res) => {
  const date = req.params.date;
  // Only return minimal info needed for availability checking
  db.query('SELECT time FROM appointments WHERE date = ? AND status IN ("pending", "confirmed")', [date], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

/**
 * Returns full appointments by date (authenticated).
 */
router.get('/appointments/date/:date/full', authenticateToken, (req, res) => {
  const date = req.params.date;
  db.query('SELECT * FROM appointments WHERE date = ?', [date], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

/**
 * Returns appointments by user ID (authenticated).
 */
router.get('/appointments/user/:userId', authenticateToken, (req, res) => {
  const userId = req.params.userId;
  db.query('SELECT * FROM appointments WHERE user_id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

/**
 * Returns appointments by user ID and date (authenticated).
 */
router.get('/appointments/user/:userId/date/:date', authenticateToken, (req, res) => {
  const userId = req.params.userId;
  const date = req.params.date;
  db.query('SELECT * FROM appointments WHERE user_id = ? AND date = ?', [userId, date], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

/**
 * Returns appointments by date and time (authenticated).
 */
router.get('/appointments/date/:date/time/:time', authenticateToken, (req, res) => {
  const date = req.params.date;
  const time = req.params.time;
  db.query('SELECT * FROM appointments WHERE date = ? AND time = ?', [date, time], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

/**
 * Cancels an appointment (user can cancel their own appointments).
 */
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

/**
 * Deletes an appointment (authenticated).
 */
router.delete('/appointments/:id', authenticateToken, (req, res) => {
  db.query('DELETE FROM appointments WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.sendStatus(204);
  });
});

// --- Helper functions for calendar merging logic ---
/**
 * Returns an array of dates in YYYY-MM-DD format between start and end (inclusive).
 */
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

/**
 * Checks if a date matches a fixed holiday template.
 */
function isFixedHoliday(date, template) {
  if (template.date_type !== 'fixed') return false;
  const d = dayjs(date);
  return d.month() + 1 === template.month_number && d.date() === template.day_number;
}

// TODO: Add calculated holiday logic if needed

/**
 * Gets business hours for a given day of week.
 */
function getBusinessHoursForDay(dayOfWeek, businessHours) {
  return businessHours.find(bh => (bh.day_of_week || '').toLowerCase() === dayOfWeek.toLowerCase());
}

/**
 * Gets the most recent scheduled override for a day and date.
 */
function getScheduledOverride(dayOfWeek, date, scheduledBusinessHours) {
  // Find the most recent override for this day_of_week and date
  return scheduledBusinessHours
    .filter(bh => (bh.day_of_week || '').toLowerCase() === dayOfWeek.toLowerCase() && bh.effective_date <= date)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date))[0];
}

/**
 * Gets the highest priority exception for a date.
 */
function getExceptionForDate(date, exceptions) {
  // Highest priority exception for this date
  return exceptions.find(ex => {
    if (ex.exception_type === 'single_day') return ex.start_date === date;
    if (ex.exception_type === 'date_range') return ex.start_date <= date && ex.end_date >= date;
    // TODO: Add recurring/special_schedule logic if needed
    return false;
  });
}

/**
 * Returns merged business hours, overrides, holidays, and exceptions for each date in the range.
 */
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
