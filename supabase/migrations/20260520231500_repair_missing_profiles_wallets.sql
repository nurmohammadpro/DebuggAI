-- ============================================================================
-- Repair migration: backfill missing profiles and credit_wallets for existing
-- auth.users left orphaned by earlier DROP TABLE ... CASCADE migrations.
-- ============================================================================

-- Insert missing profiles for auth users who signed up before profiles was recreated
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Insert missing credit_wallets for profiles that have no wallet
INSERT INTO public.credit_wallets (user_id, balance)
SELECT p.id, 30
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.credit_wallets WHERE user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;

-- Notifications are handled by handle_new_user() trigger for new signups;
-- existing users get profiles + wallets only.
