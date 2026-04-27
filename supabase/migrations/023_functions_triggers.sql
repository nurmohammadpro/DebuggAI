-- 019_functions_triggers.sql
-- Database functions & triggers
-- Execution Order: 19th

-- Auto-create profile + wallet on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.credit_wallets (user_id, balance)
  VALUES (NEW.id, 30)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.credit_transactions
    (wallet_id, amount, type, description)
  SELECT id, 30, 'credit_added', 'Welcome bonus — 30 free credits'
  FROM public.credit_wallets
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic credit deduction (race-condition safe)
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id     UUID,
  p_amount      INTEGER,
  p_action_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance INTEGER;
BEGIN
  UPDATE public.credit_wallets
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user_id AND balance >= p_amount
  RETURNING id, balance INTO v_wallet_id, v_new_balance;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits');
  END IF;

  INSERT INTO public.credit_transactions
    (wallet_id, amount, type, description, metadata)
  VALUES
    (v_wallet_id, -p_amount, 'credit_spent',
     COALESCE(p_description, p_action_type),
     jsonb_build_object('action_type', p_action_type));

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'wallet_id', v_wallet_id);
END;
$$;

-- Add credits
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id     UUID,
  p_amount      INTEGER,
  p_type        transaction_type,
  p_description TEXT DEFAULT NULL,
  p_metadata    JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance INTEGER;
BEGIN
  UPDATE public.credit_wallets
  SET balance = balance + p_amount, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING id, balance INTO v_wallet_id, v_new_balance;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'wallet_not_found');
  END IF;

  INSERT INTO public.credit_transactions
    (wallet_id, amount, type, description, metadata)
  VALUES
    (v_wallet_id, p_amount, p_type,
     COALESCE(p_description, p_type::text), p_metadata);

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

-- Safe admin check
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = p_user_id), false);
$$;

-- Claim referral
CREATE OR REPLACE FUNCTION public.claim_referral(
  p_referee_id    UUID,
  p_referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  SELECT id INTO v_referrer_id
  FROM public.profiles
  WHERE referral_code = p_referral_code AND id != p_referee_id;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.referrals
    WHERE referrer_id = v_referrer_id AND referee_id = p_referee_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
  END IF;

  INSERT INTO public.referrals
    (referrer_id, referee_id, referral_code, status, credits_awarded)
  VALUES
    (v_referrer_id, p_referee_id, p_referral_code, 'completed', 10);

  PERFORM public.add_credits(v_referrer_id, 10, 'referral_bonus',
    'Referral bonus — new user signed up', '{}');
  PERFORM public.add_credits(p_referee_id, 10, 'referral_bonus',
    'Referral bonus — signed up with referral code', '{}');

  RETURN jsonb_build_object('success', true, 'referrer_id', v_referrer_id);
END;
$$;

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON public.credit_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON public.debug_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_wb_sessions_updated_at
  BEFORE UPDATE ON public.web_builder_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_templates_updated_at
  BEFORE UPDATE ON public.web_builder_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
