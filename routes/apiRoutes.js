const express = require('express');
const db = require('../config/connections'); // Adjust the path as necessary
const router = express.Router();

// Get all appointments
router.get('/appointments', (req, res) => {
  db.query('SELECT * FROM appointments', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Create new appointment
router.post('/appointments', (req, res) => {
  const { name, email, phone, date, time, note } = req.body;
  db.query('INSERT INTO appointments SET ?', { name, email, phone, date, time, note }, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ id: result.insertId });
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

// Get all registered users
router.get('/registered_users', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
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

module.exports = router;
