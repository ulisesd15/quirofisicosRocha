/**
 * apiRoutes.js
 *
 * Handles all public and authenticated API endpoints for the Quirofísicos Rocha backend.
 * - Provides business hours, slot availability, appointments, schedule exceptions, and calendar merging logic.
 * - Supports both authenticated and guest users for appointment creation and queries.
 * - Implements robust merging of business hours, overrides, holidays, and exceptions for calendar display.
 * - Handles user-specific actions like profile updates.
 * - Exports an Express router for use in the main server.
 */

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const validateAppointmentTime = require('../middleware/validateAppointmentTime');
const appointmentStatusService = require('../services/appointmentStatusService');
const { Appointment, BusinessHour, Announcement, ScheduleException, User, sequelize } = require('../models');
const { Op } = require('sequelize');

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
  const weekStart = req.query.weekStart;
  if (!weekStart) return res.status(400).json({ error: 'Missing weekStart' });
  const startDate = new Date(weekStart);
  if (isNaN(startDate)) return res.status(400).json({ error: 'Invalid weekStart' });
  
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
    const relevantBusinessHours = await BusinessHour.findAll({
      where: {
        effectiveDate: { [Op.lte]: days[6] }
      }
    });

    const appts = await Appointment.findAll({
      where: {
        date: { [Op.in]: days },
        status: ['pending', 'confirmed', 'completed', 'no_show']
      },
      attributes: ['date', 'time']
    });

    console.log(`[GET /slots] Found ${appts.length} appointments for week starting ${weekStart}`);

    const slotsByDay = {};
    for (let i = 0; i < days.length; i++) {
      const dateStr = days[i];
      // Determine day of week safely from YYYY-MM-DD
      const [y, m, d] = dateStr.split('-').map(Number);
      const localDate = new Date(y, m - 1, d);
      const dow = dayNames[localDate.getDay()];

      // Rule A: Find the schedule with the latest effectiveDate <= dateStr
      const applicable = relevantBusinessHours.filter(bh => bh.effectiveDate <= dateStr);
      
      if (applicable.length === 0) {
        slotsByDay[dateStr] = [];
        continue;
      }

      // Find max effectiveDate (string comparison works for YYYY-MM-DD)
      const maxEffectiveDate = applicable.reduce((max, curr) => 
        curr.effectiveDate > max ? curr.effectiveDate : max, 
        applicable[0].effectiveDate
      );
      
      // Get the specific record for this day of week from the max effective set
      const bh = applicable.find(r => 
        r.effectiveDate === maxEffectiveDate && 
        (r.dayOfWeek || '').toLowerCase() === dow.toLowerCase()
      );

      if (!bh || !bh.isOpen) {
        slotsByDay[dateStr] = [];
        continue;
      }

      const allSlots = generateTimeSlots(bh.openTime, bh.closeTime);
      
      
      const dayAppts = appts.filter(a => a.date === dateStr);
      const bookingCounts = {};
      
      
      dayAppts.forEach(a => {
        // Convert "09:00:00" to "09:00"
        const timeKey = a.time.substring(0, 5);
        bookingCounts[timeKey] = (bookingCounts[timeKey] || 0) + 1;
      });

      console.log(`[GET /slots] ${dateStr} bookings:`, bookingCounts);

      // Filter out slots that have 2 or more bookings
      let available = allSlots.filter(t => (bookingCounts[t] || 0) < 2);

      // Filter out slots less than 30 min from now (if today)
      const now = new Date();
      const todayISO = now.toISOString().split('T')[0];
      if (dateStr === todayISO) {
        const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000);
        available = available.filter(timeSlot => {
          const slotDateTime = new Date(`${dateStr}T${timeSlot}:00`);
          return slotDateTime >= thirtyMinFromNow;
        });
      }
      
      slotsByDay[dateStr] = available;
      console.log(`[GET /slots] ${dateStr} available: ${available.length} slots`);
    }
    
    res.json({ slots: slotsByDay });
  } catch (e) {
    console.error('Error in /slots:', e);
    res.status(500).json({ error: 'Server error' });
  }
});


/**
 * Returns public clinic settings (name, address, phone, email).
 */
router.get('/clinic-settings', async (req, res) => {
  // Return default settings to prevent frontend errors since the model was removed
  res.json({
    name: 'Quirofísicos Rocha',
    address: 'Ubicación pendiente',
    phone: '555-000-0000',
    email: 'contacto@quirofisicosrocha.com'
  });
});

/**
 * Returns all active announcements for public display.
 */
