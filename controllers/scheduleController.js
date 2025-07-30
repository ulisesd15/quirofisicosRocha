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

  // Get scheduled closures (using schedule_exceptions table)
  getScheduledClosures: (req, res) => {
    const query = `
      SELECT id, exception_type, start_date, end_date, is_closed, 
             reason as title, description, recurring_type, is_active,
             created_at, updated_at
      FROM schedule_exceptions 
      WHERE is_closed = 1 AND is_active = 1
      ORDER BY start_date ASC
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching scheduled closures:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ closures: results });
    });
  },

  // Add scheduled closure (using schedule_exceptions table)
  addScheduledClosure: (req, res) => {
    const { title, description, start_date, end_date, is_recurring } = req.body;
    
    if (!title || !start_date || !end_date) {
      return res.status(400).json({ error: 'Title, start_date, and end_date are required' });
    }

    const recurring_type = is_recurring ? 'yearly' : 'none';
    
    const query = `
      INSERT INTO schedule_exceptions 
      (exception_type, start_date, end_date, is_closed, reason, description, recurring_type, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(query, ['closure', start_date, end_date, 1, title, description, recurring_type, 1], (err, result) => {
      if (err) {
        console.error('Error adding scheduled closure:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Scheduled closure added successfully', id: result.insertId });
    });
  },

  // Delete scheduled closure (using schedule_exceptions table)
  deleteScheduledClosure: (req, res) => {
    const { id } = req.params;
    
    // Soft delete by setting is_active to 0
    db.query('UPDATE schedule_exceptions SET is_active = 0 WHERE id = ? AND is_closed = 1', [id], (err, result) => {
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
  },

  // Save scheduled business hours changes
  saveScheduledBusinessHours: (req, res) => {
    const { effective_date, schedule_data } = req.body;
    
    if (!effective_date || !schedule_data) {
      return res.status(400).json({ 
        success: false, 
        message: 'Fecha efectiva y datos de horario son requeridos' 
      });
    }

    // Validate effective date is not in the past
    const effectiveDate = new Date(effective_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    effectiveDate.setHours(0, 0, 0, 0);

    if (effectiveDate < today) {
      return res.status(400).json({ 
        success: false, 
        message: 'No se puede programar para fechas pasadas' 
      });
    }

    // Start transaction
    db.beginTransaction((err) => {
      if (err) {
        console.error('Error starting transaction:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error interno del servidor' 
        });
      }

      // First, deactivate any existing scheduled changes for the same date
      const deactivateQuery = `
        UPDATE scheduled_business_hours 
        SET is_active = FALSE 
        WHERE effective_date = ? AND is_active = TRUE
      `;

      db.query(deactivateQuery, [effective_date], (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error('Error deactivating existing schedules:', err);
            res.status(500).json({ 
              success: false, 
              message: 'Error al desactivar horarios existentes' 
            });
          });
        }

        // Insert new scheduled business hours
        const insertPromises = schedule_data.map(dayData => {
          return new Promise((resolve, reject) => {
            const insertQuery = `
              INSERT INTO scheduled_business_hours 
              (day_of_week, is_open, open_time, close_time, break_start, break_end, effective_date, is_active, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
            `;

            const values = [
              dayData.day_of_week,
              dayData.is_open,
              dayData.is_open ? dayData.open_time : null,
              dayData.is_open ? dayData.close_time : null,
              dayData.is_open ? dayData.break_start : null,
              dayData.is_open ? dayData.break_end : null,
              effective_date
            ];

            db.query(insertQuery, values, (err, result) => {
              if (err) {
                reject(err);
              } else {
                resolve(result);
              }
            });
          });
        });

        // Execute all inserts
        Promise.all(insertPromises)
          .then(results => {
            // If effective date is today, apply changes immediately
            if (effectiveDate.getTime() === today.getTime()) {
              const updatePromises = schedule_data.map(dayData => {
                return new Promise((resolve, reject) => {
                  const updateQuery = `
                    UPDATE business_hours 
                    SET is_open = ?, open_time = ?, close_time = ?, break_start = ?, break_end = ?, updated_at = NOW()
                    WHERE day_of_week = ?
                  `;

                  const values = [
                    dayData.is_open,
                    dayData.is_open ? dayData.open_time : null,
                    dayData.is_open ? dayData.close_time : null,
                    dayData.is_open ? dayData.break_start : null,
                    dayData.is_open ? dayData.break_end : null,
                    dayData.day_of_week
                  ];

                  db.query(updateQuery, values, (err, result) => {
                    if (err) {
                      reject(err);
                    } else {
                      resolve(result);
                    }
                  });
                });
              });

              Promise.all(updatePromises)
                .then(() => {
                  db.commit((err) => {
                    if (err) {
                      return db.rollback(() => {
                        console.error('Error committing transaction:', err);
                        res.status(500).json({ 
                          success: false, 
                          message: 'Error al confirmar cambios' 
                        });
                      });
                    }

                    res.json({ 
                      success: true, 
                      message: 'Horarios guardados y aplicados inmediatamente',
                      applied_immediately: true
                    });
                  });
                })
                .catch(err => {
                  db.rollback(() => {
                    console.error('Error updating current business hours:', err);
                    res.status(500).json({ 
                      success: false, 
                      message: 'Error al aplicar cambios inmediatos' 
                    });
                  });
                });
            } else {
              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    console.error('Error committing transaction:', err);
                    res.status(500).json({ 
                      success: false, 
                      message: 'Error al confirmar cambios' 
                    });
                  });
                }

                const diffDays = Math.ceil((effectiveDate - today) / (1000 * 60 * 60 * 24));
                res.json({ 
                  success: true, 
                  message: `Horarios programados para aplicarse en ${diffDays} día(s)`,
                  effective_date: effective_date,
                  days_until_effective: diffDays
                });
              });
            }
          })
          .catch(err => {
            db.rollback(() => {
              console.error('Error inserting scheduled business hours:', err);
              res.status(500).json({ 
                success: false, 
                message: 'Error al guardar horarios programados' 
              });
            });
          });
      });
    });
  },

  // Apply scheduled business hours that are due (for cron job)
  applyScheduledBusinessHours: () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Get all active scheduled changes for today
    const getScheduledQuery = `
      SELECT * FROM scheduled_business_hours 
      WHERE effective_date = ? AND is_active = TRUE
      ORDER BY day_of_week
    `;

    db.query(getScheduledQuery, [today], (err, scheduledHours) => {
      if (err) {
        console.error('Error getting scheduled business hours:', err);
        return;
      }

      if (scheduledHours.length === 0) {
        console.log('No scheduled business hours to apply for today');
        return;
      }

      console.log(`Applying ${scheduledHours.length} scheduled business hour changes for ${today}`);

      // Start transaction
      db.beginTransaction((err) => {
        if (err) {
          console.error('Error starting transaction for scheduled hours:', err);
          return;
        }

        // Update business hours with scheduled changes
        const updatePromises = scheduledHours.map(scheduled => {
          return new Promise((resolve, reject) => {
            const updateQuery = `
              UPDATE business_hours 
              SET is_open = ?, open_time = ?, close_time = ?, break_start = ?, break_end = ?, updated_at = NOW()
              WHERE day_of_week = ?
            `;

            const values = [
              scheduled.is_open,
              scheduled.open_time,
              scheduled.close_time,
              scheduled.break_start,
              scheduled.break_end,
              scheduled.day_of_week
            ];

            db.query(updateQuery, values, (err, result) => {
              if (err) {
                reject(err);
              } else {
                resolve(result);
              }
            });
          });
        });

        Promise.all(updatePromises)
          .then(() => {
            // Mark scheduled changes as applied
            const markAppliedQuery = `
              UPDATE scheduled_business_hours 
              SET is_active = FALSE, applied_at = NOW()
              WHERE effective_date = ? AND is_active = TRUE
            `;

            db.query(markAppliedQuery, [today], (err, result) => {
              if (err) {
                return db.rollback(() => {
                  console.error('Error marking scheduled hours as applied:', err);
                });
              }

              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    console.error('Error committing scheduled hours transaction:', err);
                  });
                }

                console.log(`Successfully applied scheduled business hours for ${today}`);
              });
            });
          })
          .catch(err => {
            db.rollback(() => {
              console.error('Error applying scheduled business hours:', err);
            });
          });
      });
    });
  },

  // Holiday Templates Management
  getHolidayTemplates: (req, res) => {
    const query = `
      SELECT id, name, description, month, day, is_recurring, is_active, 
             holiday_type, closure_type, 
             TIME_FORMAT(custom_open_time, '%H:%i') as custom_open_time,
             TIME_FORMAT(custom_close_time, '%H:%i') as custom_close_time,
             created_at, updated_at
      FROM holiday_templates 
      ORDER BY month, day, name
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error getting holiday templates:', err);
        return res.status(500).json({ error: 'Error getting holiday templates' });
      }
      
      res.json({ holiday_templates: results });
    });
  },

  createHolidayTemplate: (req, res) => {
    const { 
      name, 
      description, 
      month, 
      day, 
      is_recurring, 
      holiday_type, 
      closure_type,
      custom_open_time,
      custom_close_time
    } = req.body;

    if (!name || !month || !day) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nombre, mes y día son requeridos' 
      });
    }

    // Validate month and day
    if (month < 1 || month > 12) {
      return res.status(400).json({ 
        success: false, 
        message: 'El mes debe estar entre 1 y 12' 
      });
    }

    if (day < 1 || day > 31) {
      return res.status(400).json({ 
        success: false, 
        message: 'El día debe estar entre 1 y 31' 
      });
    }

    const query = `
      INSERT INTO holiday_templates 
      (name, description, month, day, is_recurring, holiday_type, closure_type, custom_open_time, custom_close_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      name,
      description || null,
      month,
      day,
      is_recurring || 1,
      holiday_type || 'custom',
      closure_type || 'full_day',
      custom_open_time || null,
      custom_close_time || null
    ];

    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Error creating holiday template:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al crear plantilla de feriado' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Plantilla de feriado creada exitosamente',
        id: result.insertId
      });
    });
  },

  updateHolidayTemplate: (req, res) => {
    const { id } = req.params;
    const { 
      name, 
      description, 
      month, 
      day, 
      is_recurring, 
      is_active,
      holiday_type, 
      closure_type,
      custom_open_time,
      custom_close_time
    } = req.body;

    if (!name || !month || !day) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nombre, mes y día son requeridos' 
      });
    }

    const query = `
      UPDATE holiday_templates 
      SET name = ?, description = ?, month = ?, day = ?, is_recurring = ?, 
          is_active = ?, holiday_type = ?, closure_type = ?, 
          custom_open_time = ?, custom_close_time = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const values = [
      name,
      description || null,
      month,
      day,
      is_recurring || 1,
      is_active !== undefined ? is_active : 1,
      holiday_type || 'custom',
      closure_type || 'full_day',
      custom_open_time || null,
      custom_close_time || null,
      id
    ];

    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Error updating holiday template:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al actualizar plantilla de feriado' 
        });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Plantilla de feriado no encontrada' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Plantilla de feriado actualizada exitosamente'
      });
    });
  },

  deleteHolidayTemplate: (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM holiday_templates WHERE id = ?';

    db.query(query, [id], (err, result) => {
      if (err) {
        console.error('Error deleting holiday template:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al eliminar plantilla de feriado' 
        });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Plantilla de feriado no encontrada' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Plantilla de feriado eliminada exitosamente'
      });
    });
  },

  // Generate holiday exceptions for a specific year
  generateYearlyHolidays: (req, res) => {
    const { year } = req.params;
    
    if (!year || year < 2020 || year > 2030) {
      return res.status(400).json({ 
        success: false, 
        message: 'Año inválido. Debe estar entre 2020 y 2030' 
      });
    }

    // Get active holiday templates
    const getTemplatesQuery = 'SELECT * FROM holiday_templates WHERE is_active = 1';

    db.query(getTemplatesQuery, (err, templates) => {
      if (err) {
        console.error('Error getting holiday templates:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al obtener plantillas de feriados' 
        });
      }

      if (templates.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No hay plantillas de feriados activas' 
        });
      }

      db.beginTransaction((err) => {
        if (err) {
          console.error('Error starting transaction:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
          });
        }

        const insertPromises = templates.map(template => {
          return new Promise((resolve, reject) => {
            const holidayDate = `${year}-${template.month.toString().padStart(2, '0')}-${template.day.toString().padStart(2, '0')}`;
            
            // Check if holiday already exists for this year
            const checkQuery = `
              SELECT id FROM schedule_exceptions 
              WHERE start_date = ? AND reason LIKE ?
            `;

            db.query(checkQuery, [holidayDate, `%${template.name}%`], (err, existing) => {
              if (err) {
                reject(err);
                return;
              }

              if (existing.length > 0) {
                resolve({ skipped: template.name });
                return;
              }

              // Insert new holiday exception
              const insertQuery = `
                INSERT INTO schedule_exceptions 
                (exception_type, start_date, end_date, is_closed, custom_open_time, custom_close_time, 
                 reason, description, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `;

              const isClosed = template.closure_type === 'full_day' ? 1 : 0;
              const values = [
                'single_day',
                holidayDate,
                holidayDate,
                isClosed,
                template.closure_type === 'custom_hours' ? template.custom_open_time : null,
                template.closure_type === 'custom_hours' ? template.custom_close_time : null,
                `${template.name} ${year}`,
                template.description,
                1
              ];

              db.query(insertQuery, values, (err, result) => {
                if (err) {
                  reject(err);
                } else {
                  resolve({ created: template.name, id: result.insertId });
                }
              });
            });
          });
        });

        Promise.all(insertPromises)
          .then(results => {
            db.commit((err) => {
              if (err) {
                return db.rollback(() => {
                  console.error('Error committing transaction:', err);
                  res.status(500).json({ 
                    success: false, 
                    message: 'Error al confirmar la generación de feriados' 
                  });
                });
              }

              const created = results.filter(r => r.created).length;
              const skipped = results.filter(r => r.skipped).length;

              res.json({ 
                success: true, 
                message: `Feriados generados para ${year}: ${created} creados, ${skipped} omitidos (ya existían)`,
                year: year,
                created: created,
                skipped: skipped,
                details: results
              });
            });
          })
          .catch(err => {
            db.rollback(() => {
              console.error('Error generating yearly holidays:', err);
              res.status(500).json({ 
                success: false, 
                message: 'Error al generar feriados anuales' 
              });
            });
          });
      });
    });
  },

  // Annual Closures Management
  getAnnualClosures: (req, res) => {
    const query = `
      SELECT id, start_date as date, reason, description, 
             'full_day' as closure_type,
             1 as is_recurring,
             created_at, updated_at
      FROM schedule_exceptions 
      WHERE exception_type = 'annual_closure'
      ORDER BY MONTH(start_date), DAY(start_date), reason
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error getting annual closures:', err);
        return res.status(500).json({ error: 'Error getting annual closures' });
      }
      
      res.json({ annual_closures: results });
    });
  },

  createAnnualClosure: (req, res) => {
    const { 
      date, 
      reason, 
      description, 
      is_recurring
    } = req.body;

    if (!date || !reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Fecha y motivo son requeridos' 
      });
    }

    const query = `
      INSERT INTO schedule_exceptions 
      (exception_type, start_date, end_date, is_closed, reason, description, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      'annual_closure',
      date,
      date,
      1, // Always closed full day
      reason,
      description || '',
      1
    ];

    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Error creating annual closure:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al crear día cerrado anual' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Día cerrado anual creado exitosamente',
        id: result.insertId 
      });
    });
  },

  updateAnnualClosure: (req, res) => {
    const { id } = req.params;
    const { 
      date, 
      reason, 
      description
    } = req.body;

    if (!date || !reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Fecha y motivo son requeridos' 
      });
    }

    const query = `
      UPDATE schedule_exceptions 
      SET start_date = ?, end_date = ?, is_closed = ?, reason = ?, description = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND exception_type = 'annual_closure'
    `;

    const values = [
      date,
      date,
      1, // Always closed full day
      reason,
      description || '',
      id
    ];

    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Error updating annual closure:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al actualizar día cerrado anual' 
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Día cerrado anual no encontrado' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Día cerrado anual actualizado exitosamente' 
      });
    });
  },

  deleteAnnualClosure: (req, res) => {
    const { id } = req.params;
    
    const query = `
      DELETE FROM schedule_exceptions 
      WHERE id = ? AND exception_type = 'annual_closure'
    `;

    db.query(query, [id], (err, result) => {
      if (err) {
        console.error('Error deleting annual closure:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al eliminar día cerrado anual' 
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Día cerrado anual no encontrado' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Día cerrado anual eliminado exitosamente' 
      });
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
