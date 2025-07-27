-- Enhanced Schedule Management Schema
-- Run this to add advanced scheduling capabilities

-- Table for scheduled closures (holidays, vacations, etc.)
CREATE TABLE scheduled_closures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME NULL, -- NULL means all day
  end_time TIME NULL,   -- NULL means all day
  closure_type ENUM('holiday', 'vacation', 'maintenance', 'emergency', 'other') DEFAULT 'other',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern VARCHAR(50), -- 'yearly', 'monthly', 'weekly'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for temporary schedule overrides
CREATE TABLE schedule_overrides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
  is_open BOOLEAN DEFAULT TRUE,
  open_time TIME,
  close_time TIME,
  break_start TIME,
  break_end TIME,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_date (date)
);

-- Table for blocked time slots
CREATE TABLE blocked_time_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason VARCHAR(255),
  block_type ENUM('appointment', 'break', 'maintenance', 'personal', 'other') DEFAULT 'other',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date_time (date, start_time, end_time)
);

-- Insert some sample data
INSERT INTO scheduled_closures (title, description, start_date, end_date, closure_type, is_recurring, recurrence_pattern) VALUES
('Año Nuevo', 'Feriado Nacional', '2025-01-01', '2025-01-01', 'holiday', TRUE, 'yearly'),
('Navidad', 'Feriado Nacional', '2025-12-25', '2025-12-25', 'holiday', TRUE, 'yearly'),
('Día de la Independencia', 'Feriado Nacional', '2025-09-16', '2025-09-16', 'holiday', TRUE, 'yearly');

INSERT INTO blocked_time_slots (date, start_time, end_time, reason, block_type) VALUES
('2025-07-25', '12:00:00', '13:00:00', 'Almuerzo extendido', 'break'),
('2025-07-26', '15:00:00', '16:00:00', 'Mantenimiento de equipo', 'maintenance');
