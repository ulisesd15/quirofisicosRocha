-- Clear tables in the correct order due to foreign key constraints
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE appointments;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- Seed sample users (passwords are plain text 'Password123!' hashed with bcrypt, 10 rounds)

INSERT INTO users (full_name, phone, email, password, created_at)
VALUES 
('Roberto Gomez', '6647710001', 'roberto@gmail.com', '$2b$10$kYkpiM/aLk1DpF/xOn8Ww.O7Q7I16EaE6UrmI1BtNQIHhsblT0Dky', NOW()),
('Maria Lopez', '6647710002', 'maria@gmail.com', '$2b$10$kYkpiM/aLk1DpF/xOn8Ww.O7Q7I16EaE6UrmI1BtNQIHhsblT0Dky', NOW()),
('Juan Perez', '6647710003', 'juan@gmail.com', '$2b$10$kYkpiM/aLk1DpF/xOn8Ww.O7Q7I16EaE6UrmI1BtNQIHhsblT0Dky', NOW());

-- NOTE: You must look up actual IDs from the `users` table if using AUTO_INCREMENT
-- For now, assuming users are inserted in order and IDs are 1–15

-- Seed appointments (some for guests, some for registered users)
INSERT INTO appointments (full_name, email, phone, date, time, note, created_at, user_id)
VALUES
  ('Ana Torres', 'anaT@example.com', '555-1111', '2025-07-01', '12:00:00', 'Consulta general', NOW(), NULL), -- Guest
  ('Luis Fernández', 'luis@example.com', '555-2222', '2025-07-01', '12:30:00', 'Dolor de espalda', NOW(), NULL), -- Guest
  ('Carla Méndez', 'carla@example.com', '555-3333', '2025-07-02', '13:00:00', 'Seguimiento', NOW(), NULL), -- Guest
  ('José Ruiz', 'jose@example.com', '555-4444', '2025-07-03', '14:00:00', 'Primera cita', NOW(), NULL), -- Guest
  ('María López', 'maria@example.com', '555-5555', '2025-07-04', '15:00:00', 'Revisión mensual', NOW(), NULL), -- Guest
  ('Ulises Duran', 'ulises@example.com', '6197221234', '2025-07-05', '16:00:00', 'Consulta de seguimiento', NOW(), 1),
  ('Ana Garcia', 'ana@example.com', '6197225678', '2025-07-07', '18:00:00', 'Consulta inicial', NOW(), 4),
  ('David Lee', 'david@example.com', '900120022', '2025-07-08', '13:30:00', 'Seguimiento de terapia física', NOW(), 5),
  ('Miguel Ramos', 'miguel@example.com', '6197222947', '2025-07-09', '14:30:00', 'Consulta de dolor crónico', NOW(), 6);
