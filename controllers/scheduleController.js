const db = require('../config/connections');

const scheduleController = {
  // Get all business hours
  getBusinessHours: (req, res) => {
    const query = `
      SELECT id, day_of_week, is_open, 
             TIME_FORMAT(open_time, '%H:%i') as open_time,
             TIME_FORMAT(close_time, '%H:%i') as close_time,
             TIME_FORMAT(break_start, '%H:%i') as break_start,
             TIME_FORMAT(break_end, '%H:%i') as break_end,
             updated_at
      FROM business_hours 
      ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error getting business hours:', err);
        return res.status(500).json({ error: 'Error getting business hours' });
      }
      res.json({ business_hours: results });
    });
  },

  // Update business hours for a specific day
  updateBusinessHours: (req, res) => {
    const { day_of_week } = req.params;
    const { is_open, open_time, close_time, break_start, break_end } = req.body;

    // Validate day_of_week
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(day_of_week)) {
      return res.status(400).json({ error: 'Invalid day of week' });
    }

    // If closed, set times to null
    const timeValues = is_open ? [open_time, close_time, break_start, break_end] : [null, null, null, null];

    const query = `
      UPDATE business_hours 
      SET is_open = ?, open_time = ?, close_time = ?, break_start = ?, break_end = ?
      WHERE day_of_week = ?
    `;

    db.query(query, [is_open, ...timeValues, day_of_week], (err, result) => {
      if (err) {
        console.error('Error updating business hours:', err);
        return res.status(500).json({ error: 'Error updating business hours' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Day not found' });
      }

      res.json({ 
        message: `Business hours updated for ${day_of_week}`,
        updated: { day_of_week, is_open, open_time, close_time, break_start, break_end }
      });
    });
  },

  // Get available time slots for a specific date
  getAvailableSlots: (req, res) => {
    const { date } = req.params;
    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });

    // First get business hours for that day
    const businessHoursQuery = `
      SELECT is_open, 
             TIME_FORMAT(open_time, '%H:%i') as open_time,
             TIME_FORMAT(close_time, '%H:%i') as close_time,
             TIME_FORMAT(break_start, '%H:%i') as break_start,
             TIME_FORMAT(break_end, '%H:%i') as break_end
      FROM business_hours 
      WHERE day_of_week = ?
    `;

    db.query(businessHoursQuery, [dayOfWeek], (err, businessResults) => {
      if (err) {
        console.error('Error getting business hours:', err);
        return res.status(500).json({ error: 'Error getting business hours' });
      }

      if (businessResults.length === 0 || !businessResults[0].is_open) {
        return res.json({ available_slots: [], message: 'Clinic is closed on this day' });
      }

      const businessHours = businessResults[0];

      // Get existing appointments for that date
      const appointmentsQuery = `
        SELECT TIME_FORMAT(time, '%H:%i') as time 
        FROM appointments 
        WHERE date = ? AND status IN ('pending', 'confirmed')
      `;

      db.query(appointmentsQuery, [date], (err, appointmentResults) => {
        if (err) {
          console.error('Error getting appointments:', err);
          return res.status(500).json({ error: 'Error getting appointments' });
        }

        // Generate available time slots
        const slots = generateTimeSlots(businessHours, appointmentResults.map(a => a.time));
        res.json({ available_slots: slots, business_hours: businessHours });
      });
    });
  },

  // Get clinic statistics
  getClinicStats: (req, res) => {
    const queries = {
      total_appointments: 'SELECT COUNT(*) as count FROM appointments',
      pending_appointments: "SELECT COUNT(*) as count FROM appointments WHERE status = 'pending'",
      confirmed_appointments: "SELECT COUNT(*) as count FROM appointments WHERE status = 'confirmed'",
      total_users: 'SELECT COUNT(*) as count FROM users WHERE role = "user"',
      appointments_this_week: `
        SELECT COUNT(*) as count FROM appointments 
        WHERE date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
        AND date < DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)
      `,
      open_days: 'SELECT COUNT(*) as count FROM business_hours WHERE is_open = 1'
    };

    const stats = {};
    const queryKeys = Object.keys(queries);
    let completed = 0;

    queryKeys.forEach(key => {
      db.query(queries[key], (err, result) => {
        if (err) {
          console.error(`Error getting ${key}:`, err);
          stats[key] = 0;
        } else {
          stats[key] = result[0].count;
        }
        
        completed++;
        if (completed === queryKeys.length) {
          res.json({ stats });
        }
      });
    });
  }
};

// Helper function to generate time slots
function generateTimeSlots(businessHours, bookedTimes) {
  const slots = [];
  const { open_time, close_time, break_start, break_end } = businessHours;
  
  if (!open_time || !close_time) return slots;

  const startHour = parseInt(open_time.split(':')[0]);
  const startMinute = parseInt(open_time.split(':')[1]);
  const endHour = parseInt(close_time.split(':')[0]);
  const endMinute = parseInt(close_time.split(':')[1]);
  
  let currentHour = startHour;
  let currentMinute = startMinute;

  while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
    const timeSlot = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    // Check if it's during break time
    const isBreakTime = break_start && break_end && 
      timeSlot >= break_start && timeSlot < break_end;
    
    // Check if already booked
    const isBooked = bookedTimes.includes(timeSlot);
    
    if (!isBreakTime && !isBooked) {
      slots.push(timeSlot);
    }

    // Increment by 30 minutes
    currentMinute += 30;
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour++;
    }
  }

  return slots;
}

module.exports = scheduleController;
