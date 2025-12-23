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
    // 1. Get scheduled business hours for all days in week
    const weekDayNames = days.map(d => dayNames[new Date(d).getDay()]);

    // Refactor: Use the new BusinessHour model logic
    const latestEffectiveDate = await BusinessHour.max('effectiveDate', { where: { effectiveDate: { [Op.lte]: days[6] } } });

    const results = await BusinessHour.findAll({
      where: {
        effectiveDate: latestEffectiveDate,
        dayOfWeek: weekDayNames,
      },
      order: [['effectiveDate', 'DESC']]
    });

    // Map most recent override for each day
    const bhMap = {};
    for (const dow of weekDayNames) {
      const overrides = results.filter(r => (r.dayOfWeek || '').toLowerCase() === dow);
      if (overrides.length > 0) bhMap[dow] = overrides[0];
    }

    // 2. Get all appointments for the week
    const appts = await Appointment.findAll({
      where: {
        date: { [Op.in]: days },
        status: ['pending', 'confirmed', 'completed', 'no_show']
      },
      attributes: ['date', 'time']
    });

    // 3. Build slots for each day
    const slotsByDay = {};
    for (let i = 0; i < days.length; i++) {
      const date = days[i];
      const dow = weekDayNames[i];
      const bh = bhMap[dow];
      if (!bh || !bh.isOpen) {
        slotsByDay[date] = []; // Keep as is
        continue;
      }
      const allSlots = generateTimeSlots(bh.openTime, bh.closeTime);
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
    // Refactor: Use the new BusinessHour model logic
    const latestEffectiveDate = await BusinessHour.max('effectiveDate', { where: { effectiveDate: { [Op.lte]: dayISO } } });

    const bh = await BusinessHour.findOne({
      where: {
        effectiveDate: latestEffectiveDate,
        dayOfWeek: dayOfWeek,
      }
    });

    if (!bh || !bh.isOpen) {
      console.log(`[API] Day is closed or no hours found for ${dayOfWeek} on ${dayISO}`);
      return res.json({ availableSlots: [] });
    }

    const allSlots = generateTimeSlots(bh.openTime, bh.closeTime);
    
    // Get taken appointments
    const takenRows = await Appointment.findAll({
      where: {
        date: dayISO,
        status: ['pending', 'confirmed', 'completed', 'no_show']
      },
      attributes: ['time', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['time']
    });

    const bookingCounts = {};
    takenRows.forEach(row => {
      bookingCounts[row.time] = row.get('count');
    });

    // A slot is available if it has been booked less than 2 times.
    let available = allSlots.filter(slot => (bookingCounts[slot + ':00'] || 0) < 2);

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
  } catch (e) {
    console.error('Error in /available-slots:', e);
    res.json({ availableSlots: [] });
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
 */
router.get('/business-hours', async (req, res) => {
  // This endpoint now functions like /business-hours/:date, using today if no date is provided.
  const dayISO = new Date().toISOString().split('T')[0]; // Default to today
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

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
      // If no schedule has been set at all.
      return res.json({ businessHours: [] });
    }

    // 2. Fetch the 7 records that make up the active weekly schedule.
    const ordered = await BusinessHour.findAll({
      where: {
        effectiveDate: latestEffectiveDate
      },
      order: [
        // Custom order to ensure Monday is first, Sunday is last, etc.
        sequelize.literal("FIELD(dayOfWeek, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')")
      ]
    });
    res.json({ businessHours: ordered });
  } catch (err) {
    console.error("Error fetching merged business hours:", err);
    res.status(500).json({ businessHours: [] });
  }
});

/**
 * Returns business hours for a specific date (uses scheduled-business-hours if available).
 */
router.get('/business-hours/:date', async (req, res) => {
  const dayISO = req.params.date; // Expects YYYY-MM-DD
  const dateObj = new Date(dayISO + 'T00:00:00'); // Treat as local date
  if (isNaN(dateObj)) return res.status(400).json({ businessHours: [] });

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  try {
    // 1. Find the most recent effectiveDate that is on or before the requested date.
    const latestEffectiveDate = await BusinessHour.max('effectiveDate', {
      where: {
        effectiveDate: {
          [Op.lte]: dayISO
        }
      }
    });

    if (!latestEffectiveDate) {
      return res.json({ businessHours: [] });
    }

    // 2. Fetch the 7 records for that effective date.
    const ordered = await BusinessHour.findAll({
      where: {
        effectiveDate: latestEffectiveDate
      },
      order: [
        sequelize.literal("FIELD(dayOfWeek, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')")
      ]
    });
    res.json({ businessHours: ordered });
  } catch (err) {
    console.error(`Error fetching business hours for date ${dayISO}:`, err);
    res.status(500).json({ businessHours: [] });
  }
});

