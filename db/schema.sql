DROP DATABASE IF EXISTS appointments_db;
CREATE DATABASE appointments_db;
USE appointments_db;

-- Registered Users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  -- Passwords should be hashed in application code
  phone VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id INT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  
);

-- this table is for user roles, e.g., admin, user, etc.

-- CREATE TABLE user_roles (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   user_id INT NOT NULL,
--   role VARCHAR(50) NOT NULL,
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
-- );