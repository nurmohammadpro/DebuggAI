-- Create SECURITY DEFINER admin-check function used by the server admin guard.
-- Allows admin status checks without exposing profiles table details to callers.

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT is_admin
    FROM public.profiles
    WHERE id = p_user_id
  ), false);
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

