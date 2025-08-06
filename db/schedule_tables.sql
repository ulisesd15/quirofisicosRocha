-- Additional tables for enhanced schedule management
-- These should be added to the existing schema

-- Holiday Templates for annual recurring holidays
CREATE TABLE IF NOT EXISTS holiday_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  date_type ENUM('fixed', 'calculated') NOT NULL DEFAULT 'fixed',
  month_number INT, -- For fixed dates (1-12)
  day_number INT,   -- For fixed dates (1-31)
  calculation_rule TEXT, -- For calculated holidays (e.g., "first_monday_of_september")
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Annual Closures generated from templates
CREATE TABLE IF NOT EXISTS annual_closures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT,
  name VARCHAR(255) NOT NULL,
  closure_date DATE NOT NULL,
  year INT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES holiday_templates(id) ON DELETE SET NULL
);

-- Scheduled Closures (temporary closures)
CREATE TABLE IF NOT EXISTS scheduled_closures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Schedule Overrides (custom hours for specific dates)
CREATE TABLE IF NOT EXISTS schedule_overrides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  override_date DATE NOT NULL,
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

-- Blocked Time Slots (for specific times that should not be available)
CREATE TABLE IF NOT EXISTS blocked_time_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  block_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason VARCHAR(255),
  description TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_type ENUM('weekly', 'monthly') DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Scheduled Business Hours Changes (for future business hours updates)
CREATE TABLE IF NOT EXISTS scheduled_business_hours (
  id INT AUTO_INCREMENT PRIMARY KEY,
  effective_date DATE NOT NULL,
  day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
  is_open BOOLEAN DEFAULT TRUE,
  open_time TIME,
  close_time TIME,
  break_start TIME,
  break_end TIME,
  is_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Week Exceptions (for recurring weekly patterns)
CREATE TABLE IF NOT EXISTS week_exceptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exception_name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
  is_closed BOOLEAN DEFAULT FALSE,
  custom_open_time TIME,
  custom_close_time TIME,
  custom_break_start TIME,
  custom_break_end TIME,
  reason VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default holiday templates for common holidays
INSERT IGNORE INTO holiday_templates (name, description, date_type, month_number, day_number, is_active) VALUES
('Año Nuevo', 'Día de Año Nuevo', 'fixed', 1, 1, TRUE),
('Día del Trabajo', 'Día Internacional del Trabajador', 'fixed', 5, 1, TRUE),
('Día de la Independencia', 'Día de la Independencia del Uruguay', 'fixed', 8, 25, TRUE),
('Navidad', 'Día de Navidad', 'fixed', 12, 25, TRUE);
