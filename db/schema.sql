DROP DATABASE IF EXISTS appointments_db;
CREATE DATABASE appointments_db;
USE appointments_db;

DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS users;


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

-- Appointments (only optional link to registered users)
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

-- Clinic Settings for admin management
CREATE TABLE clinic_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Business Hours
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

-- Schedule Exceptions (for specific dates or date ranges)
CREATE TABLE schedule_exceptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exception_type ENUM('single_day', 'date_range', 'recurring', 'annual_closure') NOT NULL DEFAULT 'single_day',
  start_date DATE NOT NULL,
  end_date DATE,
  is_closed BOOLEAN DEFAULT FALSE,
  custom_open_time TIME,
  custom_close_time TIME,
  custom_break_start TIME,
  custom_break_end TIME,
  reason VARCHAR(255),
  description TEXT,
  recurring_type ENUM('weekly', 'monthly', 'yearly'),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Public Announcements/Banners
CREATE TABLE announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  announcement_type ENUM('info', 'warning', 'success', 'danger') DEFAULT 'info',
  priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  show_on_homepage BOOLEAN DEFAULT TRUE,
  show_on_booking BOOLEAN DEFAULT FALSE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Remove old commented role table