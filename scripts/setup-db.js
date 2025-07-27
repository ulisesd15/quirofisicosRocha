#!/usr/bin/env node

/**
 * Database Setup Script for Production
 * This script ensures all required tables and columns exist
 * Works with both local MySQL and Heroku JawsDB
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Parse JawsDB URL for Heroku
function parseDbUrl(url) {
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (match) {
    return {
      host: match[3],
      user: match[1],
      password: match[2],
      database: match[5],
      port: match[4],
      ssl: { rejectUnauthorized: false }
    };
  }
  return null;
}

let dbConfig;

if (process.env.NODE_ENV === 'production' && process.env.JAWSDB_URL) {
  // Production with JawsDB on Heroku
  dbConfig = parseDbUrl(process.env.JAWSDB_URL);
} else {
  // Development environment
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'appointments_db'
  };
}

const setupDatabase = async () => {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ Connected to database successfully');
    
    // Check if tables exist and create/update them
    console.log('🔧 Setting up database schema...');
    
    // Create users table if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        phone VARCHAR(20),
        password VARCHAR(255),
        auth_provider VARCHAR(50) DEFAULT 'local',
        google_id VARCHAR(255),
        role ENUM('user','admin') DEFAULT 'user',
        is_verified BOOLEAN DEFAULT FALSE,
        requires_verification BOOLEAN DEFAULT TRUE,
        verification_token VARCHAR(255),
        phone_verified BOOLEAN DEFAULT FALSE,
        verified_by INT,
        verified_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (verified_by) REFERENCES users(id)
      )
    `);
    
    // Create appointments table if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20),
        date DATE NOT NULL,
        time TIME NOT NULL,
        note TEXT,
        status ENUM('pending','confirmed','completed','cancelled') DEFAULT 'pending',
        user_id INT,
        requires_approval BOOLEAN DEFAULT TRUE,
        approved_by INT,
        approved_at TIMESTAMP NULL,
        approval_sms_sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      )
    `);
    
    // Create business_hours table if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS business_hours (
        id INT AUTO_INCREMENT PRIMARY KEY,
        day_of_week INT NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create schedule_exceptions table if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS schedule_exceptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        start_date DATE NOT NULL,
        end_date DATE,
        start_time TIME,
        end_time TIME,
        reason VARCHAR(255),
        is_recurring BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create announcements table if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        announcement_type ENUM('info', 'warning', 'success', 'danger') DEFAULT 'info',
        priority INT DEFAULT 1,
        start_date DATE NOT NULL,
        end_date DATE,
        is_active BOOLEAN DEFAULT TRUE,
        show_on_homepage BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create clinic_settings table if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS clinic_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(255) NOT NULL UNIQUE,
        setting_value TEXT,
        setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Insert default business hours if not exist
    const [businessHoursRows] = await connection.execute('SELECT COUNT(*) as count FROM business_hours');
    if (businessHoursRows[0].count === 0) {
      console.log('📅 Setting up default business hours...');
      const defaultHours = [
        [1, '09:00:00', '18:00:00'], // Monday
        [2, '09:00:00', '18:00:00'], // Tuesday
        [3, '09:00:00', '18:00:00'], // Wednesday
        [4, '09:00:00', '18:00:00'], // Thursday
        [5, '09:00:00', '18:00:00'], // Friday
        [6, '09:00:00', '14:00:00'], // Saturday
      ];
      
      for (const [day, start, end] of defaultHours) {
        await connection.execute(
          'INSERT INTO business_hours (day_of_week, start_time, end_time) VALUES (?, ?, ?)',
          [day, start, end]
        );
      }
    }
    
    // Check if admin user exists
    const [adminRows] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
    if (adminRows[0].count === 0) {
      console.log('👤 Creating default admin user...');
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await connection.execute(`
        INSERT INTO users (full_name, email, password, role, is_verified, requires_verification)
        VALUES (?, ?, ?, 'admin', TRUE, FALSE)
      `, ['Dr. Rocha Admin', 'admin@quirofisicosrocha.com', hashedPassword]);
    }
    
    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('📋 Setup Summary:');
    console.log('  ✅ All tables created/verified');
    console.log('  ✅ Default business hours configured');
    console.log('  ✅ Admin user available');
    console.log('');
    console.log('🔐 Admin Login:');
    console.log('  Email: admin@quirofisicosrocha.com');
    console.log('  Password: admin123');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
