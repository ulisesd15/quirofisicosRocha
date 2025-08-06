-- ===========================
-- SEED DATA FOR CLEAN SCHEMA
-- ===========================

USE appointments_db;

-- Clear tables in the correct order due to foreign key constraints
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE scheduled_business_hours;
TRUNCATE TABLE schedule_exceptions;
TRUNCATE TABLE business_hours;
TRUNCATE TABLE clinic_settings;
TRUNCATE TABLE appointments;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- ===========================
-- ESSENTIAL SEED DATA
-- ===========================

-- Admin user (password is 'Password123!' hashed with bcrypt, 10 rounds)
INSERT INTO users (full_name, phone, email, password, auth_provider, role, created_at)
VALUES 
('Dr. Rocha Admin', '664-771-0000', 'admin@quirofisicosrocha.com', '$2b$10$kYkpiM/aLk1DpF/xOn8Ww.O7Q7I16EaE6UrmI1BtNQIHhsblT0Dky', 'local', 'admin', NOW());

-- Default clinic settings
INSERT INTO clinic_settings (setting_key, setting_value, description)
VALUES
('clinic_name', 'Quirofísicos Rocha', 'Name of the clinic'),
('clinic_phone', '664-123-4567', 'Main clinic phone number'),
('clinic_email', 'info@quirofisicosrocha.com', 'Main clinic email'),
('appointment_duration', '30', 'Default appointment duration in minutes'),
('max_daily_appointments', '20', 'Maximum appointments per day'),
('advance_booking_days', '30', 'How many days in advance can appointments be booked'),
('cancellation_hours', '24', 'Minimum hours before appointment to allow cancellation');

-- Default business hours (Monday to Friday 9 AM - 6 PM, with lunch break)
INSERT INTO business_hours (day_of_week, is_open, open_time, close_time, break_start, break_end)
VALUES
('Monday', TRUE, '09:00:00', '18:00:00', '13:00:00', '14:00:00'),
('Tuesday', TRUE, '09:00:00', '18:00:00', '13:00:00', '14:00:00'),
('Wednesday', TRUE, '09:00:00', '18:00:00', '13:00:00', '14:00:00'),
('Thursday', TRUE, '09:00:00', '18:00:00', '13:00:00', '14:00:00'),
('Friday', TRUE, '09:00:00', '18:00:00', '13:00:00', '14:00:00'),
('Saturday', FALSE, NULL, NULL, NULL, NULL),
('Sunday', FALSE, NULL, NULL, NULL, NULL);

-- Essential schedule exceptions (major holidays)
INSERT INTO schedule_exceptions (exception_type, start_date, end_date, is_closed, reason, description, is_active)
VALUES
('single_day', '2025-12-25', '2025-12-25', TRUE, 'Navidad', 'Clínica cerrada por festividad navideña', TRUE),
('single_day', '2025-01-01', '2025-01-01', TRUE, 'Año Nuevo', 'Clínica cerrada por Año Nuevo', TRUE);
