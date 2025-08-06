DROP DATABASE IF EXISTS appointments_db;
CREATE DATABASE appointments_db;
USE appointments_db;

-- Drop tables in correct order (considering foreign key constraints)
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS schedule_exceptions;
DROP TABLE IF EXISTS business_hours;
DROP TABLE IF EXISTS clinic_settings;
DROP TABLE IF EXISTS users;

-- ===========================
-- CORE TABLES (ESSENTIAL)
-- ===========================

-- Registered Users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password VARCHAR(255),
  auth_provider VARCHAR(50) DEFAULT 'local',
  google_id VARCHAR(255),
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Appointments (core booking functionality)
CREATE TABLE appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  date DATE NOT NULL,
  time TIME NOT NULL,
  note TEXT,
  status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  user_id INT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Business Hours (weekly schedule configuration)
CREATE TABLE business_hours (
  id INT AUTO_INCREMENT PRIMARY KEY,
  day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
  is_open BOOLEAN DEFAULT TRUE,
  open_time TIME,
  close_time TIME,
  break_start TIME,
  break_end TIME,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Schedule Exceptions (holidays, closures, special dates)
CREATE TABLE schedule_exceptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exception_type ENUM('single_day', 'date_range', 'recurring') NOT NULL DEFAULT 'single_day',
  start_date DATE NOT NULL,
  end_date DATE,
  is_closed BOOLEAN DEFAULT FALSE,
  custom_open_time TIME,
  custom_close_time TIME,
  custom_break_start TIME,
  custom_break_end TIME,  
  reason VARCHAR(255),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Clinic Settings (admin configuration)
CREATE TABLE clinic_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ===========================
-- ADVANCED SCHEDULING TABLES
-- ===========================

-- Scheduled Business Hours (for future business hours changes)
CREATE TABLE scheduled_business_hours (
  id INT AUTO_INCREMENT PRIMARY KEY,
  day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
  is_open BOOLEAN DEFAULT TRUE,
  open_time TIME,
  close_time TIME,
  break_start TIME,
  break_end TIME,
  effective_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);