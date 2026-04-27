-- Step 2: Make yourself an admin (run this if is_admin is false)
UPDATE profiles
SET is_admin = true
WHERE email = 'nurprodev@gmail.com';
