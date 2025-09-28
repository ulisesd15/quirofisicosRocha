DROP DATABASE IF EXISTS appointments_db;
CREATE DATABASE appointments_db;
USE appointments_db;

-- Drop tables in correct order (considering foreign key constraints)

DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS schedule_exceptions;
DROP TABLE IF EXISTS business_hours;
DROP TABLE IF EXISTS clinic_settings;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS scheduled_closures;
DROP TABLE IF EXISTS holiday_templates;
DROP TABLE IF EXISTS announcements;


-- ===========================
-- CORE TABLES (ESSENTIAL)
-- ===========================

-- Holiday Templates for annual recurring holidays

-- Scheduled Closures (temporary closures)

-- Registered Users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password VARCHAR(255),
  auth_provider VARCHAR(50) DEFAULT 'local',
  google_id VARCHAR(255),
  is_verified TINYINT(1) DEFAULT 0,
  requires_verification TINYINT(1) DEFAULT 1,
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
-- Clinic Settings (admin configuration)
CREATE TABLE clinic_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- SCHEDULING TABLES
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
-- Current Business Hours
CREATE TABLE business_hours (
  id INT AUTO_INCREMENT PRIMARY KEY,
  day_of_week ENUM('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NOT NULL,
  is_open BOOLEAN DEFAULT TRUE,
  open_time TIME,
  close_time TIME,
  break_start TIME,
  break_end TIME,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- Schedule Exceptions (holidays, closures, special dates)
CREATE TABLE schedule_exceptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
    exception_type ENUM('single_day', 'date_range', 'recurring', 'special_schedule') NOT NULL DEFAULT 'single_day',
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
  yearly_recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE holiday_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  date_type ENUM('fixed', 'calculated') NOT NULL DEFAULT 'fixed',
  month_number INT, -- For fixed dates (1-12)
  day_number INT,   -- For fixed dates (1-31)
  calculation_rule TEXT, -- For calculated holidays (e.g., \"first_monday_of_september\")
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  announcement_type VARCHAR(50) DEFAULT 'info',
  priority VARCHAR(50) DEFAULT 'normal',
  start_date DATE NOT NULL,
  end_date DATE,
  show_on_homepage TINYINT(1) DEFAULT 1,
  show_on_booking TINYINT(1) DEFAULT 0,
  created_by INT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
