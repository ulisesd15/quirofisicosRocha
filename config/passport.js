const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const db = require('../config/connections');
const secretKey = process.env.SECRET_KEY;

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, (accessToken, refreshToken, profile, done) => {

  const email = profile.emails[0].value;
  const full_name = profile.displayName;
  const google_id = profile.id;

  // First check by google_id, then by email
  db.query('SELECT * FROM users WHERE google_id = ? OR email = ?', [google_id, email], (err, results) => {
    if (err) return done(err);

    if (results.length > 0) {
      const user = results[0];
      
      // If user exists but doesn't have google_id, update it
      if (!user.google_id) {
        db.query('UPDATE users SET google_id = ?, auth_provider = ? WHERE id = ?', 
          [google_id, 'google', user.id], (updateErr) => {
            if (updateErr) return done(updateErr);
          });
      }
      
      const token = jwt.sign({ id: user.id, email: user.email }, secretKey, { expiresIn: '2h' });
      return done(null, { token });
    }

    // New Google user -> insert into users table
    const insertSql = `
      INSERT INTO users (full_name, email, phone, password, auth_provider, google_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(insertSql, [full_name, email, null, null, 'google', google_id], (err, result) => {
      if (err) return done(err);

      const token = jwt.sign({ id: result.insertId, email }, secretKey, { expiresIn: '2h' });
      return done(null, { token });
    });
  });
}));
