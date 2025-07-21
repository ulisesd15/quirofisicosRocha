const db = require('./config/connections');

// Test database query
db.query('SELECT * FROM users WHERE email = ?', ['admin@quirofisicosrocha.com'], (err, results) => {
  if (err) {
    console.error('Database error:', err);
    return;
  }
  
  console.log('Query results:', results);
  if (results.length > 0) {
    console.log('User found:', results[0]);
  } else {
    console.log('No user found');
  }
  
  process.exit(0);
});
