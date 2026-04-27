-- Check if current user is admin
-- Run this in your Supabase SQL Editor

SELECT
  id,
  email,
  full_name,
  is_admin,
  plan_type,
  created_at
FROM profiles
WHERE email = 'nurprodev@gmail.com';

-- If is_admin is false, run this to make yourself admin:
UPDATE profiles
SET is_admin = true
WHERE email = 'nurprodev@gmail.com';

-- Verify the update
SELECT
  id,
  email,
  is_admin
FROM profiles
WHERE email = 'nurprodev@gmail.com';
