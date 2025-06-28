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

    const userId = results.insertId;

    // If you already have an appointment_id to associate, you can add it here:
    // const appointment_id = some logic...
    // const linkSql = `INSERT INTO registered_users (appointment_id, user_id) VALUES (?, ?)`

    res.status(200).json({ message: "Registro exitoso", userId });
  });
});

module.exports = router;
