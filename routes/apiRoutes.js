const express = require('express');
const db = require('../config/connections'); // Adjust the path as necessary
const router = express.Router();


//get all appointments
router.get('/appointments', (req, res) => {
  db.query('SELECT * FROM appointments', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
}); 

// Create new appointment
router.post('/appointments', (req, res) => {
  let { full_name, email, phone, date, time, note, user_id } = req.body;

  // Normalize empty user_id to null
  user_id = user_id ? user_id : null;

  // Validate required fields
  if (!full_name || !date || !time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const appointmentData = { full_name, email, phone, date, time, note, user_id };

  db.query('INSERT INTO appointments SET ?', appointmentData, (err, result) => {
    if (err) {
      console.error('Error inserting appointment:', err);
      return res.status(500).json({ error: 'Database error', details: err });
    }
    res.json({ message: 'Appointment created', id: result.insertId });
  });
});

// Update appointment
router.put('/appointments/:id', (req, res) => {
  const { full_name, email, phone, date, time, note } = req.body;
  db.query('UPDATE appointments SET full_name = ?, email = ?, phone = ?, date = ?, time = ?, note = ? WHERE id = ?', 
    [full_name, email, phone, date, time, note, req.params.id], 
    (err) => {
      if (err) return res.status(500).json(err);
      res.sendStatus(204);
    }
  );
});

// Get appointments by date
router.get('/appointments/date/:date', (req, res) => {
  const date = req.params.date;
  db.query('SELECT * FROM appointments WHERE date = ?', [date], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Get appointments by user ID
router.get('/appointments/user/:userId', (req, res) => {
  const userId = req.params.userId;
  db.query('SELECT * FROM appointments WHERE user_id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Get appointments by user ID and date
router.get('/appointments/user/:userId/date/:date', (req, res) => {
  const userId = req.params.userId;
  const date = req.params.date;
  db.query('SELECT * FROM appointments WHERE user_id = ? AND date = ?', [userId, date], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Get appointments by date and time
router.get('/appointments/date/:date/time/:time', (req, res) => {
  const date = req.params.date;
  const time = req.params.time;
  db.query('SELECT * FROM appointments WHERE date = ? AND time = ?', [date, time], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Delete appointment
router.delete('/appointments/:id', (req, res) => {
  db.query('DELETE FROM appointments WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.sendStatus(204);
  });
});

//get single
router.get("/appointments/:id", (req, res) => {
  const appointmentId = req.params.id;
  db.query("SELECT * FROM appointments WHERE id = ?", [appointmentId], (err, results) => {
    if (err) {
      console.error("Error al obtener la cita:", err);
      return res.status(500).json({ message: "Error al obtener la cita" });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }
    res.status(200).json(results[0]);
  });
});


//USER ROUTES

// Register user
router.post("/register", async (req, res) => {
  const { full_name, username, email, phone } = req.body;

  if (!full_name || !username || !email || !phone) {
    return res.status(400).json({ message: "Faltan campos requeridos" });
  }

  const insertUserSql = `
    INSERT INTO users (full_name, username, email, phone)
    VALUES (?, ?, ?, ?)
  `;

  db.query(insertUserSql, [full_name, username, email, phone], (err, results) => {
    if (err) {
      console.error("Error al registrar usuario:", err);
      return res.status(500).json({ message: "Error al registrar usuario" });
    }


    // If you already have an appointment_id to associate, you can add it here:
    // const appointment_id = some logic...
    // const linkSql = `INSERT INTO registered_users (appointment_id, user_id) VALUES (?, ?)`

    return res.status(200).json({ message: "Registro exitoso", userId: result.insertId });
  });
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
  const { email, phone } = req.body;

  if (!email || !phone) {
    return res.status(400).json({ message: 'Correo y teléfono requeridos' });
  }

  db.query(
    'SELECT * FROM users WHERE email = ? AND phone = ?',
    [email, phone],
    (err, results) => {
      if (err) {
        console.error('Error en login:', err);
        return res.status(500).json({ message: 'Error del servidor' });
      }

      if (results.length === 0) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }
      const user = results[0];
      res.json({ message: 'Inicio de sesión exitoso', user_id: user.id });
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
    [full_name, email, phone, userId],
    (err, results) => {
      if (err) {
        console.error("Error al actualizar el usuario:", err);
        return res.status(500).json(err);
      }
      res.status(200).json({ message: 'User updated successfully' });
    }
  );
});

module.exports = router;
