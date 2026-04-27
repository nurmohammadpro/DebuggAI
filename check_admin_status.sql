-- Step 1: Check your current admin status
SELECT
  email,
  is_admin,
  plan_type,
  created_at
FROM profiles
WHERE email = 'nurprodev@gmail.com';
