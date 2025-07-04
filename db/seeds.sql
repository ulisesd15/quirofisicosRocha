-- Clear tables in the correct order due to foreign key constraints
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE appointments;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- Seed sample users
INSERT INTO users (full_name, username, email, phone, created_at)
VALUES
  ('Ulises Duran', 'ulisesd', 'ulises@example.com', '6197221234', NOW()),
  ('Ana Torres', 'anatorres', 'anaT@example.com', '6197225678', NOW()),
  ('Maria Lopez', 'mlop', 'marial@gmail.com', '18005551234', NOW()),
  ('Ana Garcia', 'anag', 'ana@example.com', '6197225678', NOW()),
  ('David Lee', 'davidl', 'david@example.com', '900120022', NOW()),
  ('Miguel Ramos', 'miguelRamon', 'miguel@example.com', '6197222947', NOW()),
  ('Andrea Lopez', 'andreaLo', 'andrea@example.com', '6197221111', NOW()),
  ('Luis Herrera', 'luisHe', 'luis@example.com', '6197222222', NOW()),
  ('Sofia Martinez', 'sofiaMar', 'sofia@example.com', '6197223333', NOW()),
  ('Valeria Torres', 'valeriaT', 'valeria@example.com', '6197225555', NOW()),
  ('Jorge Navarro', 'jorgeN', 'jorge@example.com', '6197226666', NOW()),
  ('Camila Alvarez', 'camilaAl', 'camila@example.com', '6197227777', NOW()),
  ('Fernando Cruz', 'fernandoC', 'fernando@example.com', '6197228888', NOW()),
  ('Lucia Flores', 'luciaF', 'lucia@example.com', '6197229999', NOW()),
  ('Diego Moreno', 'diegoM', 'diego@example.com', '6197230000', NOW());

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
