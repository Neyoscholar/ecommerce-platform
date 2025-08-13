-- Script to make a user an admin
-- Replace 'testuser@example.com' with the email of the user you want to make admin

UPDATE users 
SET role = 'admin' 
WHERE email = 'testuser@example.com';

-- Verify the change
SELECT id, email, first_name, last_name, role, created_at 
FROM users 
WHERE email = 'testuser@example.com';
