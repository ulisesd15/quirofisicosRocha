/**
 * Schedule Controller - Business Hours and Appointment Management
 * 
 * Handles:
 * - Business hours configuration and retrieval
 * - Available time slot calculation
 * - Admin statistics and reporting
 * - Timezone-safe date processing
 * - Integration with appointment booking system
 */

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

  // Get available time slots for a specific date (enhanced with admin restrictions)
  getAvailableSlots: (req, res) => {
    const { date } = req.params;
    
    // Parse date properly to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const appointmentDate = new Date(year, month - 1, day); // month is 0-indexed
    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });

    console.log(`🔍 Processing date: ${date}`);
    console.log(`📅 Appointment date object: ${appointmentDate.toString()}`);
    console.log(`📅 Day of week calculated: ${dayOfWeek}`);
    console.log(`Checking availability for ${date} (${dayOfWeek.toLowerCase()})`);

    // Get business hours for that day (simplified version)
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

      console.log(`🏢 Business hours query for ${dayOfWeek}:`, businessResults);

      if (businessResults.length === 0 || !businessResults[0].is_open) {
        console.log(`❌ No business hours found or closed for ${dayOfWeek}`);
        return res.json({ availableSlots: [], message: 'Clinic is closed on this day' });
      }

      let businessHours = businessResults[0];

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
        const bookedTimes = appointmentResults.map(a => a.time);
        const slots = generateTimeSlots(businessHours, bookedTimes);
        
        console.log(`Generated ${slots.length} available slots for ${date}`);
        res.json({ availableSlots: slots, business_hours: businessHours });
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
  },

  // Enhanced Schedule Management Functions

  // Get scheduled closures
  getScheduledClosures: (req, res) => {
    // For now, return empty array since this feature is not implemented
    // In the future, this would query a scheduled_closures table
    res.json({ closures: [] });
  },

  // Add scheduled closure
  addScheduledClosure: (req, res) => {
    const { title, description, start_date, end_date, start_time, end_time, closure_type, is_recurring } = req.body;
    
    if (!title || !start_date || !end_date) {
      return res.status(400).json({ error: 'Title, start_date, and end_date are required' });
    }

    const recurrence_pattern = is_recurring ? 'yearly' : null;
    
    const query = `
      INSERT INTO scheduled_closures 
      (title, description, start_date, end_date, start_time, end_time, closure_type, is_recurring, recurrence_pattern) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(query, [title, description, start_date, end_date, start_time, end_time, closure_type, is_recurring, recurrence_pattern], (err, result) => {
      if (err) {
        console.error('Error adding scheduled closure:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Scheduled closure added successfully', id: result.insertId });
    });
  },

  // Delete scheduled closure
  deleteScheduledClosure: (req, res) => {
    const { id } = req.params;
    
    db.query('DELETE FROM scheduled_closures WHERE id = ?', [id], (err, result) => {
      if (err) {
        console.error('Error deleting scheduled closure:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Scheduled closure not found' });
      }
      
      res.json({ message: 'Scheduled closure deleted successfully' });
    });
  },

  // Get schedule overrides
  getScheduleOverrides: (req, res) => {
    const query = `
      SELECT id, exception_type, start_date, end_date, is_closed, 
             TIME_FORMAT(custom_open_time, '%H:%i') as custom_open_time,
             TIME_FORMAT(custom_close_time, '%H:%i') as custom_close_time,
             TIME_FORMAT(custom_break_start, '%H:%i') as custom_break_start,
             TIME_FORMAT(custom_break_end, '%H:%i') as custom_break_end,
             reason, description, recurring_type, is_active, 
             created_at, updated_at,
             DAYNAME(start_date) as day_of_week 
      FROM schedule_exceptions 
      WHERE is_active = 1
      ORDER BY start_date ASC
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching schedule exceptions:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results);
    });
  },

  // Add schedule override
  addScheduleOverride: (req, res) => {
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
    
    if (!start_date) {
      return res.status(400).json({ error: 'Start date is required' });
    }
    
    const query = `
      INSERT INTO schedule_exceptions 
      (exception_type, start_date, end_date, is_closed, custom_open_time, 
       custom_close_time, custom_break_start, custom_break_end, reason, 
       description, recurring_type, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
    
    const values = [
      exception_type || 'single_day',
      start_date,
      end_date || null,
      is_closed || 0,
      custom_open_time || null,
      custom_close_time || null,
      custom_break_start || null,
      custom_break_end || null,
      reason || null,
      description || null,
      recurring_type || null
    ];
    
    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Error adding schedule exception:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Schedule exception added successfully', id: result.insertId });
    });
  },

  // Delete schedule override
  deleteScheduleOverride: (req, res) => {
    const { id } = req.params;
    
    db.query('UPDATE schedule_exceptions SET is_active = 0 WHERE id = ?', [id], (err, result) => {
      if (err) {
        console.error('Error deleting schedule exception:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Schedule exception not found' });
      }
      
      res.json({ message: 'Schedule override deleted successfully' });
    });
  },

  // Get blocked time slots
  getBlockedTimeSlots: (req, res) => {
    const query = `
      SELECT * FROM blocked_time_slots 
      ORDER BY date ASC, start_time ASC
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching blocked time slots:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Group by date for easier frontend handling
      const groupedResults = results.reduce((acc, slot) => {
        const date = slot.date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(slot);
        return acc;
      }, {});
      
      res.json(results); // Send flat array for now, grouping handled in frontend
    });
  },

  // Add blocked time slot
  addBlockedTimeSlot: (req, res) => {
    const { date, start_time, end_time, reason, block_type } = req.body;
    
    if (!date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Date, start_time, and end_time are required' });
    }
    
    const query = `
      INSERT INTO blocked_time_slots 
      (date, start_time, end_time, reason, block_type) 
      VALUES (?, ?, ?, ?, ?)
    `;
    
    db.query(query, [date, start_time, end_time, reason, block_type || 'other'], (err, result) => {
      if (err) {
        console.error('Error adding blocked time slot:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Blocked time slot added successfully', id: result.insertId });
    });
  },

  // Delete blocked time slot
  deleteBlockedTimeSlot: (req, res) => {
    const { id } = req.params;
    
    db.query('DELETE FROM blocked_time_slots WHERE id = ?', [id], (err, result) => {
      if (err) {
        console.error('Error deleting blocked time slot:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Blocked time slot not found' });
      }
      
      res.json({ message: 'Blocked time slot deleted successfully' });
    });
  },

  // Business Days Management
  getBusinessDaysConfig: (req, res) => {
    db.query('SELECT * FROM business_days_config ORDER BY FIELD(day_of_week, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")', (err, results) => {
      if (err) {
        console.error('Error fetching business days config:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results);
    });
  },

  updateBusinessDaysConfig: (req, res) => {
    const { days } = req.body; // Array of {day_of_week, is_open}
    
    if (!days || !Array.isArray(days)) {
      return res.status(400).json({ error: 'Days array is required' });
    }

    const updatePromises = days.map(day => {
      return new Promise((resolve, reject) => {
        db.query(
          'INSERT INTO business_days_config (day_of_week, is_open) VALUES (?, ?) ON DUPLICATE KEY UPDATE is_open = VALUES(is_open)',
          [day.day_of_week, day.is_open],
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          }
        );
      });
    });

    Promise.all(updatePromises)
      .then(() => res.json({ message: 'Business days configuration updated successfully' }))
      .catch(err => {
        console.error('Error updating business days config:', err);
        res.status(500).json({ error: 'Database error' });
      });
  },

  // Week Exceptions Management
  getWeekExceptions: (req, res) => {
    db.query('SELECT * FROM week_exceptions ORDER BY week_start_date DESC', (err, results) => {
      if (err) {
        console.error('Error fetching week exceptions:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Parse JSON days_open field
      const formattedResults = results.map(exception => ({
        ...exception,
        days_open: JSON.parse(exception.days_open || '[]')
      }));
      
      res.json(formattedResults);
    });
  },

  addWeekException: (req, res) => {
    const { week_start_date, description, days_open } = req.body;
    
    if (!week_start_date || !days_open) {
      return res.status(400).json({ error: 'Week start date and days open are required' });
    }

    db.query(
      'INSERT INTO week_exceptions (week_start_date, description, days_open) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description), days_open = VALUES(days_open)',
      [week_start_date, description, JSON.stringify(days_open)],
      (err, result) => {
        if (err) {
          console.error('Error adding week exception:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Week exception saved successfully', id: result.insertId });
      }
    );
  },

  deleteWeekException: (req, res) => {
    const { id } = req.params;
    
    db.query('DELETE FROM week_exceptions WHERE id = ?', [id], (err, result) => {
      if (err) {
        console.error('Error deleting week exception:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Week exception not found' });
      }
      
      res.json({ message: 'Week exception deleted successfully' });
    });
  },

  // User Approval System
  getApprovalSettings: (req, res) => {
    db.query('SELECT * FROM user_approval_settings ORDER BY id DESC LIMIT 1', (err, results) => {
      if (err) {
        console.error('Error fetching approval settings:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results[0] || {});
    });
  },

  updateApprovalSettings: (req, res) => {
    const { approval_system_enabled, require_approval_guests, require_approval_first_time, approval_message } = req.body;
    
    db.query(
      `INSERT INTO user_approval_settings (id, approval_system_enabled, require_approval_guests, require_approval_first_time, approval_message) 
       VALUES (1, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       approval_system_enabled = VALUES(approval_system_enabled),
       require_approval_guests = VALUES(require_approval_guests), 
       require_approval_first_time = VALUES(require_approval_first_time),
       approval_message = VALUES(approval_message)`,
      [approval_system_enabled, require_approval_guests, require_approval_first_time, approval_message],
      (err, result) => {
        if (err) {
          console.error('Error updating approval settings:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Approval settings updated successfully' });
      }
    );
  },

  getPendingUsers: (req, res) => {
    // For now, return empty array since this feature is not implemented
    // In the future, this would query a pending_user_approvals table
    res.json([]);
  },

  approveUser: (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user.id; // From auth middleware
    
    db.query(
      'UPDATE pending_user_approvals SET status = "approved", reviewed_at = NOW(), reviewed_by = ?, notes = ? WHERE id = ?',
      [adminId, notes, id],
      (err, result) => {
        if (err) {
          console.error('Error approving user:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Pending approval not found' });
        }
        
        // TODO: Send SMS notification here
        res.json({ message: 'User approved successfully' });
      }
    );
  },

  rejectUser: (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user.id;
    
    db.query(
      'UPDATE pending_user_approvals SET status = "rejected", reviewed_at = NOW(), reviewed_by = ?, notes = ? WHERE id = ?',
      [adminId, notes, id],
      (err, result) => {
        if (err) {
          console.error('Error rejecting user:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Pending approval not found' });
        }
        
        res.json({ message: 'User rejected successfully' });
      }
    );
  },

  // Announcements Management
  getAnnouncements: (req, res) => {
    const { active_only } = req.query;
    
    let query = `
      SELECT a.*, u.full_name as created_by_name 
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
    `;
    
    let params = [];
    
    if (active_only === 'true') {
      query += ` WHERE a.is_active = true AND (a.end_date IS NULL OR a.end_date >= CURDATE()) AND a.start_date <= CURDATE()`;
    }
    
    query += ` ORDER BY a.priority DESC, a.created_at DESC`;
    
    db.query(query, params, (err, results) => {
      if (err) {
        console.error('Error fetching announcements:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results);
    });
  },

  addAnnouncement: (req, res) => {
    const { title, content, type, priority, is_active, start_date, end_date } = req.body;
    const created_by = req.user.id;
    
    if (!title || !content || !start_date) {
      return res.status(400).json({ error: 'Title, content, and start date are required' });
    }

    db.query(
      'INSERT INTO announcements (title, content, type, priority, is_active, start_date, end_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, content, type, priority, is_active, start_date, end_date, created_by],
      (err, result) => {
        if (err) {
          console.error('Error adding announcement:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Announcement created successfully', id: result.insertId });
      }
    );
  },

  updateAnnouncement: (req, res) => {
    const { id } = req.params;
    const { title, content, type, priority, is_active, start_date, end_date } = req.body;
    
    db.query(
      'UPDATE announcements SET title = ?, content = ?, type = ?, priority = ?, is_active = ?, start_date = ?, end_date = ? WHERE id = ?',
      [title, content, type, priority, is_active, start_date, end_date, id],
      (err, result) => {
        if (err) {
          console.error('Error updating announcement:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Announcement not found' });
        }
        
        res.json({ message: 'Announcement updated successfully' });
      }
    );
  },

  deleteAnnouncement: (req, res) => {
    const { id } = req.params;
    
    db.query('DELETE FROM announcements WHERE id = ?', [id], (err, result) => {
      if (err) {
        console.error('Error deleting announcement:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Announcement not found' });
      }
      
      res.json({ message: 'Announcement deleted successfully' });
    });
  }
};

// Helper function to generate time slots (original)
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

// Enhanced helper function to generate time slots with admin restrictions
function generateEnhancedTimeSlots(businessHours, bookedTimes, blockedSlots, exceptions) {
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
    
    // Check if blocked by admin
    const isBlocked = blockedSlots.some(block => 
      timeSlot >= block.start_time && timeSlot < block.end_time
    );
    
    // Check if in exception period (admin temporarily closed)
    const isException = exceptions.some(exception => 
      timeSlot >= exception.start_time && timeSlot < exception.end_time
    );
    
    if (!isBreakTime && !isBooked && !isBlocked && !isException) {
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