router.get('/announcements/active', async (req, res) => {
  try {
    const results = await Announcement.findAll({
      where: {
        isActive: true,
        startDate: { [Op.lte]: new Date() },
        [Op.or]: [
          { endDate: null },
          { endDate: { [Op.gte]: new Date() } }
        ]
      },
      order: [['priority', 'DESC'], ['createdAt', 'DESC']]
    });
    res.json(results);
  } catch (err) {
    console.error('Error fetching active announcements:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

/**
 * GET /api/available-slots/:date
 * Returns available time slots for a specific date
 * Used by calendar.js fetchAvailableSlots()
 */
router.get('/available-slots/:date', async (req, res) => {
  const dateStr = req.params.date;
  
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  }
  
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  
  if (isNaN(dateObj)) {
    return res.status(400).json({ availableSlots: [] });
  }
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = dayNames[dateObj.getDay()];
  
  console.log(`[GET /available-slots/${dateStr}] Day of week: ${dayOfWeek}`);
  
  try {
    // 1. Find the most recent business hours effective date
    const latestEffectiveDate = await BusinessHour.max('effectiveDate', {
      where: {
        effectiveDate: { [Op.lte]: dateStr }
      }
    });
    
    if (!latestEffectiveDate) {
      console.log(`[GET /available-slots/${dateStr}] No business hours found`);
      return res.json({ availableSlots: [] });
    }
    
    console.log(`[GET /available-slots/${dateStr}] Using effective date: ${latestEffectiveDate}`);
    
    // 2. Get business hours for this day of week
    const businessHour = await BusinessHour.findOne({
      where: {
        effectiveDate: latestEffectiveDate,
        dayOfWeek: dayOfWeek  // ✅ Direct string comparison (no Op.like needed)
      }
    });
    
    if (!businessHour) {
      console.log(`[GET /available-slots/${dateStr}] No business hours found for ${dayOfWeek}`);
      return res.json({ availableSlots: [] });
    }
    
    if (!businessHour.isOpen) {
      console.log(`[GET /available-slots/${dateStr}] Day is closed`);
      return res.json({ availableSlots: [] });
    }
    
    console.log(`[GET /available-slots/${dateStr}] Business hours: ${businessHour.openTime} - ${businessHour.closeTime}`);
    
    // 3. Generate all possible slots
    const allSlots = generateTimeSlots(businessHour.openTime, businessHour.closeTime);
    console.log(`[GET /available-slots/${dateStr}] Generated ${allSlots.length} total slots`);
    
    // 4. Get existing appointments for this date
    const appointments = await Appointment.findAll({
      where: {
        date: dateStr,
        status: ['pending', 'confirmed', 'completed', 'no_show']
      },
      attributes: ['time']
    });
    
    // 5. Count bookings per slot (normalize time format)
    const bookingCounts = {};
    appointments.forEach(appt => {
      const timeKey = appt.time.substring(0, 5); // Strip seconds: "09:00:00" → "09:00"
      bookingCounts[timeKey] = (bookingCounts[timeKey] || 0) + 1;
    });
    
    console.log(`[GET /available-slots/${dateStr}] Found ${appointments.length} appointments. Booking counts:`, bookingCounts);
    
    // 6. Filter out fully booked slots (2 bookings = full)
    let availableSlots = allSlots.filter(slot => (bookingCounts[slot] || 0) < 2);
    
    // 7. Filter out past slots if today
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];
    
    if (dateStr === todayISO) {
      const minBookingTime = new Date(now.getTime() + 30 * 60 * 1000);
      const beforeCount = availableSlots.length;
      
      availableSlots = availableSlots.filter(slot => {
        const slotDateTime = new Date(`${dateStr}T${slot}:00`);
        return slotDateTime >= minBookingTime;
      });
      
      console.log(`[GET /available-slots/${dateStr}] Filtered ${beforeCount - availableSlots.length} past slots (today)`);
    }
    
    console.log(`[GET /available-slots/${dateStr}] ✅ Returning ${availableSlots.length} available slots`);
    
    res.json({ availableSlots });
    
  } catch (error) {
    console.error(`[GET /available-slots/${dateStr}] ❌ Error:`, error);
    res.status(500).json({ error: 'Server error', availableSlots: [] });
  }
});



/**
 * Returns all active schedule exceptions for the calendar/frontend.
 */
router.get('/schedule-exceptions', async (req, res) => {
  try {
    const results = await ScheduleException.findAll({
      where: { isActive: true },
      order: [['startDate', 'ASC']]
    });
    res.json(results);
  } catch (err) {
    console.error('Error fetching schedule exceptions:', err);
    res.status(500).json({ error: 'Database error' });
  }
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
 * Defaults to returning the current active schedule (latest effectiveDate <= today).
 */
router.get('/business-hours', async (req, res) => {
  try {
    // 1. Find the most recent effectiveDate that is on or before today.
    const latestEffectiveDate = await BusinessHour.max('effectiveDate', {
      where: {
        effectiveDate: {
          [Op.lte]: new Date()
        }
      }
    });

    if (!latestEffectiveDate) {
      console.log('[/business-hours] No business hours found in database');
      return res.status(200).json({ 
        businessHours: [],
        message: 'NO_BUSINESS_HOURS_CONFIGURED'
      });
    }

    // 2. Fetch all records for that effective date
    const records = await BusinessHour.findAll({
      where: {
        effectiveDate: latestEffectiveDate
      }
    });
    
    console.log(`[/business-hours] Returning ${records.length} business hours for effectiveDate: ${latestEffectiveDate}`);
    res.json({ businessHours: records });
  } catch (err) {
    console.error("Error fetching merged business hours:", err);
    res.status(500).json({ businessHours: [] });
  }
});

/**
 * Returns business hours for a specific date.
 * Uses the most recent effectiveDate that is on or before the requested date.
 */
router.get('/business-hours/:date', async (req, res) => {
  const dayISO = req.params.date; // Expects YYYY-MM-DD
  const dateObj = new Date(dayISO + 'T00:00:00'); // Treat as local date
  if (isNaN(dateObj)) return res.status(400).json({ businessHours: [] });

  try {
    // 1. Check for schedule exceptions first
    const exceptions = await ScheduleException.findAll({
      where: { isActive: true }
    });
    
    const exception = getExceptionForDate(dayISO, exceptions);
    
    // If there's a CLOSURE exception, return closed status
    if (exception && exception.type === 'CLOSURE') {
      console.log(`[/business-hours/${dayISO}] Date is CLOSED due to exception: ${exception.reason}`);
      
      // Return all days as closed
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const closedRecords = days.map(day => ({
        dayOfWeek: day,
        isOpen: false,
        openTime: null,
        closeTime: null,
        effectiveDate: dayISO,
        reason: exception.reason
      }));
      
      return res.json({ 
        businessHours: closedRecords,
        exception: {
          type: 'CLOSURE',
          reason: exception.reason
        }
      });
    }

    // 2. Find the most recent effectiveDate that is on or before the requested date
    const latestEffectiveDate = await BusinessHour.max('effectiveDate', {
      where: {
        effectiveDate: {
          [Op.lte]: dayISO
        }
      }
    });

    if (!latestEffectiveDate) {
      console.log(`[/business-hours/${dayISO}] No business hours found in database`);
      return res.status(200).json({ 
        businessHours: [],
        message: 'NO_BUSINESS_HOURS_CONFIGURED'
      });
    }

    // 3. Fetch all records for that effective date
    const records = await BusinessHour.findAll({
      where: {
        effectiveDate: latestEffectiveDate
      }
    });
    
    // 4. If there's an OVERRIDE_HOURS exception, apply custom hours
    if (exception && exception.type === 'OVERRIDE_HOURS') {
      console.log(`[/business-hours/${dayISO}] Applying OVERRIDE_HOURS exception`);
      
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDayOfWeek = days[dateObj.getDay()];
      
      const modifiedRecords = records.map(record => {
        // Only modify the matching day of week
        if ((record.dayOfWeek || '').toLowerCase() === targetDayOfWeek.toLowerCase()) {
          return {
            ...record.get({ plain: true }),
            openTime: exception.customOpenTime || record.openTime,
            closeTime: exception.customCloseTime || record.closeTime,
            isOpen: true,
            reason: exception.reason
          };
        }
        return record.get({ plain: true });
      });
      
      return res.json({ 
        businessHours: modifiedRecords,
        exception: {
          type: 'OVERRIDE_HOURS',
          reason: exception.reason
        }
      });
    }
    
    console.log(`[/business-hours/${dayISO}] Returning ${records.length} business hours for effectiveDate: ${latestEffectiveDate}`);
    res.json({ businessHours: records });
  } catch (err) {
    console.error(`Error fetching business hours for date ${dayISO}:`, err);
    res.status(500).json({ businessHours: [] });
  }
});



/**
 * Creates a new appointment (supports guest and authenticated users).
 */
router.post('/appointments', validateAppointmentTime, async (req, res) => {
  let { fullName, email, phone, date, time, note = '', userId } = req.body;

  // Normalize empty user_id to null
  userId = userId ? userId : null;

  // ✅ Normalize time format to HH:MM:SS (simpler check)
  if (time && time.length === 5) {
    time = time + ':00';
    console.log('[POST /appointments] Normalized time to:', time);
  }

  console.log(`[POST /appointments] Request: ${fullName} - ${date} at ${time}`);

  // --- 90-Day Booking Limit Validation ---
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  const maxBookingDate = new Date(today);
  maxBookingDate.setDate(today.getDate() + 90);
  const requestedDate = new Date(date);

  if (requestedDate > maxBookingDate) {
    return res.status(400).json({ 
      error: 'Booking too far in advance', 
      message: 'No se puede agendar con más de 90 días de antelación.' 
    });
  }

  // Validate required fields
  if (!fullName || !date || !time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if the time slot is available (allows up to 2 bookings per slot)
    const count = await Appointment.count({
      where: {
        date,
        time,
        status: ['pending', 'confirmed', 'completed', 'no_show']
      }
    });

    console.log(`[POST /appointments] Found ${count} existing appointments for ${date} at ${time}`);

    if (count >= 2) {
      console.log(`[POST /appointments] ❌ Slot full - rejecting booking`);
      return res.status(409).json({ 
        error: 'Time slot already taken', 
        message: 'Este horario ya está ocupado' 
      });
    }

    let status = 'pending';
    if (userId) {
      // For registered users, check verification status to set appointment status
      const user = await User.findByPk(userId);
      if (user && user.isVerified) {
        status = 'confirmed';
      }
    }

    const appointment = await Appointment.create({
      fullName, email, phone, date, time, note, userId, status
    });

    console.log(`[POST /appointments] ✅ Created appointment ID ${appointment.id} with status: ${status}`);

    res.json({ 
      message: status === 'confirmed' 
        ? 'Cita agendada correctamente' 
        : 'Cita agendada, pendiente de confirmación', 
      id: appointment.id, 
      status 
    });

  } catch (err) {
    console.error('[POST /appointments] ❌ Error creating appointment:', err);
    res.status(500).json({ error: 'Database error creating appointment' });
  }
});


/**
 * Updates an appointment (authenticated, user or admin).
 */
router.put('/appointments/:id', authenticateToken , validateAppointmentTime,  async (req, res) => {
  const { fullName, email, phone, date, time, note } = req.body;
  const appointmentId = req.params.id;
  const userId = req.user.id;
  
  try {
    const whereClause = { id: appointmentId };
    if (req.user.role !== 'admin') {
      whereClause.userId = userId;
    }

    const appointment = await Appointment.findOne({ where: whereClause });
    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada o no autorizada' });
    }

    await appointment.update({ fullName, email, phone, date, time, note });
    res.json({ message: 'Cita actualizada exitosamente' });
  } catch (err) {
    console.error('Error updating appointment:', err);
    res.status(500).json({ error: 'Error actualizando la cita' });
  }
});

/**
 * Returns the authenticated user's own appointments.
 */
router.get('/appointments/my-appointments', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const results = await Appointment.findAll({
      where: { userId: userId },
      order: [['date', 'DESC'], ['time', 'DESC']]
    });
    res.json({ appointments: results });
  } catch (err) {
    console.error('Error getting user appointments:', err);
    res.status(500).json({ error: 'Error getting appointments' });
  }
});

/**
 * Returns a single appointment by ID (authenticated, user or admin).
 */
router.get('/appointments/:id', authenticateToken, async (req, res) => {
  const appointmentId = req.params.id;
  const userId = req.user.id;
  
  try {
    const whereClause = { id: appointmentId };
    if (req.user.role !== 'admin') {
      whereClause.userId = userId;
    }

    const appointment = await Appointment.findOne({ where: whereClause });
    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada o no autorizada' });
    }
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

/**
 * Test endpoint for reschedule (no auth, for debugging).
 */
router.get('/appointments-test/:id', async (req, res) => {
  const appointmentId = req.params.id;
  try {
    const appointment = await Appointment.findByPk(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

/**
 * Returns minimal info for appointments by date (public, for availability checking).
 */
router.get('/appointments/date/:date', async (req, res) => {
  const date = req.params.date;
  try {
    const results = await Appointment.findAll({
      where: {
        date,
        status: ['pending', 'confirmed', 'completed', 'no_show']
      },
      attributes: ['time']
    });
    res.json(results);
  } catch (err) {
    res.status(500).json(err);
  }
});

/**
 * Returns full appointments by date (authenticated).
 */
router.get('/appointments/date/:date/full', authenticateToken, async (req, res) => {
  const date = req.params.date;
  try {
    const results = await Appointment.findAll({ where: { date } });
    res.json(results);
  } catch (err) {
    res.status(500).json(err);
  }
});

/**
 * Returns appointments by date and time (authenticated).
 */
router.get('/appointments/date/:date/time/:time', authenticateToken, async (req, res) => {
  const date = req.params.date;
  const time = req.params.time;
  try {
    const results = await Appointment.findAll({ where: { date, time } });
    res.json(results);
  } catch (err) {
    res.status(500).json(err);
  }
});

/**
 * Cancels an appointment (user can cancel their own appointments).
 */
router.put('/appointments/:id/cancel', authenticateToken, async (req, res) => {
  const appointmentId = req.params.id;
  const userId = req.user.id;

  try {
    const [updated] = await Appointment.update(
      { status: 'cancelled' },
      { where: { id: appointmentId, userId: userId } }
    );

    if (updated === 0) {
      return res.status(404).json({ error: 'Appointment not found or not authorized' });
    }
    res.json({ message: 'Appointment cancelled successfully' });
  } catch (err) {
    console.error('Error cancelling appointment:', err);
    res.status(500).json({ error: 'Error cancelling appointment' });
  }
});

/**
 * POST /appointments/:id/reschedule
 * Reschedules an existing appointment to a new date and time.
 */
router.post('/appointments/:id/reschedule', authenticateToken,  validateAppointmentTime, async (req, res) => {
  const appointmentId = req.params.id;
  const userId = req.user.id;
  const { newDate, newTime, note } = req.body;

  if (!newDate || !newTime) {
    return res.status(400).json({ message: 'La nueva fecha y hora son requeridas.' });
  }

  try {
    // 1. Verify the appointment belongs to the user (or user is admin)
    const whereClause = { id: appointmentId };
    if (req.user.role !== 'admin') {
      whereClause.userId = userId;
    }

    const appointment = await Appointment.findOne({ where: whereClause });
    if (!appointment) return res.status(404).json({ message: 'Cita no encontrada o no autorizada.' });

    // 2. Check if the new slot is available
    const existing = await Appointment.count({
      where: {
        date: newDate,
        time: newTime,
        status: ['pending', 'confirmed', 'completed', 'no_show']
      }
    });
    
    if (existing > 0) return res.status(409).json({ message: 'El nuevo horario seleccionado ya no está disponible.' });

    // 3. Determine the new status based on user verification
    const isVerified = req.user.isVerified || false;
    const newStatus = isVerified ? 'confirmed' : 'pending';
    const successMessage = isVerified 
      ? 'Cita reagendada y confirmada exitosamente.'
      : 'Cita reagendada exitosamente. Queda pendiente de confirmación.';

    // 4. Update the appointment
    await appointment.update({
      date: newDate,
      time: newTime,
      note: note,
      status: newStatus
    });

    res.json({ message: successMessage });
  } catch (err) {
    console.error('Error rescheduling appointment:', err);
    res.status(500).json({ message: 'Error al reagendar la cita.' });
  }
});

/**
 * Deletes an appointment (authenticated).
 */
router.delete('/appointments/:id', authenticateToken, async (req, res) => {
  try {
    await Appointment.destroy({ where: { id: req.params.id } });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json(err);
  }
});

/**
 * PUT /auth/update-profile
 * Allows a logged-in user to update their own profile information (fullName, email, phone).
 * This route is protected and uses the user's ID from the JWT.
 */
router.put('/auth/update-profile', authenticateToken, async (req, res) => {
  const userId = req.user.id; // Get user ID from the token
  const { fullName, email, phone } = req.body;

  if (!fullName || !email) {
    return res.status(400).json({ error: 'Full name and email are required.' });
  }

  try {
    await User.update(
      { fullName, email, phone },
      { where: { id: userId } }
    );
    res.json({ message: 'Profile updated successfully.' });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Email already in use by another account.' });
    }
    console.error('Error updating user profile:', err);
    res.status(500).json({ error: 'Database error while updating profile.' });
  }
});


// --- Helper functions for calendar merging logic ---
/**
 * Returns an array of dates in YYYY-MM-DD format between start and end (inclusive).
 */
function getDatesInRange(start, end) {
  const dates = [];
  let curr = new Date(start);
  const last = new Date(end);
  
  // Ensure we are working with midnight UTC to avoid timezone shifts
  curr.setUTCHours(0, 0, 0, 0);
  last.setUTCHours(0, 0, 0, 0);

  while (curr <= last) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

/**
 * Checks if a date matches a fixed holiday template.
 */
function isFixedHoliday(date, template) {
  if (template.date_type !== 'fixed') return false;
  const d = new Date(date);
  // getMonth() is 0-indexed, so add 1
  return (d.getUTCMonth() + 1) === template.month_number && d.getUTCDate() === template.day_number;
}

// TODO: Add calculated holiday logic if needed

/**
 * Gets business hours for a given day of week.
 */
function getBusinessHoursForDay(dayOfWeek, businessHours) {
  return businessHours.find(bh => (bh.dayOfWeek || '').toLowerCase() === dayOfWeek.toLowerCase());
}

/**
 * Gets the most recent scheduled override for a day and date.
 */
function getScheduledOverride(dayOfWeek, date, scheduledBusinessHours) {
  // Find the most recent override for this day_of_week and date
  return scheduledBusinessHours
    .filter(bh => (bh.dayOfWeek || '').toLowerCase() === dayOfWeek.toLowerCase() && bh.effectiveDate <= date)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
}

/**
 * Gets the highest priority exception for a date.
 */
function getExceptionForDate(date, exceptions) {
  const targetDate = new Date(date);
  const targetMonth = targetDate.getUTCMonth() + 1;
  const targetDay = targetDate.getUTCDate();

  return exceptions.find(ex => {
    // 1. Recurring Yearly
    if (ex.isRecurring && (ex.recurringType === 'yearly' || ex.recurringType === 'YEARLY')) {
      // Use startDate to determine the recurring day/month
      const start = new Date(ex.startDate);
      const startMonth = start.getUTCMonth() + 1;
      const startDay = start.getUTCDate();
      return startMonth === targetMonth && startDay === targetDay;
    }

    // 2. Specific Date Range
    let exStart = ex.startDate;
    let exEnd = ex.endDate || ex.startDate;

    // Ensure we are comparing YYYY-MM-DD strings
    if (exStart instanceof Date) exStart = exStart.toISOString().split('T')[0];
    if (exEnd instanceof Date) exEnd = exEnd.toISOString().split('T')[0];

    return date >= exStart && date <= exEnd;
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
    const businessHours = await BusinessHour.findAll({
      where: {
        effectiveDate: { [Op.lte]: end }
      }
    });

    // 2. Fetch all schedule_exceptions overlapping the range
    const scheduleExceptions = await ScheduleException.findAll({
      where: {
        isActive: true,
        startDate: { [Op.lte]: end },
        [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: start } }]
      }
    });

    // --- Merging logic: build day map for each date in range ---
    const days = getDatesInRange(start, end);
    const result = [];
    for (const date of days) {
      const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase();
      let activeSchedule;
      
      // Rule A: Find the correct schedule for the date
      const applicableSchedules = businessHours.filter(bh => bh.effectiveDate <= date);
      
      if (applicableSchedules.length > 0) {
        // Find max effectiveDate using string comparison (YYYY-MM-DD)
        const latestEffectiveDate = applicableSchedules.reduce((max, curr) => curr.effectiveDate > max ? curr.effectiveDate : max, applicableSchedules[0].effectiveDate);
        
        activeSchedule = applicableSchedules.find(bh => 
          bh.effectiveDate === latestEffectiveDate && 
          (bh.dayOfWeek || '').toLowerCase() === dayOfWeek
        );
      }

      // 1. Start with base
      let dayInfo = {
        date,
        isOpen: activeSchedule ? !!activeSchedule.isOpen : false, // Correctly use the determined active schedule
        openTime: activeSchedule ? activeSchedule.openTime : null,
        closeTime: activeSchedule ? activeSchedule.closeTime : null,
        reason: null
      };

      // 2. Overlay schedule_exceptions
      const exception = getExceptionForDate(date, scheduleExceptions);
      if (exception) {
        if (exception.type === 'CLOSURE') {
          dayInfo.isOpen = false;
        } else {
          dayInfo.isOpen = true;
          if (exception.customOpenTime) dayInfo.openTime = exception.customOpenTime;
          if (exception.customCloseTime) dayInfo.closeTime = exception.customCloseTime;
        }
        dayInfo.reason = exception.reason || exception.name || 'Exception';
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
