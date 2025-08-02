-- Cleanup Script: Remove all users except Dr. Rocha admin and all appointments
-- Run this script to clean up the database while preserving the admin user

USE appointments_db;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Remove all appointments
DELETE FROM appointments;

-- Reset appointment auto_increment counter
ALTER TABLE appointments AUTO_INCREMENT = 1;

-- Remove all users except the admin user (keeping the first admin user)
-- Assuming Dr. Rocha admin is the first user with role 'admin'
DELETE FROM users WHERE role != 'admin' OR id > (
    SELECT min_id FROM (
        SELECT MIN(id) as min_id FROM users WHERE role = 'admin'
    ) as temp
);

-- Reset users auto_increment counter (optional, but keeps things clean)
-- Note: This will only work if there are no foreign key references
-- ALTER TABLE users AUTO_INCREMENT = 2;

-- Remove any announcements created by deleted users
DELETE FROM announcements WHERE created_by NOT IN (SELECT id FROM users);

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify results
SELECT 'Users remaining:' as Info, COUNT(*) as Count FROM users;
SELECT 'Appointments remaining:' as Info, COUNT(*) as Count FROM appointments;
SELECT 'Admin users:' as Info, COUNT(*) as Count FROM users WHERE role = 'admin';

-- Show remaining users
SELECT id, full_name, email, role, created_at FROM users;
