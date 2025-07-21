const bcrypt = require('bcrypt');
const db = require('./config/connections');

async function createAdmin() {
  try {
    // Hash the password
    const password = 'Password123!';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Generated hash:', hashedPassword);
    
    // Insert admin user
    const sql = `
      INSERT INTO users (full_name, email, phone, password, auth_provider, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const values = [
      'Dr. Rocha Admin',
      'admin@quirofisicosrocha.com',
      '6647710000',
      hashedPassword,
      'local',
      'admin'
    ];
    
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error creating admin:', err);
      } else {
        console.log('✅ Admin user created successfully!');
        console.log('Email: admin@quirofisicosrocha.com');
        console.log('Password: Password123!');
      }
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdmin();