/**
 * Creates a new appointment (supports guest and authenticated users).
 */
router.post('/appointments', async (req, res) => {
  let { fullName, email, phone, date, time, note = '', userId } = req.body;

  // Normalize empty user_id to null
  userId = userId ? userId : null;

  // --- 90-Day Booking Limit Validation ---
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  const maxBookingDate = new Date(today);
  maxBookingDate.setDate(today.getDate() + 90);
  const requestedDate = new Date(date);

  if (requestedDate > maxBookingDate) {
    return res.status(400).json({ error: 'Booking too far in advance', message: 'No se puede agendar con más de 90 días de antelación.' });
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

    if (count >= 2) {
      return res.status(409).json({ error: 'Time slot already taken', message: 'Este horario ya está ocupado' });
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

    res.json({ 
      message: status === 'confirmed' ? 'Cita agendada correctamente' : 'Cita agendada, pendiente de confirmación', 
      id: appointment.id, 
      status 
    });

  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ error: 'Database error creating appointment' });
  }
});

/**
 * Updates an appointment (authenticated, user or admin).
 */
router.put('/appointments/:id', authenticateToken, async (req, res) => {
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
router.post('/appointments/:id/reschedule', authenticateToken, async (req, res) => {
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
  // Highest priority exception for this date
  return exceptions.find(ex => {
    if (ex.exceptionType === 'single_day') return ex.startDate === date;
    if (ex.exceptionType === 'date_range') return ex.startDate <= date && ex.endDate >= date;
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
    const businessHours = await BusinessHour.findAll(); // No isActive column anymore

    // 2. Fetch all scheduled_business_hours to determine the future schedule
    // This is now handled by the BusinessHour model itself. This can be removed.

    // Get the single effective_date from the future schedule, if it exists.
    // Format it as a 'YYYY-MM-DD' string to prevent timezone issues during comparison.

    // 3. Fetch all schedule_exceptions overlapping the range
    const scheduleExceptions = await ScheduleException.findAll({
      where: {
        isActive: true,
        startDate: { [Op.lte]: end },
        [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: start } }]
      }
    });


    // 4. Fetch all holiday_templates (active)
    // This is now part of ScheduleException. This can be removed.

    // --- Merging logic: build day map for each date in range ---
    const days = getDatesInRange(start, end);
    const result = [];
    for (const date of days) {
      const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase();
      let activeSchedule;
      
      // Refactor: Find the correct schedule for the date
      const applicableSchedules = businessHours.filter(bh => bh.effectiveDate <= date);
      const latestEffectiveDate = Math.max(...applicableSchedules.map(bh => new Date(bh.effectiveDate)));
      
      activeSchedule = businessHours.find(bh => 
        new Date(bh.effectiveDate).getTime() === latestEffectiveDate && 
        bh.dayOfWeek.toLowerCase() === dayOfWeek
      );

      // 1. Start with base
      let dayInfo = {
        date,
        isOpen: activeSchedule ? !!activeSchedule.isOpen : false, // Correctly use the determined active schedule
        openTime: activeSchedule ? activeSchedule.openTime : null,
        closeTime: activeSchedule ? activeSchedule.closeTime : null,
        reason: null
      };

      // 3. Overlay holiday_templates
      const holiday = scheduleExceptions.find(ex => ex.recurringType === 'YEARLY' && ex.month === (new Date(date).getUTCMonth() + 1) && ex.day === new Date(date).getUTCDate());
      if (holiday) {
        dayInfo.isOpen = false;
        dayInfo.reason = `Holiday - ${holiday.name}`;
      }

      // 4. Overlay schedule_exceptions
      const exception = getExceptionForDate(date, scheduleExceptions);
      if (exception) {
        dayInfo.isOpen = exception.type !== 'CLOSURE';
        if (exception.customOpenTime) dayInfo.openTime = exception.customOpenTime;
        if (exception.customCloseTime) dayInfo.closeTime = exception.customCloseTime;
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
