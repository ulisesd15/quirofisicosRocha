-- Additional tables for schedule management extensions

-- Table for managing standard business days
CREATE TABLE IF NOT EXISTS business_days_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
  is_open BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_day (day_of_week)
);

-- Table for week-specific exceptions to business days
CREATE TABLE IF NOT EXISTS week_exceptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  week_start_date DATE NOT NULL,
  description VARCHAR(255),
  days_open JSON, -- Array of days that are open this week
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_week (week_start_date)
);

-- Table for user approval system
CREATE TABLE IF NOT EXISTS user_approval_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  approval_system_enabled BOOLEAN DEFAULT FALSE,
  require_approval_guests BOOLEAN DEFAULT TRUE,
  require_approval_first_time BOOLEAN DEFAULT TRUE,
  approval_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for pending user approvals
CREATE TABLE IF NOT EXISTS pending_user_approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_type ENUM('registered', 'guest') DEFAULT 'registered',
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  reviewed_by INT NULL,
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Table for website announcements and banners
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type ENUM('info', 'warning', 'success', 'urgent') DEFAULT 'info',
  priority ENUM('low', 'normal', 'high') DEFAULT 'normal',
  is_active BOOLEAN DEFAULT TRUE,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default business days configuration (Monday to Friday open by default)
INSERT IGNORE INTO business_days_config (day_of_week, is_open) VALUES
('Monday', TRUE),
('Tuesday', TRUE),
('Wednesday', TRUE),
('Thursday', TRUE),
('Friday', TRUE),
('Saturday', FALSE),
('Sunday', FALSE);

-- Insert default user approval settings
INSERT IGNORE INTO user_approval_settings (id, approval_system_enabled, approval_message) VALUES (1, FALSE, 'Su cuenta ha sido aprobada. Ya puede hacer citas en nuestro sistema.');
