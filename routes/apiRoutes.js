const express = require('express');
const db = require('../config/connections'); // Adjust the path as necessary
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/auth'); // Adjust the path as necessary
const scheduleController = require('../controllers/scheduleController');
const appointmentController = require('../controllers/appointmentController');
const secretKey = process.env.SECRET_KEY;

// Get Google Maps API key for frontend
router.get('/config/maps-key', (req, res) => {
  res.json({ 
    apiKey: process.env.GOOGLE_MAPS_API_KEY || null 
  });
});

// Get current business hours for public display
router.get('/business-hours', (req, res) => {
  const query = `
    SELECT day_of_week, is_open, 
           TIME_FORMAT(open_time, '%h:%i %p') as open_time,
           TIME_FORMAT(close_time, '%h:%i %p') as close_time,
           TIME_FORMAT(break_start, '%h:%i %p') as break_start,
           TIME_FORMAT(break_end, '%h:%i %p') as break_end
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


//USER ROUTES

// Register user
router.post("/register", async (req, res) => {
  const { full_name, phone, email, password } = req.body;

  if (!full_name || !phone || !email || !password) {
    return res.status(400).json({ message: "Faltan campos requeridos" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const insertUserSql = `
      INSERT INTO users (full_name, email, phone, password) VALUES (?, ?, ?, ?)
    `;

    db.query(insertUserSql, [full_name, email, phone, hashedPassword], (err, results) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'El correo ya está registrado' });
        }
        console.error("Error al registrar el usuario:", err);
        return res.status(500).json({ message: "Error al registrar el usuario" });
      }

      const token = jwt.sign({ id: results.insertId, email }, secretKey, { expiresIn: '2h' });
    // localStorage.setItem('token', token); ❌ Remove this!

    res.status(201).json({
      // message: "Usuario registrado exitosamente",
      userId: results.insertId,
      token  // ✅ send the token in the response
    });
  });


  } catch (err) {
    console.error("Error hashing password:", err);
    res.status(500).json({ message: "Error interno del servidor" });
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

// Get user email, phone and name info by ID
router.get('/user/:id', (req, res) => {
  const userId = req.params.id;

  db.query('SELECT id, full_name, email, phone FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(results[0]);
  });
});



//Get registered user by ID
router.get('/registered_users/:id', (req, res) => {
  const userId = req.params.id;
  db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      console.error("Error al obtener el usuario:", err);
      return res.status(500).json(err);
    }
    if (results.length === 0){
       return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(results[0]);
  });
});

// Update user
router.put('/registered_users/:id', (req, res) => {
  const userId = req.params.id;
  const { full_name, email, phone } = req.body;

  db.query(
    'UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?',
    [full_name, email, email, phone, userId],
    (err, results) => {
      if (err) {
        console.error("Error al actualizar el usuario:", err);
        return res.status(500).json(err);
      }
      res.status(200).json({ message: 'User updated successfully' });
    }
  );
});

// Get business hours for appointment booking
router.get('/business-hours', (req, res) => {
  db.query('SELECT * FROM business_hours ORDER BY FIELD(day_of_week, "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")', (err, results) => {
    if (err) {
      console.error('Error fetching business hours:', err);
      // Return default business hours if database query fails
      return res.json({
        businessHours: [
          { day_of_week: 'monday', is_open: true, open_time: '09:00', close_time: '18:00' },
          { day_of_week: 'tuesday', is_open: true, open_time: '09:00', close_time: '18:00' },
          { day_of_week: 'wednesday', is_open: true, open_time: '09:00', close_time: '18:00' },
          { day_of_week: 'thursday', is_open: true, open_time: '09:00', close_time: '18:00' },
          { day_of_week: 'friday', is_open: true, open_time: '09:00', close_time: '18:00' },
          { day_of_week: 'saturday', is_open: false, open_time: '09:00', close_time: '18:00' },
          { day_of_week: 'sunday', is_open: false, open_time: '09:00', close_time: '18:00' }
        ]
      });
    }
    
    // If no business hours are set, return defaults
    if (results.length === 0) {
      return res.json({
        businessHours: [
          { day_of_week: 'monday', is_open: true, open_time: '09:00', close_time: '18:00' },
          { day_of_week: 'tuesday', is_open: true, open_time: '09:00', close_time: '18:00' },
          { day_of_week: 'wednesday', is_open: true, open_time: '09:00', close_time: '18:00' },
          { day_of_week: 'thursday', is_open: true, open_time: '09:00', close_time: '18:00' },
          { day_of_week: 'friday', is_open: true, open_time: '09:00', close_time: '18:00' },
          { day_of_week: 'saturday', is_open: false, open_time: '09:00', close_time: '18:00' },
          { day_of_week: 'sunday', is_open: false, open_time: '09:00', close_time: '18:00' }
        ]
      });
    }
    
    res.json({ businessHours: results });
  });
});

// Get available slots for appointment booking (public endpoint with admin restrictions)
router.get('/available-slots/:date', scheduleController.getAvailableSlots);

// Get schedule exceptions for calendar display (public endpoint)
router.get('/schedule-exceptions', (req, res) => {
  const query = `
    SELECT id, exception_type, start_date, end_date, is_closed, 
           custom_open_time, custom_close_time, custom_break_start, custom_break_end,
           reason, description, recurring_type
    FROM schedule_exceptions 
    WHERE is_active = TRUE
    ORDER BY start_date ASC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching schedule exceptions:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Get public announcements for display on homepage
router.get('/announcements/public', (req, res) => {
  const query = `
    SELECT id, title, message, announcement_type, priority, start_date, end_date
    FROM announcements 
    WHERE is_active = TRUE 
      AND show_on_homepage = TRUE
      AND start_date <= CURDATE()
      AND (end_date IS NULL OR end_date >= CURDATE())
    ORDER BY priority DESC, created_at DESC
    LIMIT 5
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching public announcements:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

module.exports = router;
