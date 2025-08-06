-- Clear tables in the correct order due to foreign key constraints
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE announcements;
TRUNCATE TABLE schedule_exceptions;
TRUNCATE TABLE business_hours;
TRUNCATE TABLE clinic_settings;
TRUNCATE TABLE appointments;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- Seed sample users (passwords are plain text 'Password123!' hashed with bcrypt, 10 rounds)

INSERT INTO users (full_name, phone, email, password, auth_provider, role, created_at)
VALUES 
-- Admin user
('Dr. Rocha Admin', '6647710000', 'admin@quirofisicosrocha.com', '$2b$10$kYkpiM/aLk1DpF/xOn8Ww.O7Q7I16EaE6UrmI1BtNQIHhsblT0Dky', 'local', 'admin', NOW()),
-- -- Regular users
-- ('Roberto Gomez', '6647710001', 'roberto@gmail.com', '$2b$10$kYkpiM/aLk1DpF/xOn8Ww.O7Q7I16EaE6UrmI1BtNQIHhsblT0Dky', 'local', 'user', NOW()),
-- ('Maria Lopez', '6647710002', 'maria@gmail.com', '$2b$10$kYkpiM/aLk1DpF/xOn8Ww.O7Q7I16EaE6UrmI1BtNQIHhsblT0Dky', 'local', 'user', NOW()),
-- ('Juan Perez', '6647710003', 'juan@gmail.com', '$2b$10$kYkpiM/aLk1DpF/xOn8Ww.O7Q7I16EaE6UrmI1BtNQIHhsblT0Dky', 'local', 'user', NOW()),
-- ('Google User Example', NULL, 'googleuser@gmail.com', NULL, 'google', 'user', NOW());

-- NOTE: You must look up actual IDs from the `users` table if using AUTO_INCREMENT
-- For now, assuming users are inserted in order and IDs are 1–15

-- Seed appointments (some for guests, some for registered users)
-- INSERT INTO appointments (full_name, email, phone, date, time, note, status, created_at, user_id)
-- VALUES
--   ('Ana Torres', 'anaT@example.com', '555-1111', '2025-07-25', '12:00:00', 'Consulta general', 'pending', NOW(), NULL), -- Guest
--   ('Luis Fernández', 'luis@example.com', '555-2222', '2025-07-25', '12:30:00', 'Dolor de espalda', 'confirmed', NOW(), NULL), -- Guest
--   ('Carla Méndez', 'carla@example.com', '555-3333', '2025-07-26', '13:00:00', 'Seguimiento', 'pending', NOW(), NULL), -- Guest
--   ('José Ruiz', 'jose@example.com', '555-4444', '2025-07-27', '14:00:00', 'Primera cita', 'confirmed', NOW(), NULL), -- Guest
--   ('María López', 'maria@example.com', '555-5555', '2025-07-28', '15:00:00', 'Revisión mensual', 'completed', NOW(), NULL), -- Guest
--   ('Roberto Gomez', 'roberto@gmail.com', '6647710001', '2025-07-29', '16:00:00', 'Consulta de seguimiento', 'confirmed', NOW(), 2),
--   ('Maria Lopez', 'maria@gmail.com', '6647710002', '2025-07-30', '18:00:00', 'Consulta inicial', 'pending', NOW(), 3);

-- -- Insert default clinic settings
INSERT INTO clinic_settings (setting_key, setting_value, description)
VALUES
('clinic_name', 'Quirofísicos Rocha', 'Name of the clinic'),
('clinic_phone', '664-123-4567', 'Main clinic phone number'),
('clinic_email', 'info@quirofisicosrocha.com', 'Main clinic email'),
('appointment_duration', '30', 'Default appointment duration in minutes'),
('max_daily_appointments', '20', 'Maximum appointments per day'),
('advance_booking_days', '30', 'How many days in advance can appointments be booked'),
('cancellation_hours', '24', 'Minimum hours before appointment to allow cancellation');

-- Insert business hours (Monday to Friday 9 AM - 6 PM, with lunch break)
INSERT INTO business_hours (day_of_week, is_open, open_time, close_time, break_start, break_end)
VALUES
('Monday', TRUE, '09:00:00', '18:00:00', '13:00:00', '14:00:00'),
('Tuesday', TRUE, '09:00:00', '18:00:00', '13:00:00', '14:00:00'),
('Wednesday', TRUE, '09:00:00', '18:00:00', '13:00:00', '14:00:00'),
('Thursday', TRUE, '09:00:00', '18:00:00', '13:00:00', '14:00:00'),
('Friday', TRUE, '09:00:00', '18:00:00', '13:00:00', '14:00:00'),
('Saturday', FALSE, NULL, NULL, NULL, NULL),
('Sunday', FALSE, NULL, NULL, NULL, NULL);

-- Sample schedule exceptions
INSERT INTO schedule_exceptions (exception_type, start_date, end_date, is_closed, reason, description, is_active)
VALUES
('single_day', '2025-12-25', '2025-12-25', TRUE, 'Navidad', 'Clínica cerrada por festividad navideña', TRUE),
('single_day', '2025-01-01', '2025-01-01', TRUE, 'Año Nuevo', 'Clínica cerrada por Año Nuevo', TRUE),
('date_range', '2025-08-15', '2025-08-19', TRUE, 'Vacaciones de verano', 'Clínica cerrada por vacaciones del personal', TRUE);

-- Sample announcements  
INSERT INTO announcements (title, message, announcement_type, priority, start_date, end_date, is_active, show_on_homepage, created_by)
VALUES
('Horarios especiales de verano', 'Durante julio y agosto nuestros horarios serán de 8:00 AM a 3:00 PM para brindar mejor atención en horarios matutinos.', 'info', 'normal', '2025-07-01', '2025-08-31', TRUE, TRUE, 1),
('Nuevo sistema de citas en línea', '¡Ya puedes agendar tus citas a través de nuestra página web! Más fácil y rápido.', 'success', 'high', '2025-07-25', NULL, TRUE, TRUE, 1);
